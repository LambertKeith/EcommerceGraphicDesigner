import { Router } from 'express';
import { ScenarioModel, FeatureModel, UserPreferencesModel } from '../models/scenarioModels';
import { ApiResponse, ScenarioWithFeatures } from '../types';

const router = Router();
const scenarioModel = new ScenarioModel();
const featureModel = new FeatureModel();
const userPreferencesModel = new UserPreferencesModel();

/**
 * Get all scenarios with their features
 * GET /api/scenarios
 */
router.get('/', async (req, res) => {
  try {
    const scenarios = await scenarioModel.findWithFeatures();
    
    const response: ApiResponse<ScenarioWithFeatures[]> = {
      success: true,
      data: scenarios,
      message: 'Scenarios retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scenarios'
    });
  }
});

/**
 * Get a specific scenario with features by ID or code
 * GET /api/scenarios/:identifier
 */
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by UUID first, then by code
    let scenario;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    
    if (isUUID) {
      const scenarios = await scenarioModel.findWithFeatures(identifier);
      scenario = scenarios[0] || null;
    } else {
      const scenarios = await scenarioModel.findWithFeatures();
      scenario = scenarios.find(s => s.code === identifier) || null;
    }
    
    if (!scenario) {
      return res.status(404).json({
        success: false,
        error: 'Scenario not found'
      });
    }
    
    const response: ApiResponse<ScenarioWithFeatures> = {
      success: true,
      data: scenario,
      message: 'Scenario retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching scenario:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scenario'
    });
  }
});

/**
 * Get all features
 * GET /api/scenarios/features/all
 */
router.get('/features/all', async (req, res) => {
  try {
    const features = await featureModel.findAll();
    
    const response: ApiResponse = {
      success: true,
      data: features,
      message: 'Features retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching features:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch features'
    });
  }
});

/**
 * Get a specific feature by ID or code
 * GET /api/scenarios/features/:identifier
 */
router.get('/features/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by UUID first, then by code
    let feature;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    
    if (isUUID) {
      feature = await featureModel.findById(identifier);
    } else {
      feature = await featureModel.findByCode(identifier);
    }
    
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: 'Feature not found'
      });
    }
    
    const response: ApiResponse = {
      success: true,
      data: feature,
      message: 'Feature retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching feature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature'
    });
  }
});

/**
 * Search features by tags
 * GET /api/scenarios/features/search?tags=tag1,tag2
 */
router.get('/features/search', async (req, res) => {
  try {
    const { tags } = req.query;
    
    if (!tags || typeof tags !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Tags parameter is required'
      });
    }
    
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    if (tagArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one tag is required'
      });
    }
    
    const features = await featureModel.searchByTags(tagArray);
    
    const response: ApiResponse = {
      success: true,
      data: features,
      message: 'Features found successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error searching features:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search features'
    });
  }
});

/**
 * Get user preferences
 * GET /api/scenarios/preferences/:userId
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const preferences = await userPreferencesModel.getOrCreate(userId);
    
    const response: ApiResponse = {
      success: true,
      data: preferences,
      message: 'User preferences retrieved successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user preferences'
    });
  }
});

/**
 * Update user preferences
 * PUT /api/scenarios/preferences/:userId
 */
router.put('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Validate the updates
    const validFields = [
      'favorite_scenarios', 
      'favorite_features', 
      'feature_usage_count',
      'last_used_scenario',
      'preferences'
    ];
    
    const filteredUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (validFields.includes(key)) {
        filteredUpdates[key] = value;
      }
    }
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    // Ensure user preferences exist first
    await userPreferencesModel.getOrCreate(userId);
    
    const preferences = await userPreferencesModel.update(userId, filteredUpdates);
    
    const response: ApiResponse = {
      success: true,
      data: preferences,
      message: 'User preferences updated successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user preferences'
    });
  }
});

/**
 * Increment feature usage count
 * POST /api/scenarios/preferences/:userId/increment/:featureId
 */
router.post('/preferences/:userId/increment/:featureId', async (req, res) => {
  try {
    const { userId, featureId } = req.params;
    
    // Validate feature exists
    const feature = await featureModel.findById(featureId);
    if (!feature) {
      return res.status(404).json({
        success: false,
        error: 'Feature not found'
      });
    }
    
    // Ensure user preferences exist
    await userPreferencesModel.getOrCreate(userId);
    
    // Increment usage count
    await userPreferencesModel.incrementFeatureUsage(userId, featureId);
    
    const response: ApiResponse = {
      success: true,
      message: 'Feature usage incremented successfully'
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error incrementing feature usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to increment feature usage'
    });
  }
});

export default router;