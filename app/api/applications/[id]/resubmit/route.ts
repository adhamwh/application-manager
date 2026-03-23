import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth";
import {
  canAccessApplication,
  getApplicationAccessRecord,
  hasRequiredRole,
  MUTATION_ROLES,
} from "@/lib/applications";
import { createAdminClient } from "@/lib/supabaseServer";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  if (!hasRequiredRole(actor, MUTATION_ROLES)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
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
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  let application;

  try {
    application = await getApplicationAccessRecord(supabase, id);
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }

  if (!application) {
    return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  }

  if (!canAccessApplication(actor, application)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const updates: {
    status_id: "resubmitted";
    last_resubmitted_at: string;
    updated_by: string;
    carrier_id?: string | null;
  } = {
    status_id: 'resubmitted',
    last_resubmitted_at: now,
    updated_by: actor.id
  };

  const auditEvent: AuditEvent = {
    application_id: id,
    event_type: 'resubmit',
    event_data: {
      carrierId: carrierId ?? null,
      payload: payload ?? null,
      carrierResponse: null
    },
    performed_by: actor.id
  };

  if (carrierId !== undefined) {
    updates.carrier_id = carrierId;
  }

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

  const { error: auditError } = await supabase.from("application_audit_logs").insert(auditEvent);

  if (auditError) {
    return NextResponse.json(
      { ok: false, error: `Application resubmitted, but audit logging failed: ${auditError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
