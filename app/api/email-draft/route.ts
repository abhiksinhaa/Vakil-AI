import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { draftContent, draftType, recipientEmail, userId } = await req.json();

    if (!draftContent || !recipientEmail || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Server-side Premium Check
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, plan_expires_at, org_id, organizations(*)')
      .eq('id', userId)
      .single();

    const isBasicPro = ['basic', 'pro', 'premium', 'firm'].includes(profile?.plan || '') && 
                      profile?.plan_expires_at && 
                      new Date(profile.plan_expires_at) > new Date();
                      
    const orgData: any = profile?.organizations;
    const orgExpiresAt = Array.isArray(orgData) ? orgData[0]?.plan_expires_at : orgData?.plan_expires_at;
    const isFirmMember = profile?.org_id != null && 
                         orgExpiresAt != null && 
                         new Date(orgExpiresAt) > new Date();

    const isPremium = isBasicPro || isFirmMember;

    if (!isPremium) {
      return NextResponse.json({ error: 'Premium feature.' }, { status: 403 });
    }

    // Send email via Resend API
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is missing');
      return NextResponse.json({ error: 'Email service unavailable' }, { status: 500 });
    }

    const subject = `Your Legal Draft — ${draftType || 'Legal Draft'} from Draftee`;
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Draftee <drafts@draftee.in>',
        to: [recipientEmail],
        subject: subject,
        text: draftContent,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailData);
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: emailData });
  } catch (error) {
    console.error('Email draft error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
