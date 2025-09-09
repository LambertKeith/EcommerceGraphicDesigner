import { db } from '../services/database';
import { Project, Session, Image, Job, Variant } from '../types';

export class ProjectModel {
  async create(name: string, owner_id: string): Promise<Project> {
    const result = await db.query(
      'INSERT INTO projects (name, owner_id) VALUES ($1, $2) RETURNING *',
      [name, owner_id]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Project | null> {
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByOwnerId(owner_id: string): Promise<Project[]> {
    const result = await db.query('SELECT * FROM projects WHERE owner_id = $1 ORDER BY created_at DESC', [owner_id]);
    return result.rows;
  }
}

export class SessionModel {
  async create(
    project_id: string, 
    context_json: Record<string, any> = {},
    scenario_id?: string,
    workflow_context: Record<string, any> = {}
  ): Promise<Session> {
    const result = await db.query(
      'INSERT INTO sessions (project_id, context_json, scenario_id, workflow_context) VALUES ($1, $2, $3, $4) RETURNING *',
      [project_id, JSON.stringify(context_json), scenario_id, JSON.stringify(workflow_context)]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Session | null> {
    const result = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateContext(
    id: string, 
    context_json: Record<string, any>,
    workflow_context?: Record<string, any>
  ): Promise<Session> {
    const query = workflow_context 
      ? 'UPDATE sessions SET context_json = $1, workflow_context = $2, last_active_at = NOW() WHERE id = $3 RETURNING *'
      : 'UPDATE sessions SET context_json = $1, last_active_at = NOW() WHERE id = $2 RETURNING *';
    
    const params = workflow_context 
      ? [JSON.stringify(context_json), JSON.stringify(workflow_context), id]
      : [JSON.stringify(context_json), id];
    
    const result = await db.query(query, params);
    return result.rows[0];
  }

  async updateScenario(id: string, scenario_id: string): Promise<Session> {
    const result = await db.query(
      'UPDATE sessions SET scenario_id = $1, last_active_at = NOW() WHERE id = $2 RETURNING *',
      [scenario_id, id]
    );
    return result.rows[0];
  }
}

export class ImageModel {
  async create(
    project_id: string, 
    path: string, 
    width: number, 
    height: number, 
    meta_json: Record<string, any> = {},
    scenario_tags: string[] = [],
    usage_context: Record<string, any> = {}
  ): Promise<Image> {
    const result = await db.query(
      'INSERT INTO images (project_id, path, width, height, meta_json, scenario_tags, usage_context) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [project_id, path, width, height, JSON.stringify(meta_json), scenario_tags, JSON.stringify(usage_context)]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Image | null> {
    const result = await db.query('SELECT * FROM images WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByProjectId(project_id: string): Promise<Image[]> {
    const result = await db.query('SELECT * FROM images WHERE project_id = $1 ORDER BY created_at DESC', [project_id]);
    return result.rows;
  }

  async updateTags(id: string, scenario_tags: string[]): Promise<Image> {
    const result = await db.query(
      'UPDATE images SET scenario_tags = $1 WHERE id = $2 RETURNING *',
      [scenario_tags, id]
    );
    return result.rows[0];
  }
}

export class JobModel {
  async create(
    session_id: string, 
    input_image_id: string, 
    type: Job['type'], 
    prompt?: string, 
    model?: string,
    scenario_id?: string,
    feature_id?: string,
    feature_context: Record<string, any> = {}
  ): Promise<Job> {
    const result = await db.query(
      'INSERT INTO jobs (session_id, input_image_id, type, prompt, model_used, scenario_id, feature_id, feature_context, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [session_id, input_image_id, type, prompt, model, scenario_id, feature_id, JSON.stringify(feature_context), 'queued']
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Job | null> {
    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateStatus(id: string, status: Job['status'], error_msg?: string, model_used?: string): Promise<Job> {
    // 输入验证
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid job ID provided');
    }
    
    if (!status || typeof status !== 'string') {
      throw new Error('Invalid status provided');
    }
    
    // 验证状态值
    const validStatuses = ['pending', 'queued', 'running', 'done', 'error', 'failed'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    // 确保model_used参数不超过VARCHAR(50)限制
    const safeModelUsed = model_used && model_used.length > 50 ? model_used.substring(0, 50) : model_used;
    
    // 确保error_msg不会过长
    const safeErrorMsg = error_msg && error_msg.length > 1000 ? error_msg.substring(0, 1000) : error_msg;
    
    // 先处理last_error字段的更新
    let lastErrorValue: string | null = null;
    if (status === 'error' || status === 'failed') {
      lastErrorValue = safeErrorMsg || null;
    }
    
    let query: string;
    let params: any[];
    
    if (safeModelUsed !== undefined) {
      // 当提供model_used时
      query = `
        UPDATE jobs 
        SET status = $1, 
            error_msg = $2, 
            model_used = $3,
            last_error = COALESCE($4, last_error)
        WHERE id = $5 
        RETURNING *
      `;
      params = [status, safeErrorMsg || null, safeModelUsed, lastErrorValue, id];
    } else {
      // 当不提供model_used时，保持原值
      query = `
        UPDATE jobs 
        SET status = $1, 
            error_msg = $2,
            last_error = COALESCE($3, last_error)
        WHERE id = $4 
        RETURNING *
      `;
      params = [status, safeErrorMsg || null, lastErrorValue, id];
    }
    
    const result = await db.query(query, params);
    if (result.rows.length === 0) {
      throw new Error(`Job with ID ${id} not found`);
    }
    return result.rows[0];
  }

  async updateVariants(id: string, result_variant_ids: string[]): Promise<Job> {
    const result = await db.query(
      'UPDATE jobs SET result_variant_ids = $1 WHERE id = $2 RETURNING *',
      [result_variant_ids, id]
    );
    return result.rows[0];
  }

  async incrementAttempts(id: string): Promise<Job> {
    const result = await db.query(
      'UPDATE jobs SET attempts = attempts + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }

  async getJobsForRetry(limit: number = 10): Promise<Job[]> {
    const result = await db.query(
      'SELECT * FROM jobs WHERE status = $1 AND attempts < $2 ORDER BY queued_at ASC LIMIT $3',
      ['queued', 3, limit]
    );
    return result.rows;
  }

  async recoverStalledJobs(): Promise<number> {
    const result = await db.query(
      'SELECT recover_stalled_jobs() as recovered_count'
    );
    return result.rows[0]?.recovered_count || 0;
  }

  async findByIdempotencyKey(sessionId: string, idempotencyKey: string): Promise<Job | null> {
    // For now, we'll use a simple approach based on session and recent jobs
    // In production, you'd want a dedicated idempotency_keys table
    const result = await db.query(
      'SELECT * FROM jobs WHERE session_id = $1 AND created_at > NOW() - INTERVAL \'1 hour\' ORDER BY created_at DESC LIMIT 1',
      [sessionId]
    );
    return result.rows[0] || null;
  }
}

export class VariantModel {
  async create(job_id: string, image_id: string, score: number = 0, thumb_path?: string, meta_json: Record<string, any> = {}): Promise<Variant> {
    const result = await db.query(
      'INSERT INTO variants (job_id, image_id, score, thumb_path, meta_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [job_id, image_id, score, thumb_path, JSON.stringify(meta_json)]
    );
    return result.rows[0];
  }

  async findByJobId(job_id: string): Promise<Variant[]> {
    const result = await db.query(`
      SELECT 
        v.*,
        i.path as image_path
      FROM variants v
      JOIN images i ON v.image_id = i.id
      WHERE v.job_id = $1 
      ORDER BY v.score DESC
    `, [job_id]);
    
    // Add image_url to each variant
    return result.rows.map(row => ({
      ...row,
      image_url: row.image_path ? `/static${row.image_path}` : null
    }));
  }
}