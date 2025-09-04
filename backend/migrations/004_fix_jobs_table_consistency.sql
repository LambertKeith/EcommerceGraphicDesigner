-- Migration: Fix jobs table data consistency issues
-- Ensures all existing data conforms to field constraints

-- Update any NULL model_used fields to have a default value
UPDATE jobs 
SET model_used = 'unknown' 
WHERE model_used IS NULL;

-- Truncate any model_used values that exceed VARCHAR(50) limit
UPDATE jobs 
SET model_used = SUBSTRING(model_used, 1, 50)
WHERE LENGTH(model_used) > 50;

-- Truncate any error_msg values that are excessively long (keep first 1000 chars)
UPDATE jobs 
SET error_msg = SUBSTRING(error_msg, 1, 1000)
WHERE LENGTH(error_msg) > 1000;

-- Truncate any last_error values that are excessively long (keep first 1000 chars)
UPDATE jobs 
SET last_error = SUBSTRING(last_error, 1, 1000)
WHERE LENGTH(last_error) > 1000;

-- Update any jobs with invalid status values
UPDATE jobs 
SET status = 'error'
WHERE status NOT IN ('pending', 'queued', 'running', 'done', 'error', 'failed');

-- Add comment for documentation
COMMENT ON TABLE jobs IS 'Jobs table with enhanced status tracking and data consistency';
COMMENT ON COLUMN jobs.model_used IS 'AI model used for processing, max 50 characters';
COMMENT ON COLUMN jobs.error_msg IS 'Error message for failed jobs, max 1000 characters for performance';
COMMENT ON COLUMN jobs.last_error IS 'Last error encountered, max 1000 characters for performance';