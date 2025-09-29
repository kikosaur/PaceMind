# Supabase Database Setup - Walking Fitness App

This document provides the complete database schema, setup instructions, and mock data for the walking fitness app with AI-powered motivation detection.

## Database Schema

### 1. Authentication (Built-in Supabase Auth)
Supabase handles user authentication automatically. The `auth.users` table is managed by Supabase.

### 2. User Profiles Table
```sql
CREATE TABLE profiles (
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

-- Policy: Users can only see and edit their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
```

### 3. Walking Sessions Table
```sql
CREATE TABLE walking_sessions (
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

-- Policy: Users can only access their own sessions
CREATE POLICY "Users can manage own walking sessions" ON walking_sessions
  FOR ALL USING (auth.uid() = user_id);
```

### 4. Motivation Journal Table
```sql
CREATE TABLE motivation_journal (
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

-- Policy: Users can only access their own journal entries
CREATE POLICY "Users can manage own journal entries" ON motivation_journal
  FOR ALL USING (auth.uid() = user_id);
```

### 5. AI Training Data Table
```sql
CREATE TABLE ai_training_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Features for AI model
  time_of_day INTEGER, -- Hour of day (0-23)
  day_of_week INTEGER, -- Day of week (0-6)
  weather_condition TEXT,
  temperature DECIMAL,
  humidity INTEGER,
  
  -- User context
  days_since_last_walk INTEGER,
  current_streak INTEGER,
  average_mood_last_week DECIMAL,
  sleep_quality_last_night INTEGER,
  stress_level INTEGER,
  
  -- Historical patterns
  walks_this_week INTEGER,
  walks_same_time_last_week INTEGER,
  success_rate_last_month DECIMAL,
  
  -- Target variable
  actually_walked BOOLEAN NOT NULL,
  session_id UUID REFERENCES walking_sessions(id),
  
  -- Model predictions (filled after training)
  predicted_motivation DECIMAL,
  model_version TEXT
);

-- Enable RLS
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own training data
CREATE POLICY "Users can view own training data" ON ai_training_data
  FOR SELECT USING (auth.uid() = user_id);
```

### 6. Interventions Table
```sql
CREATE TABLE interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Intervention details
  type TEXT CHECK (type IN ('shorter_walk', 'mindful_prompt', 'progress_reminder', 'weather_encouragement', 'social_motivation', 'reward_system')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Targeting
  motivation_threshold DECIMAL, -- Show when predicted motivation is below this
  time_of_day_start INTEGER, -- Hour to start showing (0-23)
  time_of_day_end INTEGER, -- Hour to stop showing (0-23)
  weather_conditions TEXT[], -- Array of weather conditions
  
  -- Effectiveness tracking
  times_shown INTEGER DEFAULT 0,
  times_accepted INTEGER DEFAULT 0,
  times_dismissed INTEGER DEFAULT 0,
  effectiveness_score DECIMAL DEFAULT 0,
  
  -- Status
  active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own interventions
CREATE POLICY "Users can manage own interventions" ON interventions
  FOR ALL USING (auth.uid() = user_id);
```

### 7. User Goals Table
```sql
CREATE TABLE user_goals (
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

-- Policy: Users can only access their own goals
CREATE POLICY "Users can manage own goals" ON user_goals
  FOR ALL USING (auth.uid() = user_id);
```

## Setup Instructions

### 1. Create a New Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization and enter project details
4. Wait for the project to be set up

### 2. Run the SQL Schema
1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste each table creation script above
3. Run them in order

### 3. Set up Authentication
1. Go to Authentication > Settings
2. Configure your site URL (for development: `exp://192.168.1.xxx:8081`)
3. Enable email confirmation if desired
4. Set up email templates

### 4. Configure Row Level Security (RLS)
All tables have RLS enabled with policies that ensure users can only access their own data.

### 5. Environment Variables
Add these to your `.env.local` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Mock Data

### Sample Users
```sql
-- Note: These will be created through the app's signup process
-- The following are example profiles that would be created

-- User 1: Active Walker
INSERT INTO profiles (id, email, full_name, preferred_walk_duration, daily_step_goal, total_walks, total_distance, total_steps, current_streak, longest_streak)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'sarah.walker@example.com',
  'Sarah Walker',
  45,
  10000,
  127,
  234.5,
  1250000,
  12,
  28
);

-- User 2: Beginner
INSERT INTO profiles (id, email, full_name, preferred_walk_duration, daily_step_goal, total_walks, total_distance, total_steps, current_streak, longest_streak)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'mike.beginner@example.com',
  'Mike Johnson',
  20,
  5000,
  23,
  34.2,
  180000,
  3,
  7
);

-- User 3: Inconsistent Walker
INSERT INTO profiles (id, email, full_name, preferred_walk_duration, daily_step_goal, total_walks, total_distance, total_steps, current_streak, longest_streak)
VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  'emma.inconsistent@example.com',
  'Emma Davis',
  30,
  8000,
  45,
  67.8,
  420000,
  0,
  14
);
```

