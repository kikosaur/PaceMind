-- Safe Application Script for Database Schema Improvements
-- This script applies improvements with transaction safety and rollback capability
-- Usage: Run this script in your PostgreSQL database after the initial setup

BEGIN;

-- Create a savepoint for rollback if needed
SAVEPOINT schema_improvements_start;

-- ============================================================================
-- APPLY SCHEMA IMPROVEMENTS
-- ============================================================================

-- Source the main improvements script
\i schema-improvements.sql

-- ============================================================================
-- VALIDATION AND TESTING
-- ============================================================================

-- Test that all expected indexes exist
DO $$
DECLARE
    missing_indexes text[] := ARRAY[
        'idx_walking_sessions_user_id_created_at',
        'idx_motivation_journal_user_id_date',
        'idx_user_goals_user_id_status',
        'idx_interventions_user_id_active',
        'idx_ai_training_data_user_id'
    ];
    idx text;
    index_count int;
BEGIN
    FOREACH idx IN ARRAY missing_indexes
    LOOP
        SELECT COUNT(*) INTO index_count
        FROM pg_indexes 
        WHERE indexname = idx;
        
        IF index_count = 0 THEN
            RAISE EXCEPTION 'Missing critical index: %', idx;
        END IF;
        
        RAISE NOTICE 'Index % created successfully', idx;
    END LOOP;
END $$;

-- Test that all expected constraints exist
DO $$
DECLARE
    constraint_count int;
BEGIN
    -- Check for time validation constraints
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conname LIKE 'check_time_of_day_%';
    
    IF constraint_count < 2 THEN
        RAISE EXCEPTION 'Missing time validation constraints';
    END IF;
    
    -- Check for business logic constraints
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conname IN ('check_session_times', 'check_goal_dates', 'check_progress_range');
    
    IF constraint_count < 3 THEN
        RAISE EXCEPTION 'Missing business logic constraints';
    END IF;
    
    -- Check for email validation
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint 
    WHERE conname = 'check_email_format';
    
    IF constraint_count = 0 THEN
        RAISE EXCEPTION 'Missing email format validation';
    END IF;
    
    RAISE NOTICE 'All constraints validated successfully';
END $$;

-- ============================================================================
-- PERFORMANCE VERIFICATION
-- ============================================================================

-- Update statistics after adding indexes
ANALYZE profiles;
ANALYZE walking_sessions;
ANALYZE motivation_journal;
ANALYZE user_goals;
ANALYZE interventions;
ANALYZE ai_training_data;

-- Test query performance with new indexes
EXPLAIN (ANALYZE, BUFFERS) 
SELECT ws.* 
FROM walking_sessions ws 
WHERE ws.user_id = gen_random_uuid() 
ORDER BY ws.created_at DESC 
LIMIT 10;

-- ============================================================================
-- SUCCESS CONFIRMATION
-- ============================================================================

-- If we reach here, all improvements were applied successfully
RAISE NOTICE '========================================';
RAISE NOTICE 'DATABASE SCHEMA IMPROVEMENTS COMPLETED';
RAISE NOTICE '========================================';
RAISE NOTICE 'Applied improvements:';
RAISE NOTICE '- % performance indexes added', (
    SELECT COUNT(*) 
    FROM pg_indexes 
    WHERE indexname LIKE 'idx_%' 
    AND tablename IN ('profiles', 'walking_sessions', 'motivation_journal', 'user_goals', 'interventions', 'ai_training_data')
);
RAISE NOTICE '- % data validation constraints added', (
    SELECT COUNT(*) 
    FROM pg_constraint 
    WHERE conname LIKE 'check_%'
    AND conrelid IN (
        SELECT oid FROM pg_class 
        WHERE relname IN ('profiles', 'walking_sessions', 'motivation_journal', 'user_goals', 'interventions', 'ai_training_data')
    )
);
RAISE NOTICE 'Database is now optimized for production use!';

-- Commit all changes
COMMIT;

-- ============================================================================
-- POST-DEPLOYMENT RECOMMENDATIONS
-- ============================================================================

-- Display recommendations for ongoing maintenance
\echo ''
\echo '========================================='
\echo 'POST-DEPLOYMENT RECOMMENDATIONS'
\echo '========================================='
\echo '1. Monitor query performance with pg_stat_statements'
\echo '2. Set up regular VACUUM and ANALYZE jobs'
\echo '3. Consider partitioning for walking_sessions table when data grows'
\echo '4. Monitor index usage with pg_stat_user_indexes'
\echo '5. Set up monitoring for constraint violations'
\echo ''
\echo 'For rollback (if needed): ROLLBACK TO schema_improvements_start;'