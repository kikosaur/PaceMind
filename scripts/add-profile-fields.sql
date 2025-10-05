-- Add Profile Fields Migration Script
-- This script adds the missing profile fields to the profiles table
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- ADD NEW PROFILE FIELDS
-- ============================================================================

-- Add age field (integer, optional)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add weight field (decimal, optional, in kg)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2);

-- Add height field (decimal, optional, in cm)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS height DECIMAL(5,2);

-- Add fitness level field (text, optional, with enum constraint)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS fitness_level TEXT;

-- Add weight unit preference (kg or lbs)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg';

-- Add height unit preference (cm or ft)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS height_unit TEXT DEFAULT 'cm';

-- ============================================================================
-- ADD VALIDATION CONSTRAINTS
-- ============================================================================

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

-- Weight unit validation
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_weight_unit 
CHECK (weight_unit IN ('kg', 'lbs'));

-- Height unit validation
ALTER TABLE profiles 
ADD CONSTRAINT IF NOT EXISTS check_height_unit 
CHECK (height_unit IN ('cm', 'ft'));

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN profiles.age IS 'User age in years (13-120)';
COMMENT ON COLUMN profiles.weight IS 'User weight in the specified unit (30-300 kg range)';
COMMENT ON COLUMN profiles.height IS 'User height in the specified unit (100-250 cm range)';
COMMENT ON COLUMN profiles.fitness_level IS 'User fitness level: beginner, intermediate, or advanced';
COMMENT ON COLUMN profiles.weight_unit IS 'Weight unit preference: kg or lbs';
COMMENT ON COLUMN profiles.height_unit IS 'Height unit preference: cm or ft';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 
'Profile fields migration completed successfully!' as message,
'Added: age, weight, height, fitness_level, weight_unit, height_unit' as fields_added,
'All validation constraints applied' as constraints_status;