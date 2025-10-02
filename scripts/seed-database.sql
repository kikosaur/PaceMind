-- Sample Data for Walking Fitness App
-- Run this script after setting up the main database tables
-- Note: Replace the UUIDs with actual user IDs from your auth.users table

-- Sample walking sessions for testing
INSERT INTO walking_sessions (
  user_id, start_time, end_time, duration, steps, distance, average_pace, calories_burned,
  route_coordinates, start_location, end_location, status, weather_condition, temperature, humidity,
  pre_walk_mood, post_walk_mood, motivation_level, predicted_motivation, intervention_applied
) VALUES 
-- Recent successful walk
(
  auth.uid(), -- This will use the current authenticated user
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour 15 minutes',
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
),
-- Yesterday's walk
(
  auth.uid(),
  NOW() - INTERVAL '1 day 3 hours',
  NOW() - INTERVAL '1 day 2 hours 30 minutes',
  1800, -- 30 minutes
  3200,
  2.8,
  10.7,
  180,
  '[]',
  '{}',
  '{}',
  'completed',
  'cloudy',
  15.2,
  60,
  2, -- low mood before
  3, -- improved mood after
  3, -- moderate motivation
  0.65,
  'shorter_walk'
);

-- Sample motivation journal entries
INSERT INTO motivation_journal (
  user_id, date, mood_rating, energy_level, motivation_level,
  weather_rating, sleep_quality, stress_level, notes, goals_for_day,
  walked_today, met_step_goal
) VALUES 
(
  auth.uid(),
  CURRENT_DATE,
  4, -- good mood
  4, -- high energy
  4, -- high motivation
  5, -- excellent weather
  4, -- good sleep
  2, -- low stress
  'Feeling great today! The weather is perfect for walking.',
  'Walk for 45 minutes and enjoy the sunshine',
  true,
  true
),
(
  auth.uid(),
  CURRENT_DATE - INTERVAL '1 day',
  3, -- moderate mood
  3, -- moderate energy
  3, -- moderate motivation
  3, -- okay weather
  3, -- okay sleep
  3, -- moderate stress
  'Had a busy day at work but managed to get a walk in.',
  'At least 30 minutes of walking',
  true,
  false
),
(
  auth.uid(),
  CURRENT_DATE - INTERVAL '2 days',
  2, -- low mood
  2, -- low energy
  2, -- low motivation
  2, -- poor weather
  2, -- poor sleep
  4, -- high stress
  'Feeling tired and unmotivated. Rainy day did not help.',
  'Try to walk even if just for 15 minutes',
  false,
  false
);

-- Sample user goals
INSERT INTO user_goals (
  user_id, type, title, description, target_value, current_value, unit,
  start_date, target_date, status, progress_percentage
) VALUES 
(
  auth.uid(),
  'daily_steps',
  '10,000 Steps Daily',
  'Reach 10,000 steps every day for better health',
  10000,
  7500,
  'steps',
  CURRENT_DATE - INTERVAL '7 days',
  CURRENT_DATE + INTERVAL '23 days',
  'active',
  75.0
),
(
  auth.uid(),
  'weekly_walks',
  'Walk 5 Times Per Week',
  'Build a consistent walking habit by walking at least 5 times each week',
  5,
  3,
  'walks',
  CURRENT_DATE - INTERVAL '14 days',
  CURRENT_DATE + INTERVAL '46 days',
  'active',
  60.0
),
(
  auth.uid(),
  'monthly_distance',
  'Walk 100km This Month',
  'Challenge myself to walk a total of 100 kilometers this month',
  100,
  45.6,
  'km',
  DATE_TRUNC('month', CURRENT_DATE),
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
  'active',
  45.6
);

-- Success message
SELECT 'Sample data inserted successfully!' as message;