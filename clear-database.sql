-- SQL script to clear all data from the database
-- Usage: psql -h localhost -U postgres -d postgres -f clear-database.sql
-- Or: PGPASSWORD=postgres psql -h localhost -U postgres -d postgres -f clear-database.sql

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all tables (order matters due to foreign keys)
TRUNCATE TABLE "task_skills" CASCADE;
TRUNCATE TABLE "task_responses" CASCADE;
TRUNCATE TABLE "tasks" CASCADE;
TRUNCATE TABLE "volunteer_skills" CASCADE;
TRUNCATE TABLE "volunteer_programs" CASCADE;
TRUNCATE TABLE "volunteers" CASCADE;
TRUNCATE TABLE "needies" CASCADE;
TRUNCATE TABLE "admins" CASCADE;
TRUNCATE TABLE "points_transactions" CASCADE;
TRUNCATE TABLE "push_subscriptions" CASCADE;
TRUNCATE TABLE "verification_codes" CASCADE;
TRUNCATE TABLE "users" CASCADE;
TRUNCATE TABLE "skills" CASCADE;
TRUNCATE TABLE "categories" CASCADE;
TRUNCATE TABLE "programs" CASCADE;
TRUNCATE TABLE "cities" CASCADE;
TRUNCATE TABLE "images" CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences (if any)
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'ALTER SEQUENCE "' || seq_record.sequence_name || '" RESTART WITH 1';
    END LOOP;
END $$;

-- Show summary
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'skills', COUNT(*) FROM skills
UNION ALL SELECT 'cities', COUNT(*) FROM cities
UNION ALL SELECT 'programs', COUNT(*) FROM programs
UNION ALL SELECT 'volunteers', COUNT(*) FROM volunteers
UNION ALL SELECT 'needies', COUNT(*) FROM needies
UNION ALL SELECT 'admins', COUNT(*) FROM admins
ORDER BY table_name;
