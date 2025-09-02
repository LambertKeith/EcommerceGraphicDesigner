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
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control, Last-Event-ID');
    
    console.log(`SSE connection established for job ${id}${lastEventId ? ` (resuming from ${lastEventId})` : ''}`);

    let eventId = 1;
    let isConnectionClosed = false;
    let heartbeatInterval: NodeJS.Timeout;
    let statusCheckInterval: NodeJS.Timeout;

    // Parse last event ID for reconnection
    if (lastEventId) {
      const parsedId = parseInt(lastEventId, 10);
      if (!isNaN(parsedId)) {
        eventId = parsedId + 1;
      }
    }

    const sendEvent = (eventType: string, data: any, id?: number) => {
      if (isConnectionClosed) return;
      
      const eventIdToUse = id || eventId++;
      const message = `id: ${eventIdToUse}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      
      try {
        res.write(message);
      } catch (error) {
        console.error(`Failed to send SSE event to job ${id}:`, error);
        closeConnection();
      }
    };

    const sendHeartbeat = () => {
      sendEvent('ping', { timestamp: Date.now() });
    };

    const closeConnection = () => {
      if (isConnectionClosed) return;
      
      isConnectionClosed = true;
      clearInterval(heartbeatInterval);
      clearInterval(statusCheckInterval);
      
      try {
        res.end();
      } catch (error) {
        console.error(`Error closing SSE connection for job ${id}:`, error);
      }
      
      console.log(`SSE connection closed for job ${id}`);
    };

    const sendUpdate = async () => {
      if (isConnectionClosed) return;
      
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

      } catch (error) {
        console.error(`Error sending SSE update for job ${id}:`, error);
        sendEvent('error', { 
          error: 'Internal server error',
          code: 'E_INTERNAL_ERROR'
        });
        closeConnection();
      }
    };

    // Send initial status
    sendUpdate();
    
    // Set up heartbeat (every 10 seconds)
    heartbeatInterval = setInterval(sendHeartbeat, 10000);
    
    // Set up status checking (every 2 seconds)
    statusCheckInterval = setInterval(sendUpdate, 2000);

    // Handle client disconnect
    req.on('close', () => {
      console.log(`Client disconnected from job ${id} SSE stream`);
      closeConnection();
    });

    req.on('error', (error) => {
      console.error(`SSE request error for job ${id}:`, error);
      closeConnection();
    });

    // Handle response errors
    res.on('error', (error) => {
      console.error(`SSE response error for job ${id}:`, error);
      closeConnection();
    });

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

export default router;