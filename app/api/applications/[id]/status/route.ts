import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await request.json().catch(() => ({}));

  const { statusId, notes, requestedDocuments } = body as {
    statusId?: string;
    notes?: string;
    requestedDocuments?: string[];
  };

  if (!statusId) {
    return NextResponse.json({ ok: false, error: 'Missing statusId' }, { status: 400 });
  }

  const userId = request.headers.get('x-user-id');

  type Updates = {
    status_id: string;
    approved_at?: string | null;
    rejected_at?: string | null;
    submitted_at?: string;
    requested_documents?: string[];
    updated_by?: string | null;
  };

  // Determine timestamp changes based on status.
  const updates: Updates = { status_id: statusId };

  const now = new Date().toISOString();
  if (statusId === 'approved') {
    updates.approved_at = now;
    updates.rejected_at = null;
  } else if (statusId === 'rejected') {
    updates.rejected_at = now;
    updates.approved_at = null;
  } else if (statusId === 'submitted') {
    updates.submitted_at = now;
  }

  if (Array.isArray(requestedDocuments)) {
    updates.requested_documents = requestedDocuments;
  }

  updates.updated_by = userId;

  const { data: existing, error: fetchError } = await supabase
    .from('applications')
    .select('status_id')
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
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  type AuditEvent = {
    application_id: string;
    event_type: 'status_change';
    event_data: {
      from: string | null;
      to: string;
      notes: string | null;
      requestedDocuments: string[] | null;
    };
    performed_by: string | null;
  };

  const audit: AuditEvent = {
    application_id: id,
    event_type: 'status_change',
    event_data: {
      from: existing.status_id,
      to: statusId,
      notes: notes ?? null,
      requestedDocuments: requestedDocuments ?? null
    },
    performed_by: userId
  };

  await supabase.from('application_audit_logs').insert(audit);

  return NextResponse.json({ ok: true });
}
