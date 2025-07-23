import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { applicationId, adminId, rejectionReason } = await req.json();
    if (!applicationId || !rejectionReason) {
      return NextResponse.json({ message: 'Missing applicationId or rejectionReason' }, { status: 400 });
    }
    // 1. Get the application to find user_id
    const { data: application, error: fetchError } = await supabase.from('agent_applications').select('*').eq('id', applicationId).single();
    if (fetchError || !application) {
      return NextResponse.json({ message: 'Application not found' }, { status: 404 });
    }
    // 2. Update agent_applications row
    const { error: updateError } = await supabase.from('agent_applications').update({
      status: 'rejected',
      reviewed_by: adminId || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    }).eq('id', applicationId);
    if (updateError) {
      return NextResponse.json({ message: 'Failed to update agent application: ' + updateError.message }, { status: 500 });
    }
    // 3. Insert notification for agent rejection
    const { error: notifError } = await supabase.from('notifications').insert([{
      user_id: application.user_id,
      type: 'agent_rejected',
      title: 'Your agent request was rejected',
      message: `Reason: ${rejectionReason}`,
      is_read: false,
    }]);
    if (notifError) {
      return NextResponse.json({ message: 'Application rejected but failed to send notification: ' + notifError.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Agent application rejected successfully' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal server error' }, { status: 500 });
  }
} 