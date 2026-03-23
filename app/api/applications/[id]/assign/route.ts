import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth";
import { canAssignApplications, getApplicationAccessRecord } from "@/lib/applications";
import { createAdminClient } from "@/lib/supabaseServer";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  if (!canAssignApplications(actor)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { agentId } = body as { agentId?: string | null };
  const supabase = createAdminClient();

  if (agentId === undefined) {
    return NextResponse.json({ ok: false, error: 'Missing agentId' }, { status: 400 });
  }

  let existing;
  try {
    existing = await getApplicationAccessRecord(supabase, id);
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Application not found' }, { status: 404 });
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({ agent_id: agentId, updated_by: actor.id })
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
    performed_by: actor.id
  };

  const { error: auditError } = await supabase.from("application_audit_logs").insert(audit);

  if (auditError) {
    return NextResponse.json(
      { ok: false, error: `Application assignment updated, but audit logging failed: ${auditError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
