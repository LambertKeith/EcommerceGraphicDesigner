-- Migration: Add API configurations management
-- Enables database-based API key and configuration management for AI models

-- API Configurations table
CREATE TABLE api_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Configuration metadata
    name VARCHAR(100) NOT NULL UNIQUE, -- 'main', 'backup', etc.
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    
    -- API credentials (encrypted)
    api_key_encrypted TEXT NOT NULL, -- AES encrypted API key
    base_url VARCHAR(500) NOT NULL DEFAULT 'https://api.laozhang.ai/v1/chat/completions',
    
    -- Model configurations
    gemini_model VARCHAR(100) DEFAULT 'gemini-2.5-flash-image-preview',
    chatgpt_model VARCHAR(100) DEFAULT 'gpt-4o-image-vip',
    sora_model VARCHAR(100) DEFAULT 'sora_image',
    
    -- Model availability flags
    gemini_enabled BOOLEAN DEFAULT true,
    chatgpt_enabled BOOLEAN DEFAULT true,
    sora_enabled BOOLEAN DEFAULT true,
    
    -- Additional configuration
    config_json JSONB DEFAULT '{}', -- For future extensibility
    
    -- Tracking
    last_tested_at TIMESTAMP WITH TIME ZONE,
    test_results_json JSONB DEFAULT '{}', -- Store test results for each model
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system'
);

-- Ensure only one active configuration at a time
CREATE UNIQUE INDEX idx_api_configs_active ON api_configurations(is_active) 
WHERE is_active = true;

-- Indexes for performance
CREATE INDEX idx_api_configs_name ON api_configurations(name);
CREATE INDEX idx_api_configs_updated ON api_configurations(updated_at);

-- Configuration change history table
CREATE TABLE api_configuration_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES api_configurations(id) ON DELETE CASCADE,
    
    -- Change details
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'activated', 'deactivated', 'tested')),
    changes_json JSONB DEFAULT '{}', -- What changed
    
    -- Context
    performed_by VARCHAR(255) DEFAULT 'system',
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for history queries
CREATE INDEX idx_config_history_config_id ON api_configuration_history(config_id);
CREATE INDEX idx_config_history_created ON api_configuration_history(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_api_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating timestamp
CREATE TRIGGER trigger_api_config_updated
BEFORE UPDATE ON api_configurations
FOR EACH ROW
EXECUTE FUNCTION update_api_config_timestamp();

-- Function to log configuration changes
CREATE OR REPLACE FUNCTION log_api_config_change()
RETURNS TRIGGER AS $$
DECLARE
    changes JSONB := '{}';
    action_type VARCHAR(50);
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'created';
        changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if activation status changed
        IF OLD.is_active != NEW.is_active THEN
            action_type := CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END;
        ELSE
            action_type := 'updated';
        END IF;
        
        -- Record what changed (excluding encrypted fields for security)
        changes := jsonb_build_object(
            'old', jsonb_build_object(
                'name', OLD.name,
                'base_url', OLD.base_url,
                'gemini_model', OLD.gemini_model,
                'chatgpt_model', OLD.chatgpt_model,
                'sora_model', OLD.sora_model,
                'gemini_enabled', OLD.gemini_enabled,
                'chatgpt_enabled', OLD.chatgpt_enabled,
                'sora_enabled', OLD.sora_enabled,
                'is_active', OLD.is_active
            ),
            'new', jsonb_build_object(
                'name', NEW.name,
                'base_url', NEW.base_url,
                'gemini_model', NEW.gemini_model,
                'chatgpt_model', NEW.chatgpt_model,
                'sora_model', NEW.sora_model,
                'gemini_enabled', NEW.gemini_enabled,
                'chatgpt_enabled', NEW.chatgpt_enabled,
                'sora_enabled', NEW.sora_enabled,
                'is_active', NEW.is_active
            )
        );
    END IF;
    
    -- Insert history record
    INSERT INTO api_configuration_history (
        config_id, action, changes_json, performed_by
    ) VALUES (
        COALESCE(NEW.id, OLD.id), 
        action_type, 
        changes, 
        COALESCE(NEW.created_by, OLD.created_by, 'system')
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for logging changes
CREATE TRIGGER trigger_api_config_history
AFTER INSERT OR UPDATE ON api_configurations
FOR EACH ROW
EXECUTE FUNCTION log_api_config_change();

-- Function to ensure only one active configuration
CREATE OR REPLACE FUNCTION ensure_single_active_config()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a configuration as active, deactivate others
    IF NEW.is_active = true THEN
        UPDATE api_configurations 
        SET is_active = false 
        WHERE id != NEW.id AND is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single active configuration
CREATE TRIGGER trigger_single_active_config
BEFORE UPDATE ON api_configurations
FOR EACH ROW
WHEN (NEW.is_active = true)
EXECUTE FUNCTION ensure_single_active_config();

-- Create default configuration if none exists
-- This will be populated by the backend on first startup
INSERT INTO api_configurations (
    name,
    description,
    is_active,
    api_key_encrypted,
    base_url,
    gemini_model,
    chatgpt_model,
    sora_model,
    created_by
) VALUES (
    'default',
    '默认API配置 - 需要用户首次设置',
    true,
    'NEEDS_CONFIGURATION', -- Placeholder indicating needs setup
    'https://api.laozhang.ai/v1/chat/completions',
    'gemini-2.5-flash-image-preview',
    'gpt-4o-image-vip',
    'sora_image',
    'system'
) ON CONFLICT (name) DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE api_configurations IS 'Stores API configurations for AI models with encrypted API keys';
COMMENT ON COLUMN api_configurations.api_key_encrypted IS 'AES encrypted API key - never store plaintext';
COMMENT ON COLUMN api_configurations.test_results_json IS 'Stores latest connection test results for each model';
COMMENT ON TABLE api_configuration_history IS 'Audit log for all configuration changes';