### Sample Walking Sessions
```sql
-- Recent successful walk for Sarah
INSERT INTO walking_sessions (
  user_id, start_time, end_time, duration, steps, distance, average_pace, calories_burned,
  route_coordinates, start_location, end_location, status, weather_condition, temperature, humidity,
  pre_walk_mood, post_walk_mood, motivation_level, predicted_motivation, intervention_applied
) VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  '2024-01-15 07:30:00+00',
  '2024-01-15 08:15:00+00',
  2700, -- 45 minutes
  5420,
  4.2,
  10.7, -- minutes per km
  280,
  '[{"lat": 40.7128, "lng": -74.0060, "timestamp": "2024-01-15T07:30:00Z"}, {"lat": 40.7138, "lng": -74.0070, "timestamp": "2024-01-15T07:35:00Z"}]',
  '{"lat": 40.7128, "lng": -74.0060, "address": "Central Park, New York"}',
  '{"lat": 40.7148, "lng": -74.0080, "address": "Central Park Loop, New York"}',
  'completed',
  'sunny',
  18.5,
  45,
  3, -- moderate mood before
  4, -- good mood after
  4, -- high motivation
  0.85,
  'none'
);

-- Skipped session for Emma (low motivation)
INSERT INTO walking_sessions (
  user_id, start_time, end_time, duration, steps, distance, status, weather_condition, temperature, humidity,
  pre_walk_mood, motivation_level, predicted_motivation, intervention_applied, intervention_effective
) VALUES (
  '550e8400-e29b-41d4-a716-446655440003',
  '2024-01-15 18:00:00+00',
  '2024-01-15 18:05:00+00',
  300, -- 5 minutes before giving up
  0,
  0,
  'cancelled',
  'rainy',
  8.2,
  85,
  2, -- low mood
  2, -- low motivation
  0.25,
  'shorter_walk',
  false -- intervention didn't work
);

-- Successful intervention for Mike
INSERT INTO walking_sessions (
  user_id, start_time, end_time, duration, steps, distance, average_pace, calories_burned,
  status, weather_condition, temperature, humidity,
  pre_walk_mood, post_walk_mood, motivation_level, predicted_motivation, intervention_applied, intervention_effective
) VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  '2024-01-15 12:00:00+00',
  '2024-01-15 12:20:00+00',
  1200, -- 20 minutes
  2100,
  1.8,
  11.1,
  120,
  'completed',
  'cloudy',
  15.0,
  60,
  2, -- low mood before
  3, -- improved mood after
  3, -- moderate motivation
  0.35,
  'mindful_prompt',
  true -- intervention worked
);
```

### Sample Motivation Journal Entries
```sql
-- Sarah's consistent entries
INSERT INTO motivation_journal (
  user_id, date, mood_rating, energy_level, motivation_level, weather_rating, sleep_quality, stress_level,
  notes, goals_for_day, walked_today, met_step_goal
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  '2024-01-15',
  4, 4, 4, 5, 4, 2,
  'Beautiful morning for a walk in Central Park. Feeling energized and ready for the day!',
  'Complete 45-minute walk, drink more water, finish project proposal',
  true,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  '2024-01-14',
  3, 3, 3, 3, 3, 3,
  'Cloudy day but managed to get out. Feeling okay, not super motivated but glad I did it.',
  'Walk for 30 minutes, meal prep for the week',
  true,
  true
);

-- Emma's inconsistent entries
INSERT INTO motivation_journal (
  user_id, date, mood_rating, energy_level, motivation_level, weather_rating, sleep_quality, stress_level,
  notes, goals_for_day, walked_today, met_step_goal
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440003',
  '2024-01-15',
  2, 2, 2, 1, 2, 4,
  'Rainy and cold. Feeling unmotivated and stressed about work. Tried to go for a walk but gave up after 5 minutes.',
  'Try to walk for at least 20 minutes, catch up on emails',
  false,
  false
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  '2024-01-13',
  4, 4, 4, 4, 4, 2,
  'Great day! Went for a long walk and felt amazing afterward. Need to do this more consistently.',
  'Walk for 45 minutes, call mom, grocery shopping',
  true,
  true
);
```

