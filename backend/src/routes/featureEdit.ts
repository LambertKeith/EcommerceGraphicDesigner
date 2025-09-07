import { Router } from 'express';
import { JobModel, ImageModel, VariantModel, SessionModel } from '../models';
import { FeatureModel, UserPreferencesModel } from '../models/scenarioModels';
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
const featureModel = new FeatureModel();
const userPreferencesModel = new UserPreferencesModel();

/**
 * Enhanced edit endpoint that supports feature-based processing
 * POST /api/edit/feature
 */
router.post('/feature', async (req, res, next) => {
  try {
    const { 
      session_id, 
      image_id, 
      feature_id, 
      custom_prompt, 
      scenario_id,
      second_image_id,
      mask_data,
      user_id = 'default_user' // For now, using default user
    } = req.body;
    
    const idempotencyKey = req.headers['idempotency-key'] as string;
    
    // Validation
    if (!session_id || !image_id || !feature_id) {
      return res.status(400).json({
        success: false,
        error: 'session_id, image_id, and feature_id are required'
      });
    }

    // Check for existing job with same idempotency key
    if (idempotencyKey) {
      const existingJob = await jobModel.findByIdempotencyKey(session_id, idempotencyKey);
      if (existingJob) {
        return res.json({
          success: true,
          data: { 
            job_id: existingJob.id,
            model: existingJob.model_used || 'gemini',
            message: 'Job already exists (idempotent)'
          }
        });
      }
    }

    // Fetch feature details
    const feature = await featureModel.findById(feature_id);
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: 'Feature not found'
      });
    }

    // Validate session and image
    const session = await sessionModel.findById(session_id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const image = await imageModel.findById(image_id);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Validate second image if required for dual image features
    let secondImage: any = null;
    if (feature.processing_options.dual_image && second_image_id) {
      secondImage = await imageModel.findById(second_image_id);
      if (!secondImage) {
        return res.status(400).json({
          success: false,
          error: 'Second image is required for this feature but not found'
        });
      }
    }

    // Validate mask data if required
    if (feature.processing_options.mask_required && !mask_data) {
      return res.status(400).json({
        success: false,
        error: 'Mask data is required for this feature'
      });
    }

    // Build processing prompt
    let prompt = feature.prompt_template;
    if (feature.processing_options.custom_prompt && custom_prompt) {
      prompt = custom_prompt;
    } else if (custom_prompt) {
      prompt += ` Additional instructions: ${custom_prompt}`;
    }

    // Select appropriate AI model
    let selectedModel: AIModelType = 'gemini'; // Default fallback
    if (feature.model_preferences?.preferred?.length) {
      // Try preferred models first
      for (const preferredModel of feature.model_preferences.preferred) {
        if (await AIServiceFactory.isModelAvailable(preferredModel as AIModelType)) {
          selectedModel = preferredModel as AIModelType;
          break;
        }
      }
    } else {
      // Fall back to recommended model for the task type
      selectedModel = await AIServiceFactory.getRecommendedModel('edit');
    }

    // Create feature context
    const feature_context = {
      feature_code: feature.code,
      processing_options: feature.processing_options,
      custom_prompt: custom_prompt,
      second_image_id,
      mask_data
    };

    // Create job with feature context
    const job = await jobModel.create(
      session_id, 
      image_id, 
      'edit', 
      prompt, 
      selectedModel,
      scenario_id,
      feature_id,
      feature_context
    );

    // Update user preferences (track feature usage)
    try {
      await userPreferencesModel.incrementFeatureUsage(user_id, feature_id);
      if (scenario_id) {
        const userPrefs = await userPreferencesModel.getOrCreate(user_id);
        await userPreferencesModel.update(user_id, {
          last_used_scenario: scenario_id
        });
      }
    } catch (error) {
      console.warn('Failed to update user preferences:', error);
      // Don't fail the request if preferences update fails
    }
    
    // Start async processing
    processFeatureImageAsync(job.id, image.path, {
      feature,
      prompt,
      context: session.context_json,
      model: selectedModel,
      secondImagePath: secondImage?.path,
      maskData: mask_data
    }).catch(async error => {
      console.error('Async feature processing error:', error);
      try {
        await jobModel.updateStatus(job.id, 'error', error?.message || 'Async processing failed', selectedModel);
      } catch (updateError) {
        console.error('Failed to update job status after async processing error:', updateError);
      }
    });

    const response: ApiResponse = {
      success: true,
      data: { 
        job_id: job.id,
        model: selectedModel,
        feature: {
          id: feature.id,
          name: feature.name,
          code: feature.code
        }
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * Enhanced image processing function that supports feature-based processing
 */
async function processFeatureImageAsync(jobId: string, imagePath: string, options: {
  feature: any;
  prompt: string;
  context: any;
  model: AIModelType;
  secondImagePath?: string;
  maskData?: string;
}) {
  try {
    console.log(`Starting feature-based image processing for job ${jobId} using model: ${options.model}`);
    console.log(`Feature: ${options.feature.name} (${options.feature.code})`);
    
    await jobModel.updateStatus(jobId, 'running', undefined, options.model);

    // Handle two-step processing (like color palette conversion)
    if (options.feature.processing_options.two_step) {
      console.log(`Starting two-step processing for feature ${options.feature.code}`);
      
      // Step 1: Use main prompt template
      const aiService = await AIServiceFactory.getService(options.model);
      const step1Result = await aiService.processImage(imagePath, {
        type: 'edit',
        prompt: options.feature.prompt_template,
        context: options.context,
        maskData: options.maskData
      });

      if (!step1Result.success) {
        console.error(`Step 1 processing failed for job ${jobId}:`, step1Result.error);
        await jobModel.updateStatus(jobId, 'error', `Step 1 failed: ${step1Result.error}`, options.model);
        return;
      }

      // Step 2: Use step2_prompt with second image
      if (options.feature.processing_options.step2_prompt && options.secondImagePath) {
        console.log(`Starting step 2 processing with second image`);
        
        // Save step 1 result temporarily
        const step1ImagePath = await fileStorage.saveTempImage(step1Result.variants[0].imageBuffer);
        
        const step2Result = await aiService.processImage(step1ImagePath, {
          type: 'edit',
          prompt: options.feature.processing_options.step2_prompt,
          context: options.context,
          secondImagePath: options.secondImagePath
        });

        if (!step2Result.success) {
          console.error(`Step 2 processing failed for job ${jobId}:`, step2Result.error);
          await jobModel.updateStatus(jobId, 'error', `Step 2 failed: ${step2Result.error}`, options.model);
          return;
        }

        // Use step 2 result as final result
        await finalizeJobResults(jobId, step2Result, options.model, imagePath);
      } else {
        // Only step 1 needed
        await finalizeJobResults(jobId, step1Result, options.model, imagePath);
      }
    } else {
      // Standard single-step processing
      const processingOptions: any = {
        type: 'edit',
        prompt: options.prompt,
        context: options.context,
        maskData: options.maskData
      };

      // Add second image for dual image features
      if (options.feature.processing_options.dual_image && options.secondImagePath) {
        processingOptions.secondImagePath = options.secondImagePath;
      }

      const aiService = await AIServiceFactory.getService(options.model);
      const result = await aiService.processImage(imagePath, processingOptions);
      
      if (!result.success) {
        console.error(`AI processing failed for job ${jobId} with model ${options.model}:`, result.error);
        await jobModel.updateStatus(jobId, 'error', result.error, options.model);
        return;
      }

      await finalizeJobResults(jobId, result, options.model, imagePath);
    }
    
  } catch (error) {
    console.error(`Feature-based image processing failed for job ${jobId}:`, error);
    await jobModel.updateStatus(jobId, 'error', error instanceof Error ? error.message : 'Processing failed', options.model);
  }
}

/**
 * Helper function to finalize job results
 */
async function finalizeJobResults(jobId: string, result: any, model: AIModelType, originalImagePath: string) {
  console.log(`Finalizing results for job ${jobId} using ${model}, generated ${result.variants.length} variants`);

  const job = await jobModel.findById(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found after processing`);
    return;
  }

  const session = await sessionModel.findById(job.session_id);
  if (!session) {
    console.error(`Session ${job.session_id} not found for job ${jobId}`);
    await jobModel.updateStatus(jobId, 'error', 'Session not found', model);
    return;
  }

  const variantIds: string[] = [];
  
  for (let i = 0; i < result.variants.length; i++) {
    const variant = result.variants[i];
    try {
      console.log(`Processing variant ${i + 1}/${result.variants.length} for job ${jobId}`);
      
      const savedImage = await fileStorage.saveResultImage(
        variant.imageBuffer,
        originalImagePath
      );
      
      // Add feature-specific metadata
      const imageMetadata = { 
        ...variant.metadata, 
        ai_model: model,
        feature_id: job.feature_id,
        scenario_id: job.scenario_id
      };
      
      const resultImage = await imageModel.create(
        session.project_id,
        savedImage.filePath,
        savedImage.width,
        savedImage.height,
        imageMetadata,
        job.scenario_id ? [job.scenario_id] : [], // Add scenario tag
        { processing_type: 'feature_based', feature_id: job.feature_id }
      );
      
      const thumbnailPath = await fileStorage.generateThumbnail(savedImage.filePath);
      
      const variantRecord = await variantModel.create(
        jobId,
        resultImage.id,
        variant.score,
        thumbnailPath,
        imageMetadata
      );
      
      console.log(`Created variant record with ID: ${variantRecord.id}`);
      variantIds.push(variantRecord.id);
    } catch (variantError) {
      console.error(`Error processing variant ${i + 1} for job ${jobId}:`, variantError);
    }
  }
  
  console.log(`Completed processing ${variantIds.length} variants for job ${jobId} using ${model}`);
  
  await jobModel.updateVariants(jobId, variantIds);
  await jobModel.updateStatus(jobId, 'done', undefined, model);
  
  console.log(`Job ${jobId} completed successfully with model ${model}`);
}

export default router;