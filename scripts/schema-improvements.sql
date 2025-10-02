-- Supabase Database Schema Improvements Migration Script
-- This script applies all recommended improvements optimized for Supabase
-- Run this script in your Supabase SQL Editor or via the Dashboard

-- ============================================================================
-- 1. PERFORMANCE INDEXES (Supabase Optimized)
-- ============================================================================

-- High Priority Indexes for User-Based Queries (Most Common Access Pattern)
CREATE INDEX IF NOT EXISTS idx_walking_sessions_user_id_created_at 
ON walking_sessions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_motivation_journal_user_id_date 
ON motivation_journal(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id_status 
ON user_goals(user_id, status);

CREATE INDEX IF NOT EXISTS idx_interventions_user_id_active 
ON interventions(user_id, active);

CREATE INDEX IF NOT EXISTS idx_ai_training_data_user_id 
ON ai_training_data(user_id);

-- Time-Based Query Indexes
CREATE INDEX IF NOT EXISTS idx_walking_sessions_start_time 
ON walking_sessions(start_time);

CREATE INDEX IF NOT EXISTS idx_walking_sessions_status 
ON walking_sessions(status);

CREATE INDEX IF NOT EXISTS idx_motivation_journal_date 
ON motivation_journal(date);

-- Composite Indexes for Complex Queries
CREATE INDEX IF NOT EXISTS idx_walking_sessions_user_status_time 
ON walking_sessions(user_id, status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_user_goals_user_target_date 
ON user_goals(user_id, target_date);

-- Supabase RLS Performance Indexes (for Row Level Security)
CREATE INDEX IF NOT EXISTS idx_walking_sessions_user_id_rls 
ON walking_sessions(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_motivation_journal_user_id_rls 
ON motivation_journal(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_goals_user_id_rls 
ON user_goals(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- 2. DATA TYPE IMPROVEMENTS AND CONSTRAINTS
-- ============================================================================

-- Add time validation constraints for time_of_day fields
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_time_of_day_start 
CHECK (time_of_day_start IS NULL OR (time_of_day_start >= 0 AND time_of_day_start <= 2359));

ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_time_of_day_end 
CHECK (time_of_day_end IS NULL OR (time_of_day_end >= 0 AND time_of_day_end <= 2359));

-- Add temperature range validation (Celsius)
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_temperature_range 
CHECK (temperature IS NULL OR (temperature >= -50 AND temperature <= 60));

-- Add average_pace validation (reasonable pace range in minutes per km)
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_average_pace 
CHECK (average_pace IS NULL OR (average_pace > 0 AND average_pace <= 60));

-- Add distance validation (non-negative, max 1000km for safety)
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_distance_positive 
CHECK (distance IS NULL OR (distance >= 0 AND distance <= 1000));

-- Add steps validation (non-negative, max 200k steps for safety)
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_steps_positive 
CHECK (steps IS NULL OR (steps >= 0 AND steps <= 200000));

-- Add calories validation (non-negative, max 10k calories for safety)
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_calories_positive 
CHECK (calories_burned IS NULL OR (calories_burned >= 0 AND calories_burned <= 10000));

-- Add duration validation (positive, max 24 hours in seconds)
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_duration_positive 
CHECK (duration IS NULL OR (duration > 0 AND duration <= 86400));

-- ============================================================================
-- 3. BUSINESS LOGIC CONSTRAINTS
-- ============================================================================

-- Walking sessions should have logical time constraints
ALTER TABLE walking_sessions 
ADD CONSTRAINT IF NOT EXISTS check_session_times 
CHECK (end_time IS NULL OR end_time > start_time);

-- Goals should have logical date ranges
ALTER TABLE user_goals 
ADD CONSTRAINT IF NOT EXISTS check_goal_dates 
CHECK (target_date >= start_date);

-- Progress should be between 0 and 100
ALTER TABLE user_goals 
ADD CONSTRAINT IF NOT EXISTS check_progress_range 
CHECK (progress >= 0 AND progress <= 100);

-- Target value should be positive
ALTER TABLE user_goals 
ADD CONSTRAINT IF NOT EXISTS check_target_value_positive 
CHECK (target_value > 0);

-- Current value should be non-negative
ALTER TABLE user_goals 
ADD CONSTRAINT IF NOT EXISTS check_current_value_non_negative 
CHECK (current_value >= 0);

-- ============================================================================
-- 4. SUPABASE-SPECIFIC OPTIMIZATIONS
-- ============================================================================

-- Enable Row Level Security (RLS) if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE walking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivation_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user data access
-- Users can only access their own data
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can view own walking sessions" ON walking_sessions
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own motivation journal" ON motivation_journal
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own goals" ON user_goals
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own interventions" ON interventions
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own training data" ON ai_training_data
FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 5. DATA VALIDATION ENHANCEMENTS
-- ============================================================================

-- Email format validation for profiles (Supabase auth handles this, but adding for completeness)
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Age validation (reasonable range)
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_age_range 
CHECK (age IS NULL OR (age >= 13 AND age <= 120));

-- Height validation (reasonable range in cm)
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_height_range 
CHECK (height IS NULL OR (height >= 100 AND height <= 250));

-- Weight validation (reasonable range in kg)
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_weight_range 
CHECK (weight IS NULL OR (weight >= 30 AND weight <= 300));

-- Fitness level validation
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_fitness_level 
CHECK (fitness_level IS NULL OR fitness_level IN ('beginner', 'intermediate', 'advanced'));

-- Mood rating validation (1-5 scale)
ALTER TABLE motivation_journal 
ADD CONSTRAINT IF NOT EXISTS check_mood_rating_range 
CHECK (mood_rating >= 1 AND mood_rating <= 5);

-- Energy level validation (1-5 scale)
ALTER TABLE motivation_journal 
ADD CONSTRAINT IF NOT EXISTS check_energy_level_range 
CHECK (energy_level >= 1 AND energy_level <= 5);

-- Motivation level validation (1-5 scale)
ALTER TABLE motivation_journal 
ADD CONSTRAINT IF NOT EXISTS check_motivation_level_range 
CHECK (motivation_level >= 1 AND motivation_level <= 5);

-- ============================================================================
-- 6. SUPABASE REALTIME OPTIMIZATIONS
-- ============================================================================

-- Enable realtime for tables that need live updates
ALTER PUBLICATION supabase_realtime ADD TABLE walking_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE motivation_journal;
ALTER PUBLICATION supabase_realtime ADD TABLE user_goals;

-- ============================================================================
-- 7. ADDITIONAL INDEXES FOR ANALYTICS AND REPORTING
-- ============================================================================

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_walking_sessions_created_at 
ON walking_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_user_goals_created_at 
ON user_goals(created_at);

CREATE INDEX IF NOT EXISTS idx_interventions_created_at 
ON interventions(created_at);

-- Partial indexes for active records (Supabase optimized)
CREATE INDEX IF NOT EXISTS idx_user_goals_active 
ON user_goals(user_id, created_at) 
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_interventions_active 
ON interventions(user_id, created_at) 
WHERE active = true;

-- JSONB indexes for route and location data
CREATE INDEX IF NOT EXISTS idx_walking_sessions_route_gin 
ON walking_sessions USING GIN (route);

CREATE INDEX IF NOT EXISTS idx_walking_sessions_location_gin 
ON walking_sessions USING GIN (location);

-- ============================================================================
-- 8. SUPABASE FUNCTIONS FOR COMMON QUERIES
-- ============================================================================

-- Function to get user's recent walks with stats
CREATE OR REPLACE FUNCTION get_user_recent_walks(user_uuid uuid, limit_count int DEFAULT 10)
RETURNS TABLE (
    id uuid,
    start_time timestamptz,
    end_time timestamptz,
    duration int,
    distance numeric,
    steps int,
    calories_burned int,
    average_pace numeric
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        ws.id,
        ws.start_time,
        ws.end_time,
        ws.duration,
        ws.distance,
        ws.steps,
        ws.calories_burned,
        ws.average_pace
    FROM walking_sessions ws
    WHERE ws.user_id = user_uuid
    AND ws.status = 'completed'
    ORDER BY ws.created_at DESC
    LIMIT limit_count;
$$;

-- Function to get user's goal progress
CREATE OR REPLACE FUNCTION get_user_goal_progress(user_uuid uuid)
RETURNS TABLE (
    goal_type text,
    target_value numeric,
    current_value numeric,
    progress numeric,
    target_date date
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        ug.goal_type,
        ug.target_value,
        ug.current_value,
        ug.progress,
        ug.target_date
    FROM user_goals ug
    WHERE ug.user_id = user_uuid
    AND ug.status = 'active'
    ORDER BY ug.target_date ASC;
$$;

-- ============================================================================
-- 9. PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Update table statistics for better query planning
ANALYZE profiles;
ANALYZE walking_sessions;
ANALYZE motivation_journal;
ANALYZE user_goals;
ANALYZE interventions;
ANALYZE ai_training_data;

-- ============================================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================================================

-- Add helpful comments to tables and important columns
COMMENT ON TABLE profiles IS 'User profile information and preferences - Supabase Auth integrated';
COMMENT ON TABLE walking_sessions IS 'Individual walking session records with GPS tracking data';
COMMENT ON TABLE motivation_journal IS 'Daily mood and motivation tracking entries';
COMMENT ON TABLE user_goals IS 'Personal fitness goals and progress tracking';
COMMENT ON TABLE interventions IS 'AI-driven motivational prompts and interventions';
COMMENT ON TABLE ai_training_data IS 'Training data for machine learning models';

-- Add comments to important columns
COMMENT ON COLUMN walking_sessions.route IS 'JSONB containing GPS coordinates and route data';
COMMENT ON COLUMN walking_sessions.location IS 'JSONB containing location metadata (address, landmarks, etc.)';
COMMENT ON COLUMN user_goals.milestones IS 'JSONB containing intermediate goal checkpoints';
COMMENT ON COLUMN interventions.content IS 'JSONB containing intervention message and metadata';