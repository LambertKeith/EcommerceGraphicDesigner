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
  async create(project_id: string, context_json: Record<string, any> = {}): Promise<Session> {
    const result = await db.query(
      'INSERT INTO sessions (project_id, context_json) VALUES ($1, $2) RETURNING *',
      [project_id, JSON.stringify(context_json)]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Session | null> {
    const result = await db.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateContext(id: string, context_json: Record<string, any>): Promise<Session> {
    const result = await db.query(
      'UPDATE sessions SET context_json = $1, last_active_at = NOW() WHERE id = $2 RETURNING *',
      [JSON.stringify(context_json), id]
    );
    return result.rows[0];
  }
}

export class ImageModel {
  async create(project_id: string, path: string, width: number, height: number, meta_json: Record<string, any> = {}): Promise<Image> {
    const result = await db.query(
      'INSERT INTO images (project_id, path, width, height, meta_json) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [project_id, path, width, height, JSON.stringify(meta_json)]
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
}

export class JobModel {
  async create(session_id: string, input_image_id: string, type: Job['type'], prompt?: string, model?: string): Promise<Job> {
    const result = await db.query(
      'INSERT INTO jobs (session_id, input_image_id, type, prompt, model_used, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [session_id, input_image_id, type, prompt, model, 'queued']
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Job | null> {
    const result = await db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async updateStatus(id: string, status: Job['status'], error_msg?: string, model_used?: string): Promise<Job> {
    const result = await db.query(
      'UPDATE jobs SET status = $1, error_msg = $2, model_used = COALESCE($3, model_used), last_error = CASE WHEN $1 IN (\'error\', \'failed\') THEN $2 ELSE last_error END WHERE id = $4 RETURNING *',
      [status, error_msg, model_used, id]
    );
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
    const result = await db.query('SELECT * FROM variants WHERE job_id = $1 ORDER BY score DESC', [job_id]);
    return result.rows;
  }
}