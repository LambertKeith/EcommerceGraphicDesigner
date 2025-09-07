import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/appStore';
import { apiService } from '../services/api';
import { Feature, ScenarioWithFeatures, FeatureExecutionRequest } from '../types';

interface ScenarioImageEditorProps {
  onJobStarted?: (jobId: string) => void;
}

const ScenarioImageEditor: React.FC<ScenarioImageEditorProps> = ({ onJobStarted }) => {
  const {
    currentImage,
    currentSession,
    selectedScenario,
    selectedFeature,
    setCurrentJob,
    setIsProcessing,
    setProcessingProgress,
    setJobStatus,
    setVariants,
  } = useAppStore();

  const [customPrompt, setCustomPrompt] = useState('');
  const [secondImageId, setSecondImageId] = useState<string>('');
  const [maskData, setMaskData] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  // Clear custom prompt when feature changes
  useEffect(() => {
    setCustomPrompt('');
    setSecondImageId('');
    setMaskData('');
    setError(null);
  }, [selectedFeature]);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  // 智能浏览器SSE支持质量检测 - 基于Chrome localhost环境优化
  const detectBrowserSSEQuality = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const connection = (navigator as any).connection;
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '0.0.0.0';
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edge');
    
    let qualityScore = 10; // 默认高质量
    const issues = [];
    
    // Chrome localhost环境特殊处理 - 根据实际测试结果
    if (isChrome && isLocalhost) {
      // Chrome在localhost环境下强制执行连接关闭策略
      // 实测显示连接在300ms内被强制关闭，无法通过应用层修复
      qualityScore = 3;
      issues.push('chrome_localhost_policy');
      issues.push('forced_connection_close');
      console.log('🔍 检测到Chrome+localhost环境，已知SSE连接问题');
    } else if (isChrome) {
      // Chrome在HTTPS/域名环境下SSE支持良好
      qualityScore = 9;
    } else if (userAgent.includes('firefox')) {
      // Firefox SSE支持一般
      qualityScore = 8;
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      // Safari有一些SSE兼容性问题
      qualityScore = 7;
      issues.push('safari_sse_issues');
    } else if (userAgent.includes('edge')) {
      // Edge SSE支持较好
      qualityScore = 8;
    } else {
      // 其他浏览器谨慎处理
      qualityScore = 6;
      issues.push('unknown_browser');
    }
    
    // 网络连接质量检测
    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        qualityScore -= 2;
        issues.push('slow_network');
      } else if (connection.effectiveType === '3g') {
        qualityScore -= 1;
        issues.push('moderate_network');
      }
      
      if (connection.rtt && connection.rtt > 1000) {
        qualityScore -= 1;
        issues.push('high_latency');
      }
    }
    
    // 设备和环境检测
    if (userAgent.includes('mobile')) {
      qualityScore -= 1; // 移动设备SSE连接相对不稳定
      issues.push('mobile_device');
    }
    
    // 开发环境检测
    if (isLocalhost) {
      issues.push('localhost_environment');
    }
    
    const quality = {
      score: Math.max(qualityScore, 1),
      issues,
      recommendation: qualityScore >= 8 ? 'sse_preferred' : 
                     qualityScore >= 6 ? 'sse_fallback' : 'polling_preferred',
      environment: {
        browser: isChrome ? 'chrome' : userAgent.includes('firefox') ? 'firefox' : 'other',
        isLocalhost,
        isProduction: !isLocalhost && window.location.protocol === 'https:'
      }
    };
    
    console.log('🔍 智能浏览器SSE质量评估 (Chrome localhost优化):', {
      userAgent: userAgent.substring(0, 50) + '...',
      environment: quality.environment,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        rtt: connection.rtt,
        downlink: connection.downlink
      } : 'unavailable',
      quality
    });
    
    return quality;
  }, []);

  // Start hybrid monitoring (SSE + polling backup) with Chrome localhost optimization
  const startJobMonitoring = useCallback((jobId: string) => {
    if (eventSource) {
      eventSource.close();
    }

    // 首先进行智能SSE支持质量评估
    const sseQuality = detectBrowserSSEQuality();
    
    console.log('🚀 启动智能混合任务监控系统:', {
      jobId,
      sseQuality,
      environment: sseQuality.environment,
      recommendation: sseQuality.recommendation,
      issues: sseQuality.issues,
      timestamp: new Date().toISOString()
    });

    // 基于质量评估的通信策略选择
    if (sseQuality.recommendation === 'polling_preferred' || 
        (sseQuality.environment?.isLocalhost && sseQuality.environment?.browser === 'chrome')) {
      
      console.log('📊 智能策略选择: 直接使用轮询模式', {
        reason: sseQuality.environment?.isLocalhost && sseQuality.environment?.browser === 'chrome' 
          ? 'Chrome localhost环境已知SSE连接问题' 
          : '质量评估建议轮询模式',
        qualityScore: sseQuality.score,
        issues: sseQuality.issues
      });
      
      startJobPolling(jobId);
      return;
    }

    // SSE优先或降级策略 - 仅在非Chrome localhost环境下尝试
    let sseConnected = false;
    let sseConnectionAttempts = 0;
    let pollBackupActive = false;
    
    // 根据质量调整最大重试次数 (Chrome localhost环境已被排除)
    const maxSSEAttempts = sseQuality.recommendation === 'sse_preferred' ? 2 : 1;
    
    const trySSEConnection = () => {
      if (sseConnectionAttempts >= maxSSEAttempts) {
        console.log('📊 SSE连接尝试次数已达上限，切换到智能轮询模式');
        startJobPolling(jobId);
        return;
      }
      
      sseConnectionAttempts++;
      console.log(`🔌 SSE连接尝试 ${sseConnectionAttempts}/${maxSSEAttempts} - JobID: ${jobId}`);
      console.log(`⏰ 连接开始时间: ${new Date().toISOString()}`);
      
      const newEventSource = apiService.createEventSource(jobId);
      let connectionTimeout: NodeJS.Timeout;
      let connectionStartTime = Date.now();
      
      // 连接建立监控
      console.log('📡 创建EventSource对象:', {
        url: `/api/job/stream/${jobId}`,
        readyState: newEventSource.readyState,
        timestamp: connectionStartTime
      });
      
      // 连接超时检测（3秒内必须收到open事件）
      connectionTimeout = setTimeout(() => {
        if (!sseConnected) {
          const elapsed = Date.now() - connectionStartTime;
          console.log(`⏱️ SSE连接超时 (${elapsed}ms)，状态: ${newEventSource.readyState}`);
          console.log('🔄 关闭并重试或切换到轮询');
          newEventSource.close();
          if (sseConnectionAttempts < maxSSEAttempts) {
            setTimeout(trySSEConnection, 1000); // 1秒后重试
          } else {
            startJobPolling(jobId);
          }
        }
      }, 3000);

      newEventSource.addEventListener('open', () => {
        const elapsed = Date.now() - connectionStartTime;
        console.log('✅ SSE连接建立成功:', {
          jobId,
          elapsed: `${elapsed}ms`,
          readyState: newEventSource.readyState,
          timestamp: new Date().toISOString()
        });
        sseConnected = true;
        clearTimeout(connectionTimeout);
        
        // 启动备用轮询（间隔较长，作为兜底）
        if (!pollBackupActive) {
          pollBackupActive = true;
          console.log('🔄 10秒后启动备用轮询监控...');
          setTimeout(() => {
            if (sseConnected) {
              startBackupPolling(jobId);
            }
          }, 10000); // 10秒后启动备用轮询
        }
      });

      newEventSource.addEventListener('progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 SSE进度更新:', {
            jobId: data.job_id,
            status: data.status,
            progress: data.progress,
            model: data.model_used,
            timestamp: new Date().toISOString()
          });
          setJobStatus(data);
          setProcessingProgress(data.progress || 0);
        } catch (err) {
          console.error('❌ 解析SSE进度数据失败:', event.data, err);
        }
      });

      newEventSource.addEventListener('complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🎉 SSE任务完成:', {
            jobId: data.job_id,
            variantCount: data.variants?.length || 0,
            model: data.model_used,
            timestamp: new Date().toISOString()
          });
          setJobStatus(data);
          if (data.variants && data.variants.length > 0) {
            console.log('📷 设置variants数据，数量:', data.variants.length);
            setVariants(data.variants);
          }
          setIsProcessing(false);
          sseConnected = false;
          newEventSource.close();
          setEventSource(null);
        } catch (err) {
          console.error('❌ 解析SSE完成数据失败:', event.data, err);
        }
      });

      newEventSource.addEventListener('connection-established', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('🎉 收到连接确认事件:', {
            serverTime: new Date(data.serverTime).toISOString(),
            message: data.message,
            jobId: data.jobId,
            connectionElapsed: Date.now() - connectionStartTime
          });
          
          // 连接确认后，标记连接稳定
          sseConnected = true;
        } catch (err) {
          console.log('🎉 收到连接确认事件 (解析失败，但连接正常)');
        }
      });

      newEventSource.addEventListener('ping', (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('💓 收到SSE心跳:', {
            timestamp: new Date(data.timestamp).toISOString(),
            jobId: data.job_id,
            connectionId: data.connection_id
          });
        } catch (err) {
          console.log('💓 收到SSE心跳 (原始数据)');
        }
      });

      newEventSource.addEventListener('connection-test', (event) => {
        console.log('🔗 收到连接测试信号:', event.data);
      });

      newEventSource.addEventListener('error', (event) => {
        const elapsed = Date.now() - connectionStartTime;
        console.error('❌ SSE连接错误:', {
          jobId,
          elapsed: `${elapsed}ms`,
          readyState: newEventSource.readyState,
          eventType: event.type,
          timestamp: new Date().toISOString()
        });
        
        // 检查EventSource状态
        console.log('🔍 EventSource状态检查:', {
          readyState: newEventSource.readyState,
          url: newEventSource.url,
          withCredentials: newEventSource.withCredentials
        });
        
        sseConnected = false;
        clearTimeout(connectionTimeout);
        
        // 立即尝试恢复状态
        const recoverJobStatus = async () => {
          try {
            console.log('🔧 SSE中断，立即检查任务状态...');
            const jobStatus = await apiService.getJobStatus(jobId);
            console.log('📋 当前任务状态:', {
              status: jobStatus.status,
              progress: jobStatus.progress,
              hasVariants: jobStatus.result_variant_ids?.length > 0,
              timestamp: new Date().toISOString()
            });
            
            if (jobStatus.status === 'done') {
              console.log('✅ 发现任务已完成，获取结果...');
              setJobStatus(jobStatus);
              
              if (jobStatus.result_variant_ids && jobStatus.result_variant_ids.length > 0) {
                const variants = await apiService.getJobVariants(jobId);
                console.log('📷 成功获取variants:', {
                  count: variants.length,
                  timestamp: new Date().toISOString()
                });
                setVariants(variants);
              }
              setIsProcessing(false);
              return true; // 任务完成，不需要重连
            } else if (jobStatus.status === 'error' || jobStatus.status === 'failed') {
              console.log('❌ 任务失败:', jobStatus);
              setJobStatus(jobStatus);
              setError(jobStatus.error_msg || '处理失败');
              setIsProcessing(false);
              return true; // 任务失败，不需要重连
            }
            return false; // 任务仍在进行，需要重连或轮询
          } catch (err) {
            console.error('❌ 状态恢复失败:', err);
            return false;
          }
        };
        
        recoverJobStatus().then(isComplete => {
          if (!isComplete) {
            // 任务未完成，决定是重试SSE还是切换轮询
            if (sseConnectionAttempts < maxSSEAttempts) {
              console.log(`🔄 准备重试SSE连接 (${2000}ms后)...`);
              setTimeout(trySSEConnection, 2000); // 2秒后重试
            } else {
              console.log('🔄 SSE重试次数达上限，切换到轮询模式');
              startJobPolling(jobId);
            }
          }
        });
        
        newEventSource.close();
        setEventSource(null);
      });

      setEventSource(newEventSource);
    };
    
    // 开始首次SSE连接尝试
    console.log('🚀 启动混合任务监控系统:', {
      jobId,
      maxAttempts: maxSSEAttempts,
      userAgent: navigator.userAgent.substring(0, 50) + '...',
      connectionInfo: (navigator as any).connection ? {
        type: (navigator as any).connection.effectiveType,
        rtt: (navigator as any).connection.rtt,
        downlink: (navigator as any).connection.downlink,
        saveData: (navigator as any).connection.saveData
      } : 'unavailable',
      browserInfo: {
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform
      },
      timestamp: new Date().toISOString()
    });
    trySSEConnection();
  }, [eventSource, setJobStatus, setProcessingProgress, setVariants, setIsProcessing]);

  // 优化的轮询机制 - 作为Chrome localhost环境的主要通信方式，增加429错误处理
  const startJobPolling = useCallback((jobId: string) => {
    console.log('🔄 启动智能轮询模式 (Chrome localhost优化版):', jobId);
    let pollCount = 0;
    const maxPollCount = 120; // 增加到120次 (4分钟, 动态间隔)
    let consecutiveFailures = 0;
    const maxConsecutiveFailures = 3;
    let lastKnownStatus: string = '';
    let rateLimitBackoff = 0; // 率限制退避乘数
    let lastRateLimitTime = 0; // 上次遇到率限制的时间
    
    const poll = async () => {
      pollCount++;
      const startTime = Date.now();
      
      try {
        const response = await fetch(`/api/job/${jobId}`);
        
        // 🛡️ 检测429率限制错误
        if (response.status === 429) {
          const now = Date.now();
          rateLimitBackoff = Math.min(rateLimitBackoff + 1, 3); // 最多3级退避
          lastRateLimitTime = now;
          
          console.log('⚠️ 检测到429率限制错误，实施退避策略:', {
            pollCount,
            backoffLevel: rateLimitBackoff,
            suggestedDelay: `${Math.pow(2, rateLimitBackoff) * 1000}ms`,
            message: '轮询频率过高，正在自动调整间隔'
          });
          
          // 指数退避：1秒 -> 2秒 -> 4秒 -> 8秒
          const backoffDelay = Math.pow(2, rateLimitBackoff) * 1000;
          setTimeout(poll, backoffDelay);
          return;
        }
        
        // 检查其他HTTP错误
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const jobStatus = await response.json();
        
        // ✅ 成功响应，重置退避和失败计数
        consecutiveFailures = 0;
        if (rateLimitBackoff > 0) {
          console.log('✅ API调用正常，重置退避策略:', {
            previousBackoff: rateLimitBackoff,
            timeSinceLastRateLimit: Date.now() - lastRateLimitTime
          });
          rateLimitBackoff = Math.max(0, rateLimitBackoff - 1); // 逐步恢复正常间隔
        }
        
        const elapsed = Date.now() - startTime;
        
        // 详细记录每次轮询结果 - 调试用
        console.log(`🔄 轮询第${pollCount}次 (${jobId.slice(-8)}):`, {
          status: jobStatus.status,
          progress: jobStatus.progress || 0,
          hasVariantIds: !!jobStatus.result_variant_ids?.length,
          variantIdsCount: jobStatus.result_variant_ids?.length || 0,
          variantIds: jobStatus.result_variant_ids,
          model: jobStatus.model_used,
          error: jobStatus.error_msg,
          apiLatency: `${elapsed}ms`,
          timestamp: new Date().toISOString()
        });
        
        // 状态变化时记录详细信息
        if (jobStatus.status !== lastKnownStatus) {
          console.log(`📊 🎯 状态变化检测 (第${pollCount}次轮询):`, {
            from: lastKnownStatus || '初始',
            to: jobStatus.status,
            progress: jobStatus.progress || 0,
            model: jobStatus.model_used,
            elapsed: `${elapsed}ms`,
            jobId,
            变化时机: `第${pollCount}次轮询`,
            完整状态数据: jobStatus
          });
          lastKnownStatus = jobStatus.status;
        }
        
        setJobStatus(jobStatus);
        setProcessingProgress(jobStatus.progress || 0);

        // 🎯 关键：处理任务完成状态 - 增强调试和错误处理
        if (jobStatus.status === 'done') {
          console.log('✅ 🎯 检测到任务完成状态！', {
            totalPolls: pollCount,
            totalTime: `${pollCount * 1.5}秒(估算)`,
            hasVariantIds: !!jobStatus.result_variant_ids?.length,
            variantIdsArray: jobStatus.result_variant_ids,
            variantIdsCount: jobStatus.result_variant_ids?.length || 0,
            完整任务状态: jobStatus
          });
          
          // 验证variant_ids存在性
          if (jobStatus.result_variant_ids && jobStatus.result_variant_ids.length > 0) {
            console.log('📷 开始获取variants数据...', {
              variantIds: jobStatus.result_variant_ids,
              jobId: jobId.slice(-8)
            });
            
            try {
              const variants = await apiService.getJobVariants(jobId);
              console.log('✅ 🎯 成功获取variants数据:', {
                variantCount: variants.length,
                totalPollingTime: `${pollCount * 1.5}秒(估算)`,
                variants: variants.map(v => ({
                  id: v.id?.slice(-8),
                  score: v.score,
                  hasImage: !!v.image_url,
                  imageUrl: v.image_url?.slice(0, 50) + '...'
                }))
              });
              
              // 🎯 关键：设置variants到状态
              console.log('🔄 设置variants到React状态...');
              setVariants(variants);
              console.log('✅ setVariants调用完成');
              
              // 验证状态是否设置成功
              setTimeout(() => {
                console.log('🔍 验证variants状态设置结果 (100ms后)');
              }, 100);
              
            } catch (variantError) {
              console.error('❌ 获取variants失败:', {
                error: variantError instanceof Error ? variantError.message : variantError,
                jobId: jobId.slice(-8),
                variantIds: jobStatus.result_variant_ids,
                stack: variantError instanceof Error ? variantError.stack : null
              });
              
              // 即使variants获取失败，也要设置错误状态
              setError(`结果获取失败: ${variantError instanceof Error ? variantError.message : '未知错误'}`);
            }
          } else {
            console.log('⚠️ 任务完成但没有variants数据:', {
              status: jobStatus.status,
              result_variant_ids: jobStatus.result_variant_ids,
              完整状态: jobStatus
            });
            // 没有variants也算完成，但需要提示用户
            setError('处理完成，但没有生成结果变体');
          }
          
          console.log('🔄 设置处理状态为false...');
          setIsProcessing(false);
          console.log('✅ 轮询任务完成，准备停止轮询');
          return; // 停止轮询
        } else if (jobStatus.status === 'error' || jobStatus.status === 'failed') {
          console.log('❌ 轮询检测到任务失败:', {
            error: jobStatus.error_msg,
            attempts: jobStatus.attempts,
            model: jobStatus.model_used,
            afterPolls: pollCount
          });
          setError(jobStatus.error_msg || '处理失败');
          setIsProcessing(false);
          return; // 停止轮询
        }

        // 检查是否超过最大轮询次数 - 但要给任务足够时间完成
        if (pollCount >= maxPollCount) {
          console.log('⏰ 轮询次数达到上限，最后尝试获取结果', {
            maxPolls: maxPollCount,
            lastStatus: jobStatus.status,
            progress: jobStatus.progress,
            hasVariantIds: !!jobStatus.result_variant_ids?.length
          });
          
          // 即使超时，如果任务已完成也要尝试获取结果
          if (jobStatus.status === 'done' && jobStatus.result_variant_ids?.length > 0) {
            console.log('💪 超时时发现任务已完成，强制获取结果...');
            try {
              const variants = await apiService.getJobVariants(jobId);
              console.log('✅ 超时情况下成功获取variants:', variants);
              setVariants(variants);
              setIsProcessing(false);
              return;
            } catch (err) {
              console.error('❌ 超时情况下variants获取失败:', err);
            }
          }
          
          setError('处理超时，但任务可能仍在进行中。请使用"获取处理结果"按钮手动刷新');
          setIsProcessing(false);
          return;
        }

        // 智能动态轮询间隔 - 优化以避免429率限制错误
        let interval = 1500; // 基础1.5秒间隔（从1000ms调整，更保守）
        
        if (jobStatus.status === 'running') {
          // 运行中时稍微频繁，但仍然保守
          interval = 1200; // 从800ms调整到1200ms
        } else if (jobStatus.status === 'queued') {
          // 队列中时较慢检查，减少服务器压力
          interval = 2000; // 从1500ms调整到2000ms
        } else if (jobStatus.status === 'pending') {
          // 待处理时最慢检查
          interval = 2500; // 从2000ms调整到2500ms
        }
        
        // 根据轮询次数调整 - 移除过于激进的快速轮询
        if (pollCount < 5) {
          // 前5次相对快速，但不过分
          interval = Math.max(interval * 0.9, 1000); // 最快1秒，不再使用500ms
        } else if (pollCount > 40) {
          // 40次后适度减慢频率，平衡响应性和服务器压力
          interval = Math.min(interval * 1.3, 4000); // 最慢4秒
        }
        
        // 🛡️ 应用429率限制退避策略 - 如果最近遇到过率限制，增加间隔
        if (rateLimitBackoff > 0) {
          const backoffMultiplier = 1 + (rateLimitBackoff * 0.5); // 1.5x, 2x, 2.5x
          interval = Math.min(interval * backoffMultiplier, 8000); // 最多8秒
          console.log(`🛡️ 应用429退避策略: 间隔调整为${interval}ms (退避级别: ${rateLimitBackoff})`);
        }
        
        console.log(`🔄 任务进行中 (第${pollCount}次轮询):`, {
          status: jobStatus.status,
          progress: jobStatus.progress || 0,
          nextPoll: `${interval}ms`,
          remaining: `${maxPollCount - pollCount}次`,
          apiLatency: `${elapsed}ms`,
          rateLimitBackoff: rateLimitBackoff > 0 ? `Level ${rateLimitBackoff}` : '正常'
        });
        
        setTimeout(poll, interval);
      } catch (err) {
        console.error('❌ 轮询API调用失败:', {
          error: err instanceof Error ? err.message : '未知错误',
          pollCount,
          consecutiveFailures: consecutiveFailures + 1
        });
        consecutiveFailures++;
        
        if (consecutiveFailures >= maxConsecutiveFailures) {
          console.log('⚠️ 连续API调用失败次数过多，停止轮询', {
            failures: consecutiveFailures,
            maxFailures: maxConsecutiveFailures,
            suggestion: '请检查网络连接后手动刷新'
          });
          setError('网络连接问题，请检查网络后手动刷新');
          setIsProcessing(false);
          return;
        }
        
        if (pollCount >= maxPollCount) {
          setError('无法获取处理状态，请重试');
          setIsProcessing(false);
          return;
        }
        
        // API调用失败，智能重试间隔
        const retryInterval = Math.min(2000 + consecutiveFailures * 1000, 6000);
        console.log(`⏱️ API失败重试 (第${consecutiveFailures}次失败):`, {
          retryAfter: `${retryInterval}ms`,
          nextAttempt: pollCount + 1
        });
        setTimeout(poll, retryInterval);
      }
    };

    // 立即开始轮询
    console.log('🚀 智能轮询已启动 (具备429错误自适应能力):', {
      jobId,
      maxPolls: maxPollCount,
      estimatedMaxTime: `${Math.round(maxPollCount * 1.5 / 60)}分钟`,
      strategy: 'rate_limit_aware_polling',
      features: [
        '动态间隔调整',
        '429错误检测',
        '指数退避恢复',
        '服务器友好'
      ]
    });
    poll();
  }, [setJobStatus, setProcessingProgress, setVariants, setIsProcessing]);
  
  // Backup polling mechanism (runs alongside SSE as safety net)
  const startBackupPolling = useCallback((jobId: string) => {
    console.log('启动备用轮询监控:', jobId);
    let backupPollCount = 0;
    const maxBackupPolls = 20; // 最多备用轮询20次
    
    const backupPoll = async () => {
      backupPollCount++;
      
      try {
        const jobStatus = await apiService.getJobStatus(jobId);
        
        // 只有在检测到完成或失败时才干预
        if (jobStatus.status === 'done') {
          console.log('🔄 备用轮询检测到任务完成，确保结果同步');
          setJobStatus(jobStatus);
          
          if (jobStatus.result_variant_ids && jobStatus.result_variant_ids.length > 0) {
            const variants = await apiService.getJobVariants(jobId);
            console.log('备用轮询获取variants:', variants);
            setVariants(variants);
          }
          setIsProcessing(false);
          return; // 停止备用轮询
        } else if (jobStatus.status === 'error' || jobStatus.status === 'failed') {
          console.log('🔄 备用轮询检测到任务失败');
          setJobStatus(jobStatus);
          setError(jobStatus.error_msg || '处理失败');
          setIsProcessing(false);
          return; // 停止备用轮询
        }
        
        // 继续备用轮询
        if (backupPollCount < maxBackupPolls) {
          setTimeout(backupPoll, 8000); // 8秒间隔，不与主轮询冲突
        }
      } catch (err) {
        console.error('备用轮询失败:', err);
        if (backupPollCount < maxBackupPolls) {
          setTimeout(backupPoll, 10000); // 失败时10秒后重试
        }
      }
    };
    
    backupPoll();
  }, [setJobStatus, setVariants, setIsProcessing]);

  // 增强的手动刷新结果功能
  const handleRefreshResults = useCallback(async () => {
    if (!lastJobId) {
      console.log('⚠️ 手动刷新：没有可用的任务ID');
      return;
    }
    
    try {
      console.log('🔄 手动刷新任务结果:', {
        jobId: lastJobId.slice(-8),
        timestamp: new Date().toISOString()
      });
      
      const jobStatus = await apiService.getJobStatus(lastJobId);
      console.log('📋 手动刷新获取的任务状态:', {
        status: jobStatus.status,
        progress: jobStatus.progress,
        hasVariantIds: !!jobStatus.result_variant_ids?.length,
        variantIds: jobStatus.result_variant_ids,
        完整状态: jobStatus
      });
      
      setJobStatus(jobStatus);
      
      if (jobStatus.status === 'done' && jobStatus.result_variant_ids && jobStatus.result_variant_ids.length > 0) {
        console.log('✅ 手动刷新发现任务完成，获取variants...');
        
        try {
          const variants = await apiService.getJobVariants(lastJobId);
          console.log('✅ 🎯 手动刷新成功获取variants:', {
            count: variants.length,
            variants: variants.map(v => ({
              id: v.id?.slice(-8),
              score: v.score,
              hasImage: !!v.image_url,
              imageUrl: v.image_url?.slice(0, 50) + '...'
            })),
            完整variants数据: variants
          });
          
          setVariants(variants);
          setIsProcessing(false);
          setError(null); // 清除之前的错误
          console.log('✅ 手动刷新成功完成');
          
        } catch (variantErr) {
          console.error('❌ 手动刷新variants获取失败:', {
            error: variantErr instanceof Error ? variantErr.message : variantErr,
            jobId: lastJobId.slice(-8),
            stack: variantErr instanceof Error ? variantErr.stack : null
          });
          setError(`获取结果失败: ${variantErr instanceof Error ? variantErr.message : '未知错误'}`);
        }
        
      } else if (jobStatus.status === 'error' || jobStatus.status === 'failed') {
        console.log('❌ 手动刷新发现任务失败:', {
          error: jobStatus.error_msg,
          status: jobStatus.status
        });
        setError(jobStatus.error_msg || '处理失败');
        setIsProcessing(false);
        
      } else if (jobStatus.status === 'running' || jobStatus.status === 'queued' || jobStatus.status === 'pending') {
        console.log('⏳ 手动刷新发现任务仍在进行:', {
          status: jobStatus.status,
          progress: jobStatus.progress
        });
        setError('任务仍在处理中，请稍后再试或等待自动完成');
        
      } else {
        console.log('❓ 手动刷新遇到未知状态:', {
          status: jobStatus.status,
          完整状态: jobStatus
        });
        setError(`未知任务状态: ${jobStatus.status}`);
      }
    } catch (err) {
      console.error('❌ 手动刷新失败:', {
        error: err instanceof Error ? err.message : err,
        jobId: lastJobId?.slice(-8),
        stack: err instanceof Error ? err.stack : null
      });
      setError(`刷新失败: ${err instanceof Error ? err.message : '网络错误，请重试'}`);
    }
  }, [lastJobId, setJobStatus, setVariants, setIsProcessing]);

  const handleExecuteFeature = useCallback(async () => {
    if (!currentImage || !currentSession || !selectedFeature) {
      setError('缺少必要的图像、会话或功能信息');
      return;
    }

    // Validate requirements
    if (selectedFeature.processing_options.mask_required && !maskData) {
      setError('此功能需要绘制蒙版，请先绘制选择区域');
      return;
    }

    if (selectedFeature.processing_options.dual_image && !secondImageId) {
      setError('此功能需要第二张图片，请先上传参考图片');
      return;
    }

    if (selectedFeature.processing_options.custom_prompt && !customPrompt) {
      setError('此功能需要自定义提示词，请输入您的创意描述');
      return;
    }

    try {
      setIsExecuting(true);
      setIsProcessing(true);
      setProcessingProgress(0);
      setError(null);

      const request: FeatureExecutionRequest = {
        session_id: currentSession.id,
        image_id: currentImage.id,
        feature_id: selectedFeature.id,
        scenario_id: selectedScenario?.id,
        user_id: 'default_user',
      };

      // Add optional parameters
      if (customPrompt) {
        request.custom_prompt = customPrompt;
      }
      if (secondImageId) {
        request.second_image_id = secondImageId;
      }
      if (maskData) {
        request.mask_data = maskData;
      }

      console.log('执行功能请求:', request);

      const result = await apiService.executeFeature(request);
      
      console.log('功能执行结果:', result);

      setCurrentJob({ 
        id: result.job_id, 
        session_id: currentSession.id,
        input_image_id: currentImage.id,
        type: 'edit',
        prompt: customPrompt || selectedFeature.prompt_template,
        status: 'pending',
        result_variant_ids: [],
        created_at: new Date().toISOString(),
        model: result.model
      });

      // 记录任务ID用于手动刷新
      setLastJobId(result.job_id);

      // Start SSE monitoring
      startJobMonitoring(result.job_id);

      onJobStarted?.(result.job_id);

    } catch (err) {
      console.error('功能执行失败:', err);
      setError(err instanceof Error ? err.message : '执行失败，请重试');
      setIsProcessing(false);
    } finally {
      setIsExecuting(false);
    }
  }, [
    currentImage,
    currentSession,
    selectedFeature,
    selectedScenario,
    customPrompt,
    secondImageId,
    maskData,
    setCurrentJob,
    setIsProcessing,
    setProcessingProgress,
    onJobStarted,
  ]);

  if (!selectedFeature) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          🎯 请先选择一个功能
        </div>
        <p className="text-sm text-gray-400">
          从场景中选择您需要的图像处理功能
        </p>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">
          📸 请先上传图片
        </div>
        <p className="text-sm text-gray-400">
          上传您要处理的图像以开始使用 {selectedFeature.name}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 功能信息卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-md bg-white/5 rounded-xl border border-white/10 p-6 mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <span className="text-3xl mr-3">{selectedFeature.icon}</span>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedFeature.name}
              </h2>
              <p className="text-white/70 text-sm">
                {selectedFeature.description}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedFeature.processing_options.dual_image && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                双图
              </span>
            )}
            {selectedFeature.processing_options.mask_required && (
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                需蒙版
              </span>
            )}
            {selectedFeature.processing_options.two_step && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                两步处理
              </span>
            )}
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedFeature.use_case_tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.div>

      {/* 参数设置 */}
      <div className="space-y-4 mb-6">
        {/* 自定义提示词 */}
        {selectedFeature.processing_options.custom_prompt && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              创意描述 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="详细描述您想要的效果，例如：将人物转换成超级英雄的造型，穿着红蓝配色的紧身衣..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
            <div className="text-xs text-gray-500 mt-1">
              越详细的描述能获得越好的效果
            </div>
          </div>
        )}

        {/* 第二张图片上传（双图功能） */}
        {selectedFeature.processing_options.dual_image && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              参考图片 <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-500">
                📎 上传参考图片
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {selectedFeature.code === 'pose_reference' && '上传姿势参考图'}
                {selectedFeature.code === 'color_palette' && '上传调色板图片'}
              </div>
              {/* TODO: 实现第二张图片上传功能 */}
            </div>
          </div>
        )}

        {/* 蒙版绘制（需要蒙版的功能） */}
        {selectedFeature.processing_options.mask_required && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择区域 <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <div className="text-gray-500">
                🎨 绘制处理区域
              </div>
              <div className="text-xs text-gray-400 mt-1">
                在图片上绘制要处理的区域
              </div>
              {/* TODO: 实现蒙版绘制功能 */}
            </div>
          </div>
        )}

        {/* 普通自定义提示词（非必需） */}
        {!selectedFeature.processing_options.custom_prompt && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              额外说明 <span className="text-gray-400">(可选)</span>
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="添加特殊要求或修改建议..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center">
            <span className="text-red-500 mr-2">⚠️</span>
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        </motion.div>
      )}

      {/* 执行按钮 */}
      <motion.button
        onClick={handleExecuteFeature}
        disabled={isExecuting}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
          isExecuting
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        } text-white`}
        whileHover={{ scale: isExecuting ? 1 : 1.02 }}
        whileTap={{ scale: isExecuting ? 1 : 0.98 }}
      >
        {isExecuting ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            处理中...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="mr-2">{selectedFeature.icon}</span>
            开始处理 - {selectedFeature.name}
          </div>
        )}
      </motion.button>

      {/* 手动刷新按钮 */}
      {lastJobId && !isExecuting && (
        <motion.button
          onClick={handleRefreshResults}
          className="w-full py-2 px-4 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-700 mt-2 flex items-center justify-center"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="mr-2">🔄</span>
          获取处理结果
        </motion.button>
      )}

      {/* 处理说明 */}
      <div className="text-center mt-4 text-xs text-gray-500">
        {selectedFeature.processing_options.two_step && (
          <div>⚡ 此功能使用两步处理，可能需要稍长时间</div>
        )}
        {selectedFeature.model_preferences?.preferred && (
          <div>
            🎯 推荐使用 {selectedFeature.model_preferences.preferred.join(', ')} 模型
          </div>
        )}
        {isExecuting && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-blue-600">
            <div>📡 智能轮询监控中</div>
            <div className="text-xs mt-1">
              系统会根据服务器响应自动调整检查频率，确保最佳用户体验
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScenarioImageEditor;