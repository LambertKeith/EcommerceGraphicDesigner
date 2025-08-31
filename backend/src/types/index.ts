export interface Project {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date;
}

export interface Session {
  id: string;
  project_id: string;
  context_json: Record<string, any>;
  created_at: Date;
  last_active_at: Date;
}

export interface Image {
  id: string;
  project_id: string;
  path: string;
  width: number;
  height: number;
  meta_json: Record<string, any>;
  created_at: Date;
}

export interface Job {
  id: string;
  session_id: string;
  input_image_id: string;
  type: 'optimize' | 'edit' | 'refine' | 'export';
  prompt: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result_variant_ids: string[];
  created_at: Date;
  finished_at?: Date;
  error_msg?: string;
}

export interface Variant {
  id: string;
  job_id: string;
  image_id: string;
  score: number;
  thumb_path: string;
  meta_json: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UploadRequest {
  file: Express.Multer.File;
}

export interface EditRequest {
  session_id: string;
  image_id: string;
  type: Job['type'];
  prompt?: string;
}

export interface JobStatus {
  id: string;
  status: Job['status'];
  progress?: number;
  result_variants?: Variant[];
  error_msg?: string;
}