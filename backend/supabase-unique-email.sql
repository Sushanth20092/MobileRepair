-- Add UNIQUE constraint to profiles.email column
-- Run this in your Supabase SQL editor

-- First, check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_email_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        -- Add UNIQUE constraint to email column
        ALTER TABLE public.profiles 
        ADD CONSTRAINT profiles_email_key UNIQUE (email);
        
        RAISE NOTICE 'UNIQUE constraint added to profiles.email';
    ELSE
        RAISE NOTICE 'UNIQUE constraint already exists on profiles.email';
    END IF;
END $$;

-- Verify the constraint exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    tc.constraint_type
FROM 
    information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
WHERE 
    tc.table_name = 'profiles' 
    AND tc.constraint_type = 'UNIQUE'
    AND kcu.column_name = 'email'; 