import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { name, state, pincodes, delivery_charges_standard, delivery_charges_express } = await req.json();
    if (!name || !state || !Array.isArray(pincodes) || pincodes.length === 0) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    // Check for duplicate city (by name)
    const { data: existing, error: existErr } = await supabase
      .from('cities')
      .select('*')
      .eq('name', name.trim())
      .maybeSingle();
    if (existErr) {
      return NextResponse.json({ message: existErr.message }, { status: 500 });
    }
    if (existing) {
      return NextResponse.json({ message: 'City already exists.' }, { status: 409 });
    }
    const now = new Date().toISOString();
    const { data: city, error: insertErr } = await supabase
      .from('cities')
      .insert([{
        name: name.trim(),
        state: state.trim(),
        pincodes,
        delivery_charges_standard,
        delivery_charges_express,
        is_active: true,
        created_at: now,
        updated_at: now,
      }])
      .select()
      .maybeSingle();
    if (insertErr || !city) {
      return NextResponse.json({ message: insertErr?.message || 'Failed to add city' }, { status: 500 });
    }
    return NextResponse.json({ city }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 