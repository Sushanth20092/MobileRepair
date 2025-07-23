import { NextRequest, NextResponse } from 'next/server';
// Import supabase client from backend (CommonJS)
const { supabase } = require('../../../../backend/supabaseClient');

function generateBookingId() {
  // Simple unique string, e.g. 'BK-' + timestamp + random
  return 'BK-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

export async function POST(req: NextRequest) {
  try {
    let bookingPayload;
    try {
      bookingPayload = await req.json();
    } catch (error: any) {
      console.error('❌ Error parsing JSON body:', error);
      return NextResponse.json({ status: 'error', message: 'Invalid JSON payload' }, { status: 400 });
    }

    // Log the incoming payload
    console.log('Incoming payload:', bookingPayload);

    // Remove any obsolete 'address' property if present
    if ('address' in bookingPayload) {
      delete bookingPayload.address;
    }

    // List of valid columns for bookings table
    const validColumns = [
      // Core fields
      'booking_id', 'user_id', 'device_id', 'city_id', 'service_type_id', 'duration_type_id',
      'scheduled_date', 'scheduled_time',
      'collection_date', 'collection_time',
      'delivery_date', 'delivery_time',
      'pricing_service_charge', 'pricing_delivery_charge', 'pricing_discount', 'pricing_total',
      'payment_method', 'payment_status', 'status', 'agent_id',
      // Optional fields
      'faults', 'images', 'promo_code', 'payment_id', 'tracking', 'notes', 'imei_number',
      'completed_at', 'cancelled_at', 'cancellation_reason',
      // Address fields
      'address_street', 'address_city', 'address_state', 'address_pincode', 'address_landmark',
      'address_latitude', 'address_longitude', 'address_full', 'location_type', 'is_address_verified',
    ];

    // Required fields for validation
    const requiredFields = [
      'user_id', 'device_id', 'city_id', 'service_type_id', 'scheduled_date', 'scheduled_time',
      'pricing_service_charge', 'pricing_delivery_charge', 'pricing_total', 'payment_method',
      'address_street', 'address_city', 'address_state', 'address_pincode', 'address_latitude', 'address_longitude', 'address_full', 'location_type', 'imei_number'
    ];
    for (const field of requiredFields) {
      if (
        bookingPayload[field] === undefined ||
        bookingPayload[field] === null ||
        (typeof bookingPayload[field] === 'string' && bookingPayload[field].trim() === '')
      ) {
        return NextResponse.json({ status: 'error', message: `field ${field} is missing` }, { status: 400 });
      }
    }

    // Set defaults
    if (!bookingPayload.booking_id) {
      bookingPayload.booking_id = generateBookingId();
    }
    bookingPayload.payment_status = bookingPayload.payment_status || 'pending';
    bookingPayload.status = bookingPayload.status || 'pending';

    // Build insert payload with only valid columns
    const insertPayload: any = {};
    for (const key of validColumns) {
      if (bookingPayload[key] !== undefined) {
        insertPayload[key] = bookingPayload[key];
      }
    }

    // Insert booking
    let data, error;
    try {
      const result = await supabase
        .from('bookings')
        .insert([{ ...insertPayload }])
        .select('id')
        .single();
      data = result.data;
      error = result.error;
    } catch (insertError: any) {
      console.error('❌ Supabase insert error:', insertError);
      return NextResponse.json({ status: 'error', message: insertError.message || 'Supabase insert failed' }, { status: 500 });
    }

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'success', booking_id: insertPayload.booking_id, id: data.id }, { status: 200 });
  } catch (error: any) {
    console.error('❌ API route error:', error);
    return NextResponse.json({ status: 'error', message: error.message || 'Unknown error' }, { status: 500 });
  }
} 