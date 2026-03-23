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
  const body = await request.json().catch(() => ({}));
  const supabase = createAdminClient();
  const { requiredDocuments, message } = body as {
    requiredDocuments?: string[];
    message?: string;
  };

  if (!Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
    return NextResponse.json({ ok: false, error: 'requiredDocuments must be a non-empty array' }, { status: 400 });
  }

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

  const { error: updateError } = await supabase
    .from('applications')
    .update({
      status_id: 'needs_docs',
      requested_documents: requiredDocuments,
      updated_by: actor.id
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
    performed_by: actor.id
  };

  const { error: auditError } = await supabase.from("application_audit_logs").insert(audit);

  if (auditError) {
    return NextResponse.json(
      { ok: false, error: `Application updated, but audit logging failed: ${auditError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
