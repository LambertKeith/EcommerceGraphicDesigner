-- Migration: Enhance jobs table with advanced status tracking
-- Adds new fields for retry mechanism, AI model tracking, and enhanced status management

-- Add new columns to jobs table
ALTER TABLE jobs 
ADD COLUMN attempts INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN last_error TEXT,
ADD COLUMN model_used VARCHAR(50),
ADD COLUMN started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status check constraint to include new states
ALTER TABLE jobs 
DROP CONSTRAINT IF EXISTS jobs_status_check,
ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('pending', 'queued', 'running', 'done', 'error', 'failed'));

-- Add index on model_used for analytics
CREATE INDEX idx_jobs_model_used ON jobs(model_used);

-- Add index on attempts for retry monitoring
CREATE INDEX idx_jobs_attempts ON jobs(attempts);

-- Add compound index for job recovery (status + started_at)
CREATE INDEX idx_jobs_recovery ON jobs(status, started_at) WHERE status = 'running';

-- Create function to handle job timeout recovery
CREATE OR REPLACE FUNCTION recover_stalled_jobs()
RETURNS INTEGER AS $$
DECLARE
    recovered_count INTEGER;
BEGIN
    -- Mark jobs that have been running for more than 10 minutes as queued for retry
    WITH stalled_jobs AS (
        UPDATE jobs 
        SET status = 'queued',
            attempts = attempts + 1,
            last_error = 'Job timeout - recovered for retry',
            started_at = NULL
        WHERE status = 'running' 
          AND started_at < NOW() - INTERVAL '10 minutes'
          AND attempts < 3  -- Max 3 attempts
        RETURNING id
    )
    SELECT COUNT(*) INTO recovered_count FROM stalled_jobs;
    
    -- Mark jobs that have exceeded max attempts as failed
    UPDATE jobs 
    SET status = 'failed',
        last_error = 'Maximum retry attempts exceeded',
        finished_at = NOW()
    WHERE status = 'running' 
      AND started_at < NOW() - INTERVAL '10 minutes'
      AND attempts >= 3;
    
    RETURN recovered_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle job state transitions
CREATE OR REPLACE FUNCTION transition_job_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Set started_at when job transitions to running
    IF OLD.status != 'running' AND NEW.status = 'running' THEN
        NEW.started_at = NOW();
    END IF;
    
    -- Set finished_at when job is completed or failed
    IF OLD.status IN ('pending', 'queued', 'running') AND NEW.status IN ('done', 'error', 'failed') THEN
        NEW.finished_at = NOW();
    END IF;
    
    -- Set queued_at when job transitions to queued
    IF OLD.status != 'queued' AND NEW.status = 'queued' THEN
        NEW.queued_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for job status transitions
CREATE TRIGGER trigger_job_status_transition
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION transition_job_status();

-- Update existing jobs to set default values
UPDATE jobs SET 
    queued_at = created_at,
    model_used = 'gemini'  -- Set default model for existing jobs
WHERE queued_at IS NULL;