### Sample AI Training Data
```sql
INSERT INTO ai_training_data (
  user_id, time_of_day, day_of_week, weather_condition, temperature, humidity,
  days_since_last_walk, current_streak, average_mood_last_week, sleep_quality_last_night, stress_level,
  walks_this_week, walks_same_time_last_week, success_rate_last_month, actually_walked
) VALUES 
-- High motivation scenario
(
  '550e8400-e29b-41d4-a716-446655440001',
  7, -- 7 AM
  1, -- Monday
  'sunny',
  18.5,
  45,
  0, -- walked yesterday
  12, -- current streak
  3.8, -- good average mood
  4, -- good sleep
  2, -- low stress
  3, -- 3 walks this week
  2, -- 2 walks same time last week
  0.85, -- 85% success rate
  true
),
-- Low motivation scenario
(
  '550e8400-e29b-41d4-a716-446655440003',
  18, -- 6 PM
  1, -- Monday
  'rainy',
  8.2,
  85,
  2, -- 2 days since last walk
  0, -- no current streak
  2.3, -- low average mood
  2, -- poor sleep
  4, -- high stress
  1, -- only 1 walk this week
  0, -- no walks same time last week
  0.35, -- 35% success rate
  false
);
```

### Sample Interventions
```sql
INSERT INTO interventions (
  user_id, type, title, message, motivation_threshold, time_of_day_start, time_of_day_end,
  weather_conditions, times_shown, times_accepted, times_dismissed, effectiveness_score, active
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440003',
  'shorter_walk',
  'Quick 10-Minute Walk?',
  'Feeling unmotivated? How about just a quick 10-minute walk around the block? Every step counts! 🚶‍♀️',
  0.4,
  16, -- 4 PM
  20, -- 8 PM
  ARRAY['rainy', 'cloudy'],
  15,
  6,
  9,
  0.4,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'mindful_prompt',
  'Mindful Walking Break',
  'Take a moment to breathe and enjoy a peaceful walk. Focus on your surroundings and let your mind relax. 🧘‍♂️',
  0.5,
  11, -- 11 AM
  14, -- 2 PM
  ARRAY['sunny', 'cloudy'],
  8,
  5,
  3,
  0.625,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'progress_reminder',
  'You''re On Fire! 🔥',
  'Amazing! You''ve walked 12 days in a row. Keep this incredible streak going with today''s walk!',
  0.6,
  6, -- 6 AM
  10, -- 10 AM
  ARRAY['sunny', 'cloudy', 'partly_cloudy'],
  5,
  4,
  1,
  0.8,
  true
);
```

### Sample User Goals
```sql
INSERT INTO user_goals (
  user_id, type, title, description, target_value, current_value, unit,
  start_date, target_date, status, progress_percentage
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001',
  'streak',
  '30-Day Walking Streak',
  'Walk every day for 30 consecutive days',
  30,
  12,
  'days',
  '2024-01-04',
  '2024-02-03',
  'active',
  40.0
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'weekly_walks',
  'Walk 4 Times Per Week',
  'Build a consistent walking habit by walking at least 4 times each week',
  4,
  2,
  'walks',
  '2024-01-08',
  '2024-03-08',
  'active',
  50.0
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'monthly_distance',
  'Walk 50km This Month',
  'Challenge myself to walk a total of 50 kilometers in January',
  50,
  23.4,
  'km',
  '2024-01-01',
  '2024-01-31',
  'active',
  46.8
);
```

## API Integration Examples

### React Native Supabase Client Setup
```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Example Queries
```typescript
// Get user's walking sessions
const { data: sessions, error } = await supabase
  .from('walking_sessions')
  .select('*')
  .eq('user_id', user.id)
  .order('start_time', { ascending: false })
  .limit(10)

// Create a new walking session
const { data, error } = await supabase
  .from('walking_sessions')
  .insert({
    user_id: user.id,
    start_time: new Date().toISOString(),
    pre_walk_mood: 3,
    motivation_level: 4,
    weather_condition: 'sunny',
    temperature: 22.5
  })

// Get motivation journal entries for the week
const { data: journalEntries, error } = await supabase
  .from('motivation_journal')
  .select('*')
  .eq('user_id', user.id)
  .gte('date', startOfWeek)
  .lte('date', endOfWeek)
  .order('date', { ascending: true })
```

## Security Considerations

1. **Row Level Security (RLS)**: All tables have RLS enabled to ensure users can only access their own data
2. **API Keys**: Use the anon key for client-side operations; it's safe to expose
3. **Authentication**: Supabase handles secure authentication with JWT tokens
4. **Data Validation**: Use database constraints and client-side validation
5. **Privacy**: Sensitive location data should be handled carefully and potentially anonymized for AI training

## Performance Optimization

1. **Indexes**: Add indexes on frequently queried columns:
```sql
CREATE INDEX idx_walking_sessions_user_start_time ON walking_sessions(user_id, start_time DESC);
CREATE INDEX idx_motivation_journal_user_date ON motivation_journal(user_id, date DESC);
CREATE INDEX idx_ai_training_data_user_created ON ai_training_data(user_id, created_at DESC);
```

2. **Real-time Subscriptions**: Use Supabase real-time features for live updates
3. **Caching**: Implement client-side caching for frequently accessed data
4. **Pagination**: Use limit/offset or cursor-based pagination for large datasets

This setup provides a robust foundation for your walking fitness app with comprehensive user data tracking, AI training capabilities, and secure data access patterns.