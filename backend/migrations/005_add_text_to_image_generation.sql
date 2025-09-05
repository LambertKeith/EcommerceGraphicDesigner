-- Migration: Add text-to-image generation support
-- This migration adds support for text-to-image generation functionality

-- Create generate_jobs table for tracking text-to-image generation tasks
CREATE TABLE IF NOT EXISTS generate_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    style VARCHAR(50),
    size VARCHAR(20) DEFAULT '1024x1024',
    model_used VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'running', 'done', 'error', 'failed')),
    result_image_id UUID REFERENCES images(id) ON DELETE SET NULL,
    error_msg TEXT,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    started_at TIMESTAMP,
    queued_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    metadata_json JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generate_jobs_project_id ON generate_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_generate_jobs_session_id ON generate_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_generate_jobs_status ON generate_jobs(status);
CREATE INDEX IF NOT EXISTS idx_generate_jobs_created_at ON generate_jobs(created_at);

-- Add generation-related fields to images table
ALTER TABLE images 
ADD COLUMN IF NOT EXISTS generation_source VARCHAR(20) DEFAULT 'upload' CHECK (generation_source IN ('upload', 'edit', 'generate'));

ALTER TABLE images 
ADD COLUMN IF NOT EXISTS generation_prompt TEXT;

ALTER TABLE images 
ADD COLUMN IF NOT EXISTS generation_style VARCHAR(50);

-- Add index for generation queries
CREATE INDEX IF NOT EXISTS idx_images_generation_source ON images(generation_source);

-- Add comments for documentation
COMMENT ON TABLE generate_jobs IS 'Tracks text-to-image generation jobs and their status';
COMMENT ON COLUMN generate_jobs.prompt IS 'The text prompt used for image generation';
COMMENT ON COLUMN generate_jobs.style IS 'Style preset applied to the generation (e.g., commercial, artistic, minimal)';
COMMENT ON COLUMN generate_jobs.size IS 'Target image dimensions (e.g., 1024x1024, 1920x1920)';
COMMENT ON COLUMN generate_jobs.model_used IS 'AI model used for generation (gemini, chatgpt, sora)';
COMMENT ON COLUMN generate_jobs.attempts IS 'Number of generation attempts made';
COMMENT ON COLUMN generate_jobs.metadata_json IS 'Additional generation parameters and metadata';

COMMENT ON COLUMN images.generation_source IS 'Source of image: upload (user uploaded), edit (processed from existing), generate (text-to-image)';
COMMENT ON COLUMN images.generation_prompt IS 'Original text prompt if image was generated';
COMMENT ON COLUMN images.generation_style IS 'Style preset used during generation';

-- Insert initial style presets data (optional)
-- This could be used for a styles lookup table in the future
-- CREATE TABLE IF NOT EXISTS generation_styles (
--     id VARCHAR(50) PRIMARY KEY,
--     name VARCHAR(100) NOT NULL,
--     description TEXT,
--     prompt_template TEXT,
--     is_active BOOLEAN DEFAULT TRUE
-- );