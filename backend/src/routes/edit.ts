import { Router } from 'express';
import { JobModel, ImageModel, VariantModel, SessionModel } from '../models';
import AIServiceFactory from '../services/aiServiceFactory';
import { AIModelType } from '../services/aiService';
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
    const { session_id, image_id, type, prompt, model } = req.body;
    
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

    // Validate model if provided
    let selectedModel: AIModelType;
    if (model) {
      const validModels: AIModelType[] = ['gemini', 'chatgpt', 'sora'];
      if (!validModels.includes(model)) {
        const response: ApiResponse = {
          success: false,
          error: `Invalid model. Must be one of: ${validModels.join(', ')}`
        };
        return res.status(400).json(response);
      }
      
      if (!AIServiceFactory.isModelAvailable(model)) {
        const response: ApiResponse = {
          success: false,
          error: `Model '${model}' is not available. Available models: ${AIServiceFactory.getAvailableModels().map(m => m.id).join(', ')}`
        };
        return res.status(400).json(response);
      }
      
      selectedModel = model;
    } else {
      // Use recommended model based on task type
      selectedModel = AIServiceFactory.getRecommendedModel(type as any);
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
      context: session.context_json,
      model: selectedModel
    }).catch(error => {
      console.error('Async processing error:', error);
      jobModel.updateStatus(job.id, 'error', error.message);
    });

    const response: ApiResponse = {
      success: true,
      data: { 
        job_id: job.id,
        model: selectedModel
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

async function processImageAsync(jobId: string, imagePath: string, options: any) {
  try {
    const selectedModel: AIModelType = options.model || 'gemini';
    console.log(`Starting image processing for job ${jobId} using model: ${selectedModel}`);
    console.log(`Image path: ${imagePath}, Options:`, { ...options, model: selectedModel });
    
    await jobModel.updateStatus(jobId, 'running');
    
    // Get the appropriate AI service
    const aiService = AIServiceFactory.getService(selectedModel);
    const result = await aiService.processImage(imagePath, {
      type: options.type,
      prompt: options.prompt,
      context: options.context
    });
    
    if (!result.success) {
      console.error(`AI processing failed for job ${jobId} with model ${selectedModel}:`, result.error);
      await jobModel.updateStatus(jobId, 'error', result.error);
      return;
    }

    console.log(`AI processing successful for job ${jobId} using ${selectedModel}, generated ${result.variants.length} variants`);

    const job = await jobModel.findById(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found after processing`);
      return;
    }

    // Get project_id from session
    const session = await sessionModel.findById(job.session_id);
    if (!session) {
      console.error(`Session ${job.session_id} not found for job ${jobId}`);
      await jobModel.updateStatus(jobId, 'error', 'Session not found');
      return;
    }

    console.log(`Using project_id ${session.project_id} for job ${jobId}`);

    const variantIds: string[] = [];
    
    for (let i = 0; i < result.variants.length; i++) {
      const variant = result.variants[i];
      try {
        console.log(`Processing variant ${i + 1}/${result.variants.length} for job ${jobId}`);
        
        const savedImage = await fileStorage.saveResultImage(
          variant.imageBuffer,
          imagePath
        );
        
        console.log(`Saved result image at: ${savedImage.filePath}`);
        
        // Use project_id from session instead of session_id
        const resultImage = await imageModel.create(
          session.project_id,
          savedImage.filePath,
          savedImage.width,
          savedImage.height,
          { ...variant.metadata, ai_model: selectedModel }
        );
        
        console.log(`Created result image record with ID: ${resultImage.id}`);
        
        const thumbnailPath = await fileStorage.generateThumbnail(savedImage.filePath);
        console.log(`Generated thumbnail at: ${thumbnailPath}`);
        
        const variantRecord = await variantModel.create(
          jobId,
          resultImage.id,
          variant.score,
          thumbnailPath,
          { ...variant.metadata, ai_model: selectedModel }
        );
        
        console.log(`Created variant record with ID: ${variantRecord.id}`);
        variantIds.push(variantRecord.id);
      } catch (variantError) {
        console.error(`Error processing variant ${i + 1} for job ${jobId}:`, variantError);
      }
    }
    
    console.log(`Completed processing ${variantIds.length} variants for job ${jobId} using ${selectedModel}`);
    
    await jobModel.updateVariants(jobId, variantIds);
    await jobModel.updateStatus(jobId, 'done');
    
    console.log(`Job ${jobId} completed successfully with model ${selectedModel}`);
    
  } catch (error) {
    console.error(`Image processing failed for job ${jobId}:`, error);
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

// Get available AI models
router.get('/models', async (req, res, next) => {
  try {
    const models = AIServiceFactory.getAvailableModels();
    const defaultModel = AIServiceFactory.getDefaultModel();
    
    const response: ApiResponse = {
      success: true,
      data: {
        models,
        default: defaultModel,
        total: models.length
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to get available models:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get available models'
    };
    res.status(500).json(response);
  }
});

// Test AI model connection
router.post('/models/:model/test', async (req, res, next) => {
  try {
    const { model } = req.params;
    
    if (!['gemini', 'chatgpt', 'sora'].includes(model)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid model specified'
      };
      return res.status(400).json(response);
    }

    const result = await AIServiceFactory.testConnection(model as AIModelType);
    
    const response: ApiResponse = {
      success: true,
      data: {
        model,
        connection: result
      }
    };
    
    res.json(response);
  } catch (error) {
    console.error('Model connection test failed:', error);
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    };
    res.status(500).json(response);
  }
});

export default router;