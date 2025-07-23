-- Fix profiles table structure
-- This migration fixes the profiles table to match the corrected schema

-- First, drop the existing profiles table if it exists (this will also drop the trigger)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate the profiles table with the correct structure
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text UNIQUE NOT NULL,
  role text CHECK (role IN ('user', 'agent', 'admin')) DEFAULT 'user',
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  addresses jsonb DEFAULT '[]',
  city_id uuid REFERENCES cities(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate the trigger
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call the function after a new user is created
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Add RLS policy
CREATE POLICY "Users can view their profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id); 