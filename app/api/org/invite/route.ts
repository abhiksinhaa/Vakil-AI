import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { email, orgId, userId } = await req.json();

    if (!email || !orgId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is owner of org
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('owner_id, seats_total, name')
      .eq('id', orgId)
      .single();

    if (!org || org.owner_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check seat limit
    const { count: currentSeats } = await supabaseAdmin
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .neq('status', 'inactive');

    if ((currentSeats || 0) >= org.seats_total) {
      return NextResponse.json({ error: 'Seat limit reached. Please purchase more seats.' }, { status: 403 });
    }

    // Insert into members
    const { error: inviteError } = await supabaseAdmin
      .from('organization_members')
      .insert({
        org_id: orgId,
        invited_email: email.toLowerCase(),
        status: 'invited',
      });

    if (inviteError) {
      return NextResponse.json({ error: 'Failed to invite member' }, { status: 500 });
    }

    // Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      const subject = `You've been invited to join ${org.name} on Draftee`;
      const text = `You've been invited to join the firm "${org.name}" on Draftee.\n\nPlease log in or sign up at https://draftee.in using this email address (${email}) to automatically join the firm and get access to pooled premium drafts.`;
      
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Draftee <drafts@draftee.in>',
          to: [email],
          subject: subject,
          text: text,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
