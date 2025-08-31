import { Router } from 'express';
import { JobModel, ImageModel, VariantModel, SessionModel } from '../models';
import { geminiService } from '../services/gemini';
import { fileStorage } from '../services/fileStorage';
import { ApiResponse } from '../types';
import { getFileUrl } from '../utils/fileUtils';

const router = Router();
const jobModel = new JobModel();
const imageModel = new ImageModel();
const variantModel = new VariantModel();
const sessionModel = new SessionModel();

router.post('/', async (req, res, next) => {
  try {
    const { session_id, image_id, type, prompt } = req.body;
    
    if (!session_id || !image_id || !type) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id, image_id, and type are required'
      };
      return res.status(400).json(response);
    }

    const validTypes = ['optimize', 'edit', 'refine'];
    if (!validTypes.includes(type)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid type. Must be: optimize, edit, or refine'
      };
      return res.status(400).json(response);
    }

    const session = await sessionModel.findById(session_id);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found'
      };
      return res.status(404).json(response);
    }

    const image = await imageModel.findById(image_id);
    if (!image) {
      const response: ApiResponse = {
        success: false,
        error: 'Image not found'
      };
      return res.status(404).json(response);
    }

    const job = await jobModel.create(session_id, image_id, type, prompt);
    
    processImageAsync(job.id, image.path, {
      type: type as any,
      prompt,
      context: session.context_json
    }).catch(error => {
      console.error('Async processing error:', error);
      jobModel.updateStatus(job.id, 'error', error.message);
    });

    const response: ApiResponse = {
      success: true,
      data: { job_id: job.id }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

async function processImageAsync(jobId: string, imagePath: string, options: any) {
  try {
    await jobModel.updateStatus(jobId, 'running');
    
    const result = await geminiService.processImage(imagePath, options);
    
    if (!result.success) {
      await jobModel.updateStatus(jobId, 'error', result.error);
      return;
    }

    const job = await jobModel.findById(jobId);
    if (!job) return;

    const variantIds: string[] = [];
    
    for (const variant of result.variants) {
      try {
        const savedImage = await fileStorage.saveResultImage(
          variant.imageBuffer,
          imagePath
        );
        
        const resultImage = await imageModel.create(
          job.session_id,
          savedImage.filePath,
          savedImage.width,
          savedImage.height,
          variant.metadata
        );
        
        const thumbnailPath = await fileStorage.generateThumbnail(savedImage.filePath);
        
        const variantRecord = await variantModel.create(
          jobId,
          resultImage.id,
          variant.score,
          thumbnailPath,
          variant.metadata
        );
        
        variantIds.push(variantRecord.id);
      } catch (variantError) {
        console.error('Error processing variant:', variantError);
      }
    }
    
    await jobModel.updateVariants(jobId, variantIds);
    await jobModel.updateStatus(jobId, 'done');
    
  } catch (error) {
    console.error('Image processing failed:', error);
    await jobModel.updateStatus(jobId, 'error', error instanceof Error ? error.message : 'Processing failed');
  }
}

router.post('/refine', async (req, res, next) => {
  try {
    const { session_id, variant_id, instructions } = req.body;
    
    if (!session_id || !variant_id || !instructions) {
      const response: ApiResponse = {
        success: false,
        error: 'session_id, variant_id, and instructions are required'
      };
      return res.status(400).json(response);
    }

    const session = await sessionModel.findById(session_id);
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found'
      };
      return res.status(404).json(response);
    }

    const variant = await variantModel.findByJobId(variant_id);
    if (!variant.length) {
      const response: ApiResponse = {
        success: false,
        error: 'Variant not found'
      };
      return res.status(404).json(response);
    }

    const image = await imageModel.findById(variant[0].image_id);
    if (!image) {
      const response: ApiResponse = {
        success: false,
        error: 'Image not found'
      };
      return res.status(404).json(response);
    }

    const job = await jobModel.create(session_id, image.id, 'refine', instructions);
    
    const updatedContext = {
      ...session.context_json,
      previous_edits: [
        ...(session.context_json.previous_edits || []),
        {
          variant_id,
          instructions,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    await sessionModel.updateContext(session_id, updatedContext);
    
    processImageAsync(job.id, image.path, {
      type: 'refine',
      prompt: instructions,
      context: updatedContext
    }).catch(error => {
      console.error('Async refine processing error:', error);
      jobModel.updateStatus(job.id, 'error', error.message);
    });

    const response: ApiResponse = {
      success: true,
      data: { job_id: job.id }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;