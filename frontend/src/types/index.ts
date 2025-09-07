export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type AIModelType = 'gemini' | 'chatgpt' | 'sora';

export interface AIModelInfo {
  id: AIModelType;
  name: string;
  description: string;
  capabilities: string[];
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'premium';
  recommended: string[];
}

export interface AIModelsResponse {
  models: AIModelInfo[];
  default: AIModelType;
  total: number;
}

export interface Project {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface Session {
  id: string;
  project_id: string;
  context_json: Record<string, any>;
  scenario_id?: string;
  workflow_context: Record<string, any>;
  created_at: string;
  last_active_at: string;
}

export interface Image {
  id: string;
  project_id: string;
  path: string;
  url: string;
  width: number;
  height: number;
  meta_json: Record<string, any>;
  scenario_tags: string[];
  usage_context: Record<string, any>;
  created_at: string;
}

export interface Job {
  id: string;
  session_id: string;
  input_image_id: string;
  type: 'optimize' | 'edit' | 'refine' | 'export';
  prompt: string;
  status: 'pending' | 'running' | 'done' | 'error';
  result_variant_ids: string[];
  created_at: string;
  finished_at?: string;
  error_msg?: string;
  model?: AIModelType;
}

export interface Variant {
  id: string;
  job_id: string;
  image_id: string;
  score: number;
  thumb_path: string;
  meta_json: Record<string, any>;
}

export interface JobStatus {
  id: string;
  status: Job['status'];
  progress?: number;
  result_variants?: Variant[];
  error_msg?: string;
  model?: AIModelType;
}

export interface UploadResult {
  image_id: string;
  project_id: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
}

// Scenario-related types
export interface Scenario {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScenarioWithFeatures extends Scenario {
  features: Feature[];
}

export interface UserPreferences {
  id: string;
  user_id: string;
  favorite_scenarios: string[];
  favorite_features: string[];
  feature_usage_count: Record<string, number>;
  last_used_scenario?: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface FeatureExecutionRequest {
  session_id: string;
  image_id: string;
  feature_id: string;
  scenario_id?: string;
  custom_prompt?: string;
  second_image_id?: string;
  mask_data?: string;
  user_id?: string;
}