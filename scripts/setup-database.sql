-- Supabase Database Setup Script for Walking Fitness App
-- Run this script in your Supabase SQL Editor

-- 1. User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- User preferences
  preferred_walk_duration INTEGER DEFAULT 30, -- minutes
  daily_step_goal INTEGER DEFAULT 8000,
  notification_enabled BOOLEAN DEFAULT true,
  biometric_enabled BOOLEAN DEFAULT false,
  
  -- User stats
  total_walks INTEGER DEFAULT 0,
  total_distance DECIMAL DEFAULT 0, -- in kilometers
  total_steps INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Walking Sessions Table
CREATE TABLE IF NOT EXISTS walking_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Session data
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in seconds
  steps INTEGER DEFAULT 0,
  distance DECIMAL DEFAULT 0, -- in kilometers
  average_pace DECIMAL, -- minutes per kilometer
  calories_burned INTEGER,
  
  -- Route data
  route_coordinates JSONB, -- Array of {lat, lng, timestamp}
  start_location JSONB, -- {lat, lng, address}
  end_location JSONB, -- {lat, lng, address}
  
  -- Session status
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  
  -- Weather context
  weather_condition TEXT,
  temperature DECIMAL,
  humidity INTEGER,
  
  -- Motivation data
  pre_walk_mood INTEGER CHECK (pre_walk_mood >= 1 AND pre_walk_mood <= 5),
  post_walk_mood INTEGER CHECK (post_walk_mood >= 1 AND post_walk_mood <= 5),
  motivation_level INTEGER CHECK (motivation_level >= 1 AND motivation_level <= 5),
  
  -- AI predictions
  predicted_motivation DECIMAL, -- AI model output (0-1)
  intervention_applied TEXT, -- Type of intervention used
  intervention_effective BOOLEAN -- User feedback on intervention
);

-- Enable RLS
ALTER TABLE walking_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for walking_sessions
CREATE POLICY "Users can manage own walking sessions" ON walking_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 3. Motivation Journal Table
CREATE TABLE IF NOT EXISTS motivation_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Journal entry
  date DATE NOT NULL,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  motivation_level INTEGER CHECK (motivation_level >= 1 AND motivation_level <= 5),
  
  -- Context
  weather_rating INTEGER CHECK (weather_rating >= 1 AND weather_rating <= 5),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  
  -- Notes
  notes TEXT,
  goals_for_day TEXT,
  
  -- Achievements
  walked_today BOOLEAN DEFAULT false,
  met_step_goal BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE motivation_journal ENABLE ROW LEVEL SECURITY;

-- Policies for motivation_journal
CREATE POLICY "Users can manage own journal entries" ON motivation_journal
  FOR ALL USING (auth.uid() = user_id);

-- 4. User Goals Table
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Goal details
  type TEXT CHECK (type IN ('daily_steps', 'weekly_walks', 'monthly_distance', 'streak', 'weight_loss', 'custom')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value DECIMAL NOT NULL,
  current_value DECIMAL DEFAULT 0,
  unit TEXT, -- 'steps', 'walks', 'km', 'days', 'kg'
  
  -- Timeline
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  
  -- Status
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Progress tracking
  progress_percentage DECIMAL DEFAULT 0,
  milestones JSONB -- Array of milestone objects
);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

-- Policies for user_goals
CREATE POLICY "Users can manage own goals" ON user_goals
  FOR ALL USING (auth.uid() = user_id);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_walking_sessions_user_start_time ON walking_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_motivation_journal_user_date ON motivation_journal(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_status ON user_goals(user_id, status);

-- 6. Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goals_updated_at BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database setup completed successfully!' as message;