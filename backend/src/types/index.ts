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
  scenario_id?: string;
  workflow_context: Record<string, any>;
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
  scenario_tags: string[];
  usage_context: Record<string, any>;
  created_at: Date;
}

export interface Job {
  id: string;
  session_id: string;
  input_image_id: string;
  type: 'optimize' | 'edit' | 'refine' | 'export';
  prompt: string;
  status: 'pending' | 'queued' | 'running' | 'done' | 'error' | 'failed';
  result_variant_ids: string[];
  scenario_id?: string;
  feature_id?: string;
  feature_context: Record<string, any>;
  created_at: Date;
  finished_at?: Date;
  error_msg?: string;
  // New enhanced fields
  attempts: number;
  last_error?: string;
  model_used?: string;
  started_at?: Date;
  queued_at: Date;
}

export interface Variant {
  id: string;
  job_id: string;
  image_id: string;
  score: number;
  thumb_path: string;
  meta_json: Record<string, any>;
}

// New scenario-related types
export interface Scenario {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Feature {
  id: string;
  code: string;
  name: string;
  description?: string;
  prompt_template: string;
  icon?: string;
  preview_image_url?: string;
  use_case_tags: string[];
  model_preferences?: {
    preferred?: string[];
    fallback?: string[];
  };
  processing_options: {
    dual_image?: boolean;
    mask_required?: boolean;
    mask_supported?: boolean;
    two_step?: boolean;
    step2_prompt?: string;
    custom_prompt?: boolean;
  };
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ScenarioFeature {
  id: string;
  scenario_id: string;
  feature_id: string;
  sort_order: number;
  is_featured: boolean;
  created_at: Date;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  favorite_scenarios: string[];
  favorite_features: string[];
  feature_usage_count: Record<string, number>;
  last_used_scenario?: string;
  preferences: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Enhanced API types
export interface ScenarioWithFeatures extends Scenario {
  features: (Feature & { is_featured: boolean })[];
}

export interface FeatureExecutionContext {
  feature_id: string;
  scenario_id?: string;
  custom_prompt?: string;
  mask_data?: string; // base64 encoded mask
  second_image_id?: string; // for dual image features
  processing_options?: Record<string, any>;
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
  // New scenario-based fields
  scenario_id?: string;
  feature_id?: string;
  feature_context?: FeatureExecutionContext;
  second_image_id?: string; // for dual image features
  mask_data?: string; // base64 encoded mask data
}

export interface JobStatus {
  id: string;
  status: Job['status'];
  progress?: number;
  result_variants?: Variant[];
  error_msg?: string;
  // New enhanced fields
  model_used?: string;
  attempts?: number;
  last_error?: string;
}