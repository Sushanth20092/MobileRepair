import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { category_id, brand_name, model, image = null, common_faults = null } = await req.json();
    if (!category_id || !brand_name || !model) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    // 1. Check if brand exists
    let { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('name', brand_name.trim())
      .eq('category_id', category_id)
      .maybeSingle();
    if (brandError) {
      return NextResponse.json({ message: brandError.message }, { status: 500 });
    }
    let brand_id = brand?.id;
    if (!brand_id) {
      // 2. Insert new brand
      const { data: newBrand, error: insertBrandError } = await supabase
        .from('brands')
        .insert([{ name: brand_name.trim(), category_id }])
        .select()
        .maybeSingle();
      if (insertBrandError || !newBrand) {
        return NextResponse.json({ message: insertBrandError?.message || 'Failed to create brand' }, { status: 500 });
      }
      brand_id = newBrand.id;
    }
    // 3. Insert device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .insert([{ category_id, brand_id, model, image, common_faults }])
      .select()
      .maybeSingle();
    if (deviceError) {
      if (deviceError.message && deviceError.message.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ message: 'Device already exists.' }, { status: 409 });
      }
      return NextResponse.json({ message: deviceError.message }, { status: 500 });
    }
    return NextResponse.json({ device }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get('category_id');
    const brand_id = searchParams.get('brand_id');
    if (!category_id || !brand_id) {
      return NextResponse.json({ message: 'Missing category_id or brand_id' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('devices')
      .select('model')
      .eq('category_id', category_id)
      .eq('brand_id', brand_id)
      .order('model', { ascending: true });
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    }
    // Get unique model names
    const models = Array.from(new Set((data || []).map((d: any) => d.model)));
    return NextResponse.json({ models }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 