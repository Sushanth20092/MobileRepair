-- Supabase trigger function to automatically create profile after user email confirmation
-- Run this in your Supabase SQL editor

-- Drop previous trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_name text;
  user_phone text;
  user_role text;
  user_city_id uuid;
  user_city_id_text text;
  existing_email text;
BEGIN
  -- Log the trigger execution
  RAISE LOG 'Trigger handle_new_user called for user: %', NEW.id;
  
  -- Check if user metadata exists
  IF NEW.raw_user_meta_data IS NULL THEN
    RAISE LOG 'No user metadata found for user: %', NEW.id;
    RETURN NEW;
  END IF;
  
  -- Extract metadata with defaults
  user_name := COALESCE(NEW.raw_user_meta_data->>'name', '');
  user_phone := COALESCE(NEW.raw_user_meta_data->>'phone', '');
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  user_city_id := NULL;
  
  -- Check if email already exists in profiles table
  SELECT email INTO existing_email FROM public.profiles WHERE email = NEW.email LIMIT 1;
  
  IF existing_email IS NOT NULL THEN
    RAISE LOG 'Email % already exists in profiles table for user: %', NEW.email, NEW.id;
    RETURN NEW;
  END IF;
  
  -- Try to parse city_id, but don't fail if it's invalid
  user_city_id_text := NEW.raw_user_meta_data->>'city_id';
  RAISE NOTICE 'Raw city_id value for user %: %', NEW.id, user_city_id_text;
  
  IF user_city_id_text IS NOT NULL AND user_city_id_text ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
    -- Try to cast to UUID and check if it exists in cities
    BEGIN
      IF EXISTS(SELECT 1 FROM public.cities WHERE id = user_city_id_text::uuid) THEN
        user_city_id := user_city_id_text::uuid;
      ELSE
        RAISE NOTICE 'city_id for user % is not found in cities table: %', NEW.id, user_city_id_text;
        user_city_id := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'city_id for user % could not be cast to UUID: %', NEW.id, user_city_id_text;
      user_city_id := NULL;
    END;
  ELSE
    RAISE NOTICE 'city_id for user % is not a valid UUID: %', NEW.id, user_city_id_text;
    user_city_id := NULL;
  END IF;
  
  -- Insert into profiles table with proper error handling
  BEGIN
    INSERT INTO public.profiles (
      id, 
      name, 
      email, 
      phone, 
      role, 
      is_verified, 
      is_active, 
      addresses, 
      city_id, 
      created_at, 
      updated_at
    ) VALUES (
      NEW.id,
      user_name,
      NEW.email,
      user_phone,
      user_role,
      false, -- is_verified: always false on registration!
      true,  -- is_active
      '[]'::jsonb, -- addresses
      user_city_id,
      NOW(), -- created_at
      NOW()  -- updated_at
    );
    
    RAISE LOG 'Profile created successfully for user: %', NEW.id;
  EXCEPTION WHEN unique_violation THEN
    RAISE LOG 'Unique constraint violation for user %: %', NEW.id, SQLERRM;
  WHEN OTHERS THEN
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function after a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 