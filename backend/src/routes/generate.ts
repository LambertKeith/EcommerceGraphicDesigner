import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import AIServiceFactory from '../services/aiServiceFactory';
import { AIModelType } from '../services/aiService';
import { fileStorage } from '../services/fileStorage';
import { ApiResponse } from '../types';
import { getFileUrl } from '../utils/fileUtils';

const router = Router();

// Available image sizes
const AVAILABLE_SIZES = [
  '512x512',
  '768x768', 
  '1024x1024',
  '1152x896',
  '1216x832',
  '1344x768',
  '1536x640',
  '1920x1920'
];

// Available style presets
const AVAILABLE_STYLES = [
  { id: 'commercial', name: '商业风格', description: '专业产品摄影，清洁背景，工作室照明' },
  { id: 'artistic', name: '艺术风格', description: '创意艺术效果，独特构图，视觉冲击' },
  { id: 'minimal', name: '简约风格', description: '简洁设计，清晰线条，现代美学' },
  { id: 'realistic', name: '写实风格', description: '照片级真实感，自然光照，真实纹理' },
  { id: 'vibrant', name: '活力风格', description: '明亮色彩，高对比度，充满活力' }
];

// Temporary in-memory job storage (should be database in production)
const generateJobs = new Map();

// Generate image endpoint
router.post('/', async (req, res, next) => {
  try {
    const { prompt, style, size, model, project_id } = req.body;
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Prompt is required and must be a non-empty string'
      };
      return res.status(400).json(response);
    }

    // Validate size if provided
    if (size && !AVAILABLE_SIZES.includes(size)) {
      const response: ApiResponse = {
        success: false,
        error: `Invalid size. Must be one of: ${AVAILABLE_SIZES.join(', ')}`
      };
      return res.status(400).json(response);
    }

    // Validate style if provided  
    if (style && !AVAILABLE_STYLES.some(s => s.id === style)) {
      const response: ApiResponse = {
        success: false,
        error: `Invalid style. Must be one of: ${AVAILABLE_STYLES.map(s => s.id).join(', ')}`
      };
      return res.status(400).json(response);
    }

    // Check for existing job with same idempotency key
    if (idempotencyKey) {
      const existingJob = [...generateJobs.values()].find(
        (job: any) => job.idempotencyKey === idempotencyKey
      );
      if (existingJob) {
        const response: ApiResponse = {
          success: true,
          data: { 
            job_id: existingJob.id,
            model: existingJob.model_used || 'gemini',
            message: 'Job already exists (idempotent)'
          }
        };
        return res.json(response);
      }
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
      
      if (!(await AIServiceFactory.isModelAvailable(model))) {
        const availableModels = await AIServiceFactory.getAvailableModels();
        const response: ApiResponse = {
          success: false,
          error: `Model '${model}' is not available. Available models: ${availableModels.map(m => m.id).join(', ')}`
        };
        return res.status(400).json(response);
      }
      
      selectedModel = model;
    } else {
      // Use recommended model for generation (prefer Gemini for text-to-image)
      selectedModel = await AIServiceFactory.getRecommendedModel('optimize');
    }

    // Create job
    const jobId = uuidv4();
    const job = {
      id: jobId,
      project_id: project_id || null,
      session_id: null,
      prompt: prompt.trim(),
      style: style || 'commercial',
      size: size || '1024x1024',
      model_used: selectedModel,
      status: 'pending',
      result_image_id: null,
      error_msg: null,
      attempts: 0,
      started_at: null,
      created_at: new Date(),
      idempotencyKey
    };

    generateJobs.set(jobId, job);
    
    // Start async generation
    generateImageAsync(jobId, {
      prompt: prompt.trim(),
      style: style || 'commercial',
      size: size || '1024x1024',
      model: selectedModel
    }).catch(async error => {
      console.error('Async generation error:', error);
      const jobData = generateJobs.get(jobId);
      if (jobData) {
        jobData.status = 'error';
        jobData.error_msg = error?.message || 'Async generation failed';
        generateJobs.set(jobId, jobData);
      }
    });

    const response: ApiResponse = {
      success: true,
      data: { 
        job_id: jobId,
        model: selectedModel
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get generation job status
router.get('/jobs/:jobId', async (req, res, next) => {
  try {
    const { jobId } = req.params;
    
    const job = generateJobs.get(jobId);
    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found'
      };
      return res.status(404).json(response);
    }

    let imageUrl: string | null = null;
    if (job.result_image_path) {
      imageUrl = getFileUrl(req, job.result_image_path);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        prompt: job.prompt,
        style: job.style,
        size: job.size,
        model_used: job.model_used,
        error_msg: job.error_msg,
        image_url: imageUrl,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get available styles
router.get('/styles', async (req, res, next) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        styles: AVAILABLE_STYLES,
        default: 'commercial'
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Get available sizes
router.get('/sizes', async (req, res, next) => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        sizes: AVAILABLE_SIZES.map(size => {
          const [width, height] = size.split('x').map(Number);
          return {
            id: size,
            name: size,
            width,
            height,
            aspect_ratio: width / height
          };
        }),
        default: '1024x1024'
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

async function generateImageAsync(jobId: string, options: any) {
  try {
    const selectedModel: AIModelType = options.model || 'gemini';
    console.log(`Starting image generation for job ${jobId} using model: ${selectedModel}`);
    console.log(`Generation options:`, options);
    
    // Update job status
    const job = generateJobs.get(jobId);
    if (job) {
      job.status = 'running';
      job.started_at = new Date();
      job.attempts = (job.attempts || 0) + 1;
      generateJobs.set(jobId, job);
    }
    
    let result: any = null;
    let finalModelUsed = selectedModel;
    
    // Try to use AI service factory with fallback mechanism
    try {
      const aiService = await AIServiceFactory.getService(selectedModel);
      result = await aiService.generateImage({
        prompt: options.prompt,
        style: options.style,
        size: options.size
      });
    } catch (serviceError) {
      console.log(`Primary model ${selectedModel} failed, trying fallback models...`);
      console.log('Service error:', serviceError instanceof Error ? serviceError.message : serviceError);
      
      // Try fallback models in priority order
      const fallbackModels: AIModelType[] = ['chatgpt', 'sora'];
      
      for (const fallbackModel of fallbackModels) {
        if (fallbackModel === selectedModel) continue; // Skip if same as original
        
        try {
          console.log(`Trying fallback model: ${fallbackModel}`);
          
          if (await AIServiceFactory.isModelAvailable(fallbackModel)) {
            const fallbackService = await AIServiceFactory.getService(fallbackModel);
            result = await fallbackService.generateImage({
              prompt: options.prompt,
              style: options.style,
              size: options.size
            });
            
            if (result && result.success) {
              finalModelUsed = fallbackModel;
              console.log(`Successfully generated with fallback model: ${fallbackModel}`);
              break;
            }
          }
        } catch (fallbackError) {
          console.log(`Fallback model ${fallbackModel} also failed:`, fallbackError instanceof Error ? fallbackError.message : fallbackError);
        }
      }
      
      if (!result || !result.success) {
        throw new Error('All models failed to generate image');
      }
    }
    
    if (!result || !result.success) {
      console.error(`Image generation failed for job ${jobId} with model ${finalModelUsed}:`, result?.error);
      const jobData = generateJobs.get(jobId);
      if (jobData) {
        jobData.status = 'error';
        jobData.error_msg = result?.error || 'Generation failed';
        jobData.model_used = finalModelUsed;
        generateJobs.set(jobId, jobData);
      }
      return;
    }

    console.log(`Image generation successful for job ${jobId} using ${finalModelUsed}`);

    if (!result.imageBuffer) {
      const jobData = generateJobs.get(jobId);
      if (jobData) {
        jobData.status = 'error';
        jobData.error_msg = 'No image buffer received from AI service';
        jobData.model_used = finalModelUsed;
        generateJobs.set(jobId, jobData);
      }
      return;
    }

    // Save the generated image
    const savedImage = await fileStorage.saveResultImage(
      result.imageBuffer,
      `generated_${jobId}.png`
    );
    
    console.log(`Saved generated image at: ${savedImage.filePath}`);
    
    // Update job with result
    const jobData = generateJobs.get(jobId);
    if (jobData) {
      jobData.status = 'done';
      jobData.result_image_path = savedImage.filePath;
      jobData.completed_at = new Date();
      jobData.model_used = finalModelUsed;
      generateJobs.set(jobId, jobData);
    }
    
    console.log(`Job ${jobId} completed successfully with model ${finalModelUsed}`);
    
  } catch (error) {
    console.error(`Image generation failed for job ${jobId}:`, error);
    const jobData = generateJobs.get(jobId);
    if (jobData) {
      jobData.status = 'error';
      jobData.error_msg = error instanceof Error ? error.message : 'Generation failed';
      generateJobs.set(jobId, jobData);
    }
  }
}

export default router;