-- Supabase/Postgres schema for mobiletue backend
-- Users table (managed by Supabase Auth, but extra profile fields go here)
CREATE TABLE cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  state text NOT NULL,
  pincodes text[] NOT NULL,
  is_active boolean DEFAULT true,
  delivery_charges_standard float DEFAULT 50,
  delivery_charges_express float DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Updated profiles table to match MongoDB structure

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

-- Agents table
CREATE TABLE agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  shop_name text NOT NULL,
  shop_address_street text NOT NULL,
  shop_address_pincode text NOT NULL,
  id_proof text NOT NULL,
  city_id uuid REFERENCES cities(id) NOT NULL,
  specializations text[] DEFAULT '{}',
  rating_average float DEFAULT 0,
  rating_count int DEFAULT 0,
  status text CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')) DEFAULT 'pending',
  is_online boolean DEFAULT false,
  last_seen timestamptz,
  completed_jobs int DEFAULT 0,
  earnings_total float DEFAULT 0,
  earnings_pending float DEFAULT 0,
  earnings_paid float DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  email text NOT NULL,
  phone text NOT NULL,
  experience text,
  name text NOT NULL DEFAULT ''
);

-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Brands table (renamed from models)
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (name, category_id)
);

-- Devices table (updated structure)
CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES categories(id) NOT NULL,
  brand_id uuid REFERENCES brands(id) NOT NULL,
  model text NOT NULL,
  image text,
  common_faults jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (category_id, brand_id, model)
);

-- Bookings table
CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  agent_id uuid REFERENCES agents(id),
  device_id uuid REFERENCES devices(id) NOT NULL,
  faults jsonb,
  images text[] DEFAULT '{}',
  service_type text CHECK (service_type IN ('local_dropoff', 'collection_delivery', 'postal')) NOT NULL,
  address_street text,
  address_pincode text,
  city_id uuid REFERENCES cities(id) NOT NULL,
  duration text CHECK (duration IN ('express', 'standard', 'economy')) NOT NULL,
  scheduled_date date,
  scheduled_time text,
  pricing_service_charge float DEFAULT 0,
  pricing_delivery_charge float DEFAULT 0,
  pricing_discount float DEFAULT 0,
  pricing_total float NOT NULL,
  promo_code text,
  payment_method text CHECK (payment_method IN ('stripe', 'cash')) NOT NULL,
  payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  payment_id text,
  status text CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected')) DEFAULT 'pending',
  tracking jsonb,
  notes text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reviews table
CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) UNIQUE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  agent_id uuid REFERENCES agents(id) NOT NULL,
  rating int CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment text NOT NULL,
  response_message text,
  response_responded_at timestamptz,
  response_responded_by uuid REFERENCES agents(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chats table
CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) NOT NULL,
  last_message timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat participants
CREATE TABLE chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) NOT NULL,
  user_id uuid REFERENCES profiles(id),
  role text CHECK (role IN ('user', 'agent', 'admin')),
  joined_at timestamptz DEFAULT now()
);

-- Chat messages
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) NOT NULL,
  sender_id uuid REFERENCES profiles(id),
  sender_role text CHECK (sender_role IN ('user', 'agent', 'admin')),
  message text NOT NULL,
  message_type text CHECK (message_type IN ('text', 'image', 'file')) DEFAULT 'text',
  file_url text,
  is_read boolean DEFAULT false,
  timestamp timestamptz DEFAULT now()
);

-- Allow users to select their own profile
CREATE POLICY "Users can view their profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id); 