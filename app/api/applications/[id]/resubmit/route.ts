import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  type ResubmitBody = { carrierId?: string; payload?: unknown };
  type AuditEvent = {
    application_id: string;
    event_type: 'resubmit';
    event_data: {
      carrierId: string | null;
      payload: unknown;
      carrierResponse: unknown | null;
    };
    performed_by: string | null;
  };

  const body = (await request.json().catch(() => ({}))) as ResubmitBody;
  const { carrierId, payload } = body;

  const userId = request.headers.get('x-user-id');
  const now = new Date().toISOString();

  const updates = {
    status_id: 'resubmitted',
    last_resubmitted_at: now,
    updated_by: userId
  };

  const auditEvent: AuditEvent = {
    application_id: id,
    event_type: 'resubmit',
    event_data: {
      carrierId: carrierId ?? null,
      payload: payload ?? null,
      carrierResponse: null
    },
    performed_by: userId
  };

  // If carrier ID is provided, attempt to send payload, if carrier endpoint exists.
  if (carrierId) {
    const { data: carrier, error: carrierError } = await supabase
      .from('carriers')
      .select('api_endpoint')
      .eq('id', carrierId)
      .single();

    if (carrierError) {
      return NextResponse.json({ ok: false, error: carrierError.message }, { status: 500 });
    }

    if (carrier?.api_endpoint) {
      try {
        const response = await fetch(carrier.api_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: id, payload })
        });
        const responseBody = await response.text();
        auditEvent.event_data.carrierResponse = {
          status: response.status,
          body: responseBody
        };
      } catch (err) {
        auditEvent.event_data.carrierResponse = {
          error: (err as Error).message
        };
      }
    }
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
  }

  await supabase.from('application_audit_logs').insert(auditEvent);

  return NextResponse.json({ ok: true });
}
