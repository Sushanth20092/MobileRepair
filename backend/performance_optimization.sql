-- Performance optimization script for RepairHub database
-- Add indexes to improve query performance

-- Index for cities table (used in homepage)
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- Index for notifications table (used in homepage)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;

-- Index for profiles table (used in auth context)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Index for bookings table (if used in homepage)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Index for agent_applications table (if used in homepage)
CREATE INDEX IF NOT EXISTS idx_agent_applications_user_id ON agent_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_applications_status ON agent_applications(status);
CREATE INDEX IF NOT EXISTS idx_agent_applications_created_at ON agent_applications(created_at DESC);

-- Analyze tables to update statistics
ANALYZE cities;
ANALYZE notifications;
ANALYZE profiles;
ANALYZE bookings;
ANALYZE agent_applications;

-- Show index usage statistics (for monitoring)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC; 