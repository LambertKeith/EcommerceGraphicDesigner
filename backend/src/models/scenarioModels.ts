import { db } from '../services/database';
import { Scenario, Feature, ScenarioFeature, UserPreferences, ScenarioWithFeatures } from '../types';

export class ScenarioModel {
  async findAll(): Promise<Scenario[]> {
    const result = await db.query(
      'SELECT * FROM scenarios WHERE is_active = true ORDER BY sort_order ASC'
    );
    return result.rows;
  }

  async findByCode(code: string): Promise<Scenario | null> {
    const result = await db.query(
      'SELECT * FROM scenarios WHERE code = $1 AND is_active = true',
      [code]
    );
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<Scenario | null> {
    const result = await db.query(
      'SELECT * FROM scenarios WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] || null;
  }

  async findWithFeatures(scenarioId?: string): Promise<ScenarioWithFeatures[]> {
    let query = `
      SELECT 
        s.*,
        json_agg(
          json_build_object(
            'id', f.id,
            'code', f.code,
            'name', f.name,
            'description', f.description,
            'prompt_template', f.prompt_template,
            'icon', f.icon,
            'preview_image_url', f.preview_image_url,
            'use_case_tags', f.use_case_tags,
            'model_preferences', f.model_preferences,
            'processing_options', f.processing_options,
            'sort_order', f.sort_order,
            'is_active', f.is_active,
            'is_featured', sf.is_featured,
            'created_at', f.created_at,
            'updated_at', f.updated_at
          ) ORDER BY sf.sort_order ASC
        ) as features
      FROM scenarios s
      LEFT JOIN scenario_features sf ON s.id = sf.scenario_id
      LEFT JOIN features f ON sf.feature_id = f.id AND f.is_active = true
      WHERE s.is_active = true
    `;
    
    const params: any[] = [];
    if (scenarioId) {
      query += ' AND s.id = $1';
      params.push(scenarioId);
    }
    
    query += ' GROUP BY s.id ORDER BY s.sort_order ASC';
    
    const result = await db.query(query, params);
    
    return result.rows.map(row => ({
      ...row,
      features: row.features.filter((f: any) => f.id !== null) // Remove null features
    }));
  }
}

export class FeatureModel {
  async findAll(): Promise<Feature[]> {
    const result = await db.query(
      'SELECT * FROM features WHERE is_active = true ORDER BY sort_order ASC'
    );
    return result.rows;
  }

  async findByCode(code: string): Promise<Feature | null> {
    const result = await db.query(
      'SELECT * FROM features WHERE code = $1 AND is_active = true',
      [code]
    );
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<Feature | null> {
    const result = await db.query(
      'SELECT * FROM features WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByScenario(scenarioId: string): Promise<(Feature & { is_featured: boolean })[]> {
    const result = await db.query(
      `SELECT f.*, sf.is_featured 
       FROM features f
       JOIN scenario_features sf ON f.id = sf.feature_id
       WHERE sf.scenario_id = $1 AND f.is_active = true
       ORDER BY sf.sort_order ASC`,
      [scenarioId]
    );
    return result.rows;
  }

  async searchByTags(tags: string[]): Promise<Feature[]> {
    const result = await db.query(
      `SELECT DISTINCT f.*
       FROM features f
       WHERE f.is_active = true 
       AND f.use_case_tags && $1
       ORDER BY f.sort_order ASC`,
      [tags]
    );
    return result.rows;
  }
}

export class UserPreferencesModel {
  async findByUserId(userId: string): Promise<UserPreferences | null> {
    const result = await db.query(
      'SELECT * FROM user_preferences WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  async create(userId: string, preferences: Partial<UserPreferences> = {}): Promise<UserPreferences> {
    const result = await db.query(
      `INSERT INTO user_preferences (
        user_id, favorite_scenarios, favorite_features, 
        feature_usage_count, last_used_scenario, preferences
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        userId,
        preferences.favorite_scenarios || [],
        preferences.favorite_features || [],
        preferences.feature_usage_count || {},
        preferences.last_used_scenario || null,
        preferences.preferences || {}
      ]
    );
    return result.rows[0];
  }

  async update(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.favorite_scenarios !== undefined) {
      fields.push(`favorite_scenarios = $${paramIndex++}`);
      values.push(updates.favorite_scenarios);
    }
    
    if (updates.favorite_features !== undefined) {
      fields.push(`favorite_features = $${paramIndex++}`);
      values.push(updates.favorite_features);
    }
    
    if (updates.feature_usage_count !== undefined) {
      fields.push(`feature_usage_count = $${paramIndex++}`);
      values.push(updates.feature_usage_count);
    }
    
    if (updates.last_used_scenario !== undefined) {
      fields.push(`last_used_scenario = $${paramIndex++}`);
      values.push(updates.last_used_scenario);
    }
    
    if (updates.preferences !== undefined) {
      fields.push(`preferences = $${paramIndex++}`);
      values.push(updates.preferences);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE user_preferences 
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`User preferences not found for user: ${userId}`);
    }
    return result.rows[0];
  }

  async incrementFeatureUsage(userId: string, featureId: string): Promise<void> {
    await db.query(
      `UPDATE user_preferences 
       SET feature_usage_count = feature_usage_count || jsonb_build_object($2::text, 
         COALESCE((feature_usage_count->>$2::text)::int, 0) + 1),
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId, featureId]
    );
  }

  async getOrCreate(userId: string): Promise<UserPreferences> {
    let preferences = await this.findByUserId(userId);
    if (!preferences) {
      preferences = await this.create(userId);
    }
    return preferences;
  }
}

export class ScenarioFeatureModel {
  async findByScenario(scenarioId: string): Promise<ScenarioFeature[]> {
    const result = await db.query(
      'SELECT * FROM scenario_features WHERE scenario_id = $1 ORDER BY sort_order ASC',
      [scenarioId]
    );
    return result.rows;
  }

  async findByFeature(featureId: string): Promise<ScenarioFeature[]> {
    const result = await db.query(
      'SELECT * FROM scenario_features WHERE feature_id = $1',
      [featureId]
    );
    return result.rows;
  }
}