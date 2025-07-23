-- Migration to drop redundant address fields from agents and bookings tables
-- This simplifies address handling since we already have city_id referencing cities table

-- Drop the redundant address columns from agents table
ALTER TABLE public.agents 
DROP COLUMN IF EXISTS shop_address_city,
DROP COLUMN IF EXISTS shop_address_state,
DROP COLUMN IF EXISTS shop_address_landmark;

-- Drop the redundant address columns from bookings table
ALTER TABLE public.bookings 
DROP COLUMN IF EXISTS address_city,
DROP COLUMN IF EXISTS address_state,
DROP COLUMN IF EXISTS address_landmark;

-- Verify the remaining address fields
-- agents table: shop_address_street and shop_address_pincode remain
-- bookings table: address_street and address_pincode remain
-- Both tables have city_id references the cities table for city/state information 