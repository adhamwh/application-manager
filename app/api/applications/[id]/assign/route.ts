import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string | null };

  if (agentId === undefined) {
    return NextResponse.json({ ok: false, error: 'Missing agentId' }, { status: 400 });
  }

  const userId = request.headers.get('x-user-id');

  const { data: existing, error: fetchError } = await supabase
    .from('applications')
    .select('agent_id')
    .eq('id', id)
    .single();

  if (fetchError) {
    return NextResponse.json({ ok: false, error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({ agent_id: agentId, updated_by: userId })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  type AuditEvent = {
    application_id: string;
    event_type: string;
    event_data: { from: string | null; to: string | null };
    performed_by: string | null;
  };

  const audit: AuditEvent = {
    application_id: id,
    event_type: 'assign_agent',
    event_data: {
      from: existing.agent_id,
      to: agentId
    },
    performed_by: userId
  };

  await supabase.from('application_audit_logs').insert(audit);

  return NextResponse.json({ ok: true });
}
