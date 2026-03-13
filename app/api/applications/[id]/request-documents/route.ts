import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const body = await request.json().catch(() => ({}));
  const { requiredDocuments, message } = body as {
    requiredDocuments?: string[];
    message?: string;
  };

  if (!Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
    return NextResponse.json({ ok: false, error: 'requiredDocuments must be a non-empty array' }, { status: 400 });
  }

  const userId = request.headers.get('x-user-id');

  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status_id: 'needs_docs',
      requested_documents: requiredDocuments,
      updated_by: userId
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  type AuditEvent = {
    application_id: string;
    event_type: string;
    event_data: { requiredDocuments: string[]; message: string | null };
    performed_by: string | null;
  };

  const audit: AuditEvent = {
    application_id: id,
    event_type: 'request_documents',
    event_data: {
      requiredDocuments,
      message: message ?? null
    },
    performed_by: userId
  };

  await supabase.from('application_audit_logs').insert(audit);

  return NextResponse.json({ ok: true });
}
