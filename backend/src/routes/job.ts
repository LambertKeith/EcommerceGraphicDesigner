import { Router } from 'express';
import { JobModel, VariantModel } from '../models';
import { ApiResponse, JobStatus, Variant } from '../types';

const router = Router();
const jobModel = new JobModel();
const variantModel = new VariantModel();

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await jobModel.findById(id);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    let variants: Variant[] = [];
    if (job.status === 'done' && job.result_variant_ids.length > 0) {
      variants = await variantModel.findByJobId(job.id);
    }

    const jobStatus: JobStatus = {
      id: job.id,
      status: job.status,
      progress: job.status === 'done' ? 100 : job.status === 'running' ? 50 : 0,
      result_variants: variants,
      error_msg: job.error_msg,
      model_used: job.model_used,
      attempts: job.attempts,
      last_error: job.last_error
    };
    
    const response: ApiResponse = {
      success: true,
      data: jobStatus
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/stream/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const lastEventId = req.headers['last-event-id'] as string;
    const userAgent = req.headers['user-agent'] as string;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    console.log('🌐 SSE连接请求接收:', {
      jobId: id,
      clientIP,
      userAgent: userAgent?.substring(0, 100) + '...',
      lastEventId,
      headers: {
        connection: req.headers.connection,
        cacheControl: req.headers['cache-control'],
        accept: req.headers.accept
      },
      timestamp: new Date().toISOString()
    });
    
    // 检查并记录客户端连接头
    const connectionAnalysis = {
      headers: {
        connection: req.headers.connection,
        upgrade: req.headers.upgrade,
        pragma: req.headers.pragma,
        acceptEncoding: req.headers['accept-encoding'],
        cacheControl: req.headers['cache-control']
      },
      potentialIssues: [] as string[]
    };
    
    // 分析潜在的连接问题
    if (req.headers.connection === 'close') {
      connectionAnalysis.potentialIssues.push('client_requests_connection_close');
    }
    if (req.headers.pragma === 'no-cache') {
      connectionAnalysis.potentialIssues.push('client_disables_cache');
    }
    if (req.headers['cache-control']?.includes('no-store')) {
      connectionAnalysis.potentialIssues.push('client_prevents_storage');
    }
    
    console.log('🔍 客户端连接头分析:', {
      jobId: id,
      ...connectionAnalysis,
      riskLevel: connectionAnalysis.potentialIssues.length > 1 ? 'high' : 
                connectionAnalysis.potentialIssues.length > 0 ? 'medium' : 'low'
    });
    
    // 强化SSE响应头设置 - 解决Connection头冲突
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=86400'); // 24小时超时
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Last-Event-ID');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Cache-Control, Connection');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用代理缓冲
    res.setHeader('Transfer-Encoding', 'identity'); // 避免chunked编码问题
    
    console.log('📶 强化SSE响应头设置完成:', {
      jobId: id,
      responseHeaders: {
        'Content-Type': res.getHeader('Content-Type'),
        'Cache-Control': res.getHeader('Cache-Control'),
        'Connection': res.getHeader('Connection'),
        'Keep-Alive': res.getHeader('Keep-Alive'),
        'X-Accel-Buffering': res.getHeader('X-Accel-Buffering')
      }
    });
    
    console.log(`🔌 SSE connection established for job ${id}${lastEventId ? ` (resuming from ${lastEventId})` : ''}`);

    let eventId = 1;
    let isConnectionClosed = false;
    let heartbeatInterval: NodeJS.Timeout;
    let statusCheckInterval: NodeJS.Timeout;
    let connectionCheckInterval: NodeJS.Timeout;

    // Parse last event ID for reconnection
    if (lastEventId) {
      const parsedId = parseInt(lastEventId, 10);
      if (!isNaN(parsedId)) {
        eventId = parsedId + 1;
      }
    }

    const sendEvent = (eventType: string, data: any, id?: number) => {
      if (isConnectionClosed) {
        console.log(`🚫 连接已关闭，跳过事件发送: ${eventType}`);
        return false;
      }
      
      const eventIdToUse = id || eventId++;
      const message = `id: ${eventIdToUse}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      
      console.log(`📤 发送SSE事件: ${eventType}`, {
        jobId: id,
        eventId: eventIdToUse,
        dataSize: JSON.stringify(data).length,
        connectionClosed: isConnectionClosed,
        responseWritable: res.writable,
        responseEnded: res.writableEnded
      });
      
      try {
        res.write(message);
        console.log(`✅ 成功发送SSE事件: ${eventType}`);
        return true;
      } catch (error) {
        console.error(`❌ 发送SSE事件失败 (${eventType}):`, {
          error: (error as Error).message,
          jobId: id,
          eventId: eventIdToUse
        });
        closeConnection();
        return false;
      }
    };

    const sendHeartbeat = () => {
      console.log(`💓 发送心跳信号到 job ${id}`);
      const success = sendEvent('ping', { 
        timestamp: Date.now(), 
        job_id: id, 
        connection_id: eventId 
      });
      if (!success) {
        console.log(`💔 心跳发送失败，关闭连接: ${id}`);
        closeConnection();
      }
    };

    let closeConnection = () => {
      if (isConnectionClosed) return;
      
      console.log(`🔌 关闭SSE连接 job ${id}:`, {
        reason: 'closeConnection called',
        responseWritable: res.writable,
        responseEnded: res.writableEnded,
        timestamp: new Date().toISOString()
      });
      
      isConnectionClosed = true;
      clearInterval(heartbeatInterval);
      clearInterval(statusCheckInterval);
      
      try {
        res.end();
        console.log(`✅ 成功关闭连接: ${id}`);
      } catch (error) {
        console.error(`❌ 关闭SSE连接时出错 job ${id}:`, {
          error: (error as Error).message,
          errorCode: (error as any).code
        });
      }
      
      console.log(`🔒 SSE connection closed for job ${id}`);
    };

    const sendUpdate = async () => {
      if (isConnectionClosed) {
        console.log(`🚫 连接已关闭，跳过状态更新: ${id}`);
        return;
      }
      
      const startTime = Date.now();
      console.log(`🔄 检查任务状态: ${id}`);
      
      try {
        const job = await jobModel.findById(id);
        if (!job) {
          sendEvent('error', { 
            error: 'Job not found',
            code: 'E_JOB_NOT_FOUND'
          });
          closeConnection();
          return;
        }

        const progress = job.status === 'done' ? 100 : 
                        job.status === 'running' ? 50 : 
                        job.status === 'queued' ? 25 : 0;
        
        const updateData = {
          job_id: job.id,
          status: job.status,
          progress,
          error_msg: job.error_msg,
          model_used: job.model_used,
          attempts: job.attempts,
          last_error: job.last_error,
          timestamp: Date.now()
        };

        // Send status update
        sendEvent('progress', updateData);

        // Send completion event if job is done
        if (job.status === 'done') {
          let variants: Variant[] = [];
          if (job.result_variant_ids.length > 0) {
            variants = await variantModel.findByJobId(job.id);
          }
          
          sendEvent('complete', { 
            job_id: job.id,
            result_variants: variants,
            model_used: job.model_used,
            total_variants: variants.length
          });
          
          // Close connection after successful completion
          setTimeout(closeConnection, 1000);
          return;
        }

        // Send error event and close if job failed
        if (job.status === 'error' || job.status === 'failed') {
          sendEvent('error', {
            job_id: job.id,
            error: job.error_msg || 'Job failed',
            code: 'E_PROCESSING_FAILED',
            model_used: job.model_used,
            attempts: job.attempts,
            can_retry: job.attempts < 3
          });
          
          // Close connection after error
          setTimeout(closeConnection, 2000);
          return;
        }

        const elapsed = Date.now() - startTime;
        console.log(`⚡ 任务状态检查完成: ${id}`, {
          elapsed: `${elapsed}ms`,
          jobStatus: job.status,
          hasVariants: job.result_variant_ids?.length > 0
        });

      } catch (error) {
        console.error(`Error sending SSE update for job ${id}:`, error);
        sendEvent('error', { 
          error: 'Internal server error',
          code: 'E_INTERNAL_ERROR'
        });
        closeConnection();
      }
    };

    // Send initial status and connection confirmation
    console.log('🚀 发送初始连接确认和状态检查...');
    
    // 立即发送连接确认事件
    sendEvent('connection-established', {
      jobId: id,
      serverTime: Date.now(),
      message: 'SSE connection ready'
    });
    
    // 立即进行第一次状态检查
    sendUpdate();
    
    // Set up heartbeat (every 5 seconds - reduced from 10)
    heartbeatInterval = setInterval(sendHeartbeat, 5000);
    
    // Set up status checking (every 1.5 seconds - reduced from 2) 
    // 首次检查延迟500ms，避免与初始检查冲突
    setTimeout(() => {
      statusCheckInterval = setInterval(sendUpdate, 1500);
    }, 500);

    // Enhanced client disconnect handling
    req.on('close', () => {
      console.log('📞 客户端主动断开连接:', {
        jobId: id,
        reason: 'client close',
        timestamp: new Date().toISOString()
      });
      closeConnection();
    });

    req.on('error', (error) => {
      console.error(`SSE request error for job ${id}:`, {
        error: (error as Error).message,
        code: (error as any).code,
        timestamp: new Date().toISOString()
      });
      closeConnection();
    });

    // Handle response errors with more specific logging
    res.on('error', (error: any) => {
      console.error('🚫 SSE响应错误:', {
        jobId: id,
        error: error.message,
        code: error.code || 'unknown',
        timestamp: new Date().toISOString(),
        responseState: {
          writable: res.writable,
          writableEnded: res.writableEnded,
          destroyed: res.destroyed
        }
      });
      closeConnection();
    });

    res.on('close', () => {
      console.log('🔌 SSE响应流关闭:', {
        jobId: id,
        timestamp: new Date().toISOString()
      });
      closeConnection();
    });

    // Add connection state monitoring
    connectionCheckInterval = setInterval(() => {
      if (!isConnectionClosed && !res.writableEnded) {
        console.log('🔗 连接健康检查:', {
          jobId: id,
          writable: res.writable,
          ended: res.writableEnded,
          destroyed: res.destroyed
        });
        // Send a lightweight connection test
        const success = sendEvent('connection-test', { status: 'alive' });
        if (!success) {
          console.log(`🚫 连接测试失败: ${id}`);
          clearInterval(connectionCheckInterval);
        }
      } else {
        console.log('🔗 连接状态检查停止:', {
          jobId: id,
          closed: isConnectionClosed,
          ended: res.writableEnded
        });
        clearInterval(connectionCheckInterval);
      }
    }, 15000); // Every 15 seconds

    // Store original close function and enhance it
    const originalClose = () => {
      if (isConnectionClosed) {
        console.log(`⚠️ 重复调用closeConnection，已忽略: ${id}`);
        return;
      }
      
      console.log(`🔌 关闭SSE连接 job ${id}:`, {
        reason: 'closeConnection called',
        responseWritable: res.writable,
        responseEnded: res.writableEnded,
        timestamp: new Date().toISOString()
      });
      
      isConnectionClosed = true;
      
      // 清理所有定时器 - 关键修复
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        console.log(`🧹 已清理心跳定时器: ${id}`);
      }
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        console.log(`🧹 已清理状态检查定时器: ${id}`);
      }
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
        console.log(`🧹 已清理连接监控定时器: ${id}`);
      }
      
      try {
        res.end();
        console.log(`✅ 成功关闭连接: ${id}`);
      } catch (error) {
        console.error(`❌ 关闭SSE连接时出错 job ${id}:`, {
          error: (error as Error).message,
          errorCode: (error as any).code
        });
      }
      
      console.log(`🔒 SSE connection cleanup completed for job ${id}`);
    };
    
    // Replace closeConnection with enhanced version
    closeConnection = originalClose;

    // Set timeout for long-running connections (30 minutes)
    setTimeout(() => {
      if (!isConnectionClosed) {
        console.log(`SSE connection timeout for job ${id}`);
        sendEvent('timeout', { message: 'Connection timeout' });
        closeConnection();
      }
    }, 30 * 60 * 1000);

  } catch (error) {
    console.error(`Failed to establish SSE connection for job ${req.params.id}:`, error);
    next(error);
  }
});

router.get('/:id/variants', async (req, res, next) => {
  try {
    const { id } = req.params;
    const job = await jobModel.findById(id);
    
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    let variants: Variant[] = [];
    if (job.result_variant_ids.length > 0) {
      variants = await variantModel.findByJobId(job.id);
    }
    
    const response: ApiResponse = {
      success: true,
      data: variants
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;