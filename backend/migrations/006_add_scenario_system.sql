-- Migration 006: Add Scenario-based System for Product Enhancement
-- This migration adds the scenario system to support scene-driven user experience

-- Create scenarios table
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create features table (storing all available features)
CREATE TABLE features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    icon VARCHAR(50),
    preview_image_url VARCHAR(500),
    use_case_tags TEXT[],
    model_preferences JSONB, -- e.g., {"preferred": ["gemini"], "fallback": ["chatgpt"]}
    processing_options JSONB, -- e.g., {"dual_image": false, "mask_required": false, "two_step": false}
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scenario_features mapping table
CREATE TABLE scenario_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(scenario_id, feature_id)
);

-- Create user_preferences table for personalization
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL, -- For now using string ID, can be extended to proper user system
    favorite_scenarios UUID[] DEFAULT '{}',
    favorite_features UUID[] DEFAULT '{}',
    feature_usage_count JSONB DEFAULT '{}', -- {"feature_id": count}
    last_used_scenario UUID REFERENCES scenarios(id),
    preferences JSONB DEFAULT '{}', -- User preferences like quality settings, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Extend sessions table with scenario context
ALTER TABLE sessions ADD COLUMN scenario_id UUID REFERENCES scenarios(id);
ALTER TABLE sessions ADD COLUMN workflow_context JSONB DEFAULT '{}';

-- Extend jobs table with scenario and feature context
ALTER TABLE jobs ADD COLUMN scenario_id UUID REFERENCES scenarios(id);
ALTER TABLE jobs ADD COLUMN feature_id UUID REFERENCES features(id);
ALTER TABLE jobs ADD COLUMN feature_context JSONB DEFAULT '{}';

-- Extend images table with scenario tags
ALTER TABLE images ADD COLUMN scenario_tags TEXT[] DEFAULT '{}';
ALTER TABLE images ADD COLUMN usage_context JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX idx_scenarios_code ON scenarios(code);
CREATE INDEX idx_scenarios_active ON scenarios(is_active, sort_order);
CREATE INDEX idx_features_code ON features(code);
CREATE INDEX idx_features_active ON features(is_active, sort_order);
CREATE INDEX idx_scenario_features_scenario ON scenario_features(scenario_id, sort_order);
CREATE INDEX idx_scenario_features_feature ON scenario_features(feature_id);
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_sessions_scenario ON sessions(scenario_id);
CREATE INDEX idx_jobs_scenario ON jobs(scenario_id);
CREATE INDEX idx_jobs_feature ON jobs(feature_id);
CREATE INDEX idx_images_scenario_tags ON images USING GIN(scenario_tags);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_scenarios_updated_at BEFORE UPDATE ON scenarios 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_features_updated_at BEFORE UPDATE ON features 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE scenarios IS 'Scenarios represent different use cases like e-commerce optimization, creative marketing, etc.';
COMMENT ON TABLE features IS 'Features are individual image processing capabilities like background removal, style transfer, etc.';
COMMENT ON TABLE scenario_features IS 'Maps which features belong to which scenarios';
COMMENT ON TABLE user_preferences IS 'Stores user preferences and usage analytics for personalization';
COMMENT ON COLUMN sessions.scenario_id IS 'The scenario context for this editing session';
COMMENT ON COLUMN sessions.workflow_context IS 'Additional workflow context like batch processing settings';
COMMENT ON COLUMN jobs.scenario_id IS 'The scenario this job belongs to';
COMMENT ON COLUMN jobs.feature_id IS 'The specific feature being applied in this job';
COMMENT ON COLUMN jobs.feature_context IS 'Feature-specific context like dual image mode, mask data, etc.';
COMMENT ON COLUMN images.scenario_tags IS 'Tags indicating which scenarios this image is suitable for';
COMMENT ON COLUMN images.usage_context IS 'Context about how this image was used or generated';