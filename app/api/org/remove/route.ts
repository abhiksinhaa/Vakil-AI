import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { memberId, orgId, userId } = await req.json();

    if (!memberId || !orgId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is owner of org
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('owner_id')
      .eq('id', orgId)
      .single();

    if (!org || org.owner_id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Don't allow removing the owner
    const { data: member } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('id', memberId)
      .single();

    if (member?.user_id === userId) {
      return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 400 });
    }

    // Deactivate member
    await supabaseAdmin
      .from('organization_members')
      .update({ status: 'inactive' })
      .eq('id', memberId);

    // If member has a user_id, remove org_id from their profile
    if (member?.user_id) {
      await supabaseAdmin
        .from('profiles')
        .update({ org_id: null })
        .eq('id', member.user_id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
