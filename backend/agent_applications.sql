-- Create agent_applications table in Supabase
create table if not exists public.agent_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  email text not null,
  phone text not null,
  shop_name text not null,
  shop_address text not null,
  city_id uuid references cities(id) not null,
  pincode text not null,
  experience text,
  specializations text[] not null default '{}',
  id_proof text,
  shop_images text[] not null default '{}',
  agree_to_terms boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups by status
create index if not exists idx_agent_applications_status on public.agent_applications(status); 