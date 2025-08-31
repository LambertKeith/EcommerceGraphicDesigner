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
      error_msg: job.error_msg
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
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const sendUpdate = async () => {
      try {
        const job = await jobModel.findById(id);
        if (!job) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
          return;
        }

        const progress = job.status === 'done' ? 100 : job.status === 'running' ? 50 : 0;
        
        res.write(`event: progress\ndata: ${JSON.stringify({
          status: job.status,
          progress,
          error_msg: job.error_msg
        })}\n\n`);

        if (job.status === 'done' || job.status === 'error') {
          res.write(`event: complete\ndata: ${JSON.stringify({ job_id: job.id })}\n\n`);
          res.end();
        }
      } catch (error) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
        res.end();
      }
    };

    sendUpdate();
    const interval = setInterval(sendUpdate, 2000);
    
    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (error) {
    next(error);
  }
});

export default router;