import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pincode = (searchParams.get('pincode') || '').trim().toLowerCase();
  if (!pincode) {
    return NextResponse.json({ status: 'error', message: 'Missing pincode parameter.' }, { status: 400 });
  }

  // Query all active cities with pincodes
  const { data: cities, error } = await supabase
    .from('cities')
    .select('id, name, pincodes, latitude, longitude, state_id, is_active')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ status: 'error', message: 'Database error.' }, { status: 500 });
  }

  let foundCity = null;
  for (const city of cities || []) {
    if (Array.isArray(city.pincodes) && city.pincodes.some((pc: string) => (pc || '').trim().toLowerCase() === pincode)) {
      foundCity = city;
      break;
    }
  }

  if (!foundCity) {
    return NextResponse.json({ status: 'error', message: 'Sorry, we do not provide service to this location.' }, { status: 404 });
  }

  // Get state name
  let stateName = '';
  if (foundCity.state_id) {
    const { data: state, error: stateError } = await supabase
      .from('states')
      .select('name')
      .eq('id', foundCity.state_id)
      .maybeSingle();
    if (!stateError && state) {
      stateName = state.name;
    }
  }

  return NextResponse.json({
    status: 'ok',
    city: foundCity.name,
    state: stateName,
    city_id: foundCity.id,
    latitude: foundCity.latitude,
    longitude: foundCity.longitude,
  });
} 