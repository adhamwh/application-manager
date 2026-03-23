import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth";
import {
  canAccessApplication,
  getApplicationAccessRecord,
  hasRequiredRole,
  MUTATION_ROLES,
} from "@/lib/applications";
import { createAdminClient } from "@/lib/supabaseServer";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  if (!hasRequiredRole(actor, MUTATION_ROLES)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();

  const { statusId, notes, requestedDocuments } = body as {
    statusId?: string;
    notes?: string;
    requestedDocuments?: string[];
  };

  if (!statusId) {
    return NextResponse.json({ ok: false, error: 'Missing statusId' }, { status: 400 });
  }

  const { data: statusRecord, error: statusError } = await supabase
    .from("application_statuses")
    .select("id")
    .eq("id", statusId)
    .maybeSingle();

  if (statusError) {
    return NextResponse.json({ ok: false, error: statusError.message }, { status: 500 });
  }

  if (!statusRecord) {
    return NextResponse.json({ ok: false, error: "Invalid statusId" }, { status: 400 });
  }

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

  updates.updated_by = actor.id;

  let existing;
  try {
    existing = await getApplicationAccessRecord(supabase, id);
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  if (!canAccessApplication(actor, existing)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
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
    performed_by: actor.id
  };

  const { error: auditError } = await supabase.from("application_audit_logs").insert(audit);

  if (auditError) {
    return NextResponse.json(
      { ok: false, error: `Application status updated, but audit logging failed: ${auditError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
