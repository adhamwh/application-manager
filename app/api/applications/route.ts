import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth";
import { hasRequiredRole, MUTATION_ROLES, READ_ROLES } from "@/lib/applications";
import { createAdminClient } from "@/lib/supabaseServer";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidPattern.test(value);
}

export async function GET(request: Request) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  if (!hasRequiredRole(actor, READ_ROLES)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const agentId = url.searchParams.get("agentId");
  const search = url.searchParams.get("search");
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Math.min(Number(url.searchParams.get("pageSize") ?? "25"), 100);

  const offset = (Math.max(page, 1) - 1) * pageSize;
  const supabase = createAdminClient();

  let query = supabase
    .from('applications')
    .select(
      `id, applicant_name, applicant_email, status_id, agent_id, carrier_id, submitted_at, approved_at, rejected_at, requested_documents, created_at, updated_at, data,` +
        `agents(id, full_name, email), carriers(id, name), application_statuses(id, label)`
      , { count: 'exact' }
    )
    .range(offset, offset + pageSize - 1)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status_id', status);
  }

  if (agentId) {
    if (actor.role === "agent" && agentId !== actor.id) {
      return NextResponse.json(
        { ok: false, error: "Agents can only read their assigned applications" },
        { status: 403 }
      );
    }

    query = query.eq('agent_id', agentId);
  } else if (actor.role === "agent") {
    query = query.eq("agent_id", actor.id);
  }

  if (search) {
    // Simple ilike search on applicant name/email
    query = query.or(
      `applicant_name.ilike.%${search}%,applicant_email.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data, meta: { page, pageSize, total: count } });
}

export async function POST(request: Request) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  if (!hasRequiredRole(actor, MUTATION_ROLES)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    applicant_name?: string;
    applicant_email?: string;
    status_id?: string;
    agent_id?: string;
    carrier_id?: string;
    submitted_at?: string;
    notes?: string;
  };

  const applicantName = body.applicant_name?.trim();
  const applicantEmail = body.applicant_email?.trim() || null;
  const statusId = body.status_id?.trim() || "submitted";
  const agentId = body.agent_id?.trim() || null;
  const carrierId = body.carrier_id?.trim() || null;
  const submittedAt = body.submitted_at?.trim() || null;
  const notes = body.notes?.trim() || null;

  if (!applicantName) {
    return NextResponse.json({ ok: false, error: "Missing applicant_name" }, { status: 400 });
  }

  if (agentId && !isUuid(agentId)) {
    return NextResponse.json({ ok: false, error: "agent_id must be a valid UUID" }, { status: 400 });
  }

  if (carrierId && !isUuid(carrierId)) {
    return NextResponse.json({ ok: false, error: "carrier_id must be a valid UUID" }, { status: 400 });
  }

  if (submittedAt && Number.isNaN(new Date(submittedAt).getTime())) {
    return NextResponse.json({ ok: false, error: "submitted_at must be a valid date" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: statusRecord, error: statusError } = await supabase
    .from("application_statuses")
    .select("id")
    .eq("id", statusId)
    .maybeSingle();

  if (statusError) {
    return NextResponse.json({ ok: false, error: statusError.message }, { status: 500 });
  }

  if (!statusRecord) {
    return NextResponse.json({ ok: false, error: "Invalid status_id" }, { status: 400 });
  }

  if (agentId) {
    const { data: agentRecord, error: agentError } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .maybeSingle();

    if (agentError) {
      return NextResponse.json({ ok: false, error: agentError.message }, { status: 500 });
    }

    if (!agentRecord) {
      return NextResponse.json({ ok: false, error: "Assigned agent not found" }, { status: 400 });
    }
  }

  if (carrierId) {
    const { data: carrierRecord, error: carrierError } = await supabase
      .from("carriers")
      .select("id")
      .eq("id", carrierId)
      .maybeSingle();

    if (carrierError) {
      return NextResponse.json({ ok: false, error: carrierError.message }, { status: 500 });
    }

    if (!carrierRecord) {
      return NextResponse.json({ ok: false, error: "Carrier not found" }, { status: 400 });
    }
  }

  const timestamps: {
    submitted_at?: string;
    approved_at?: string;
    rejected_at?: string;
    last_resubmitted_at?: string;
  } = {};

  if (submittedAt) {
    timestamps.submitted_at = new Date(submittedAt).toISOString();
  } else if (statusId === "submitted") {
    timestamps.submitted_at = new Date().toISOString();
  }

  if (statusId === "approved") {
    timestamps.approved_at = new Date().toISOString();
  }

  if (statusId === "rejected") {
    timestamps.rejected_at = new Date().toISOString();
  }

  if (statusId === "resubmitted") {
    timestamps.last_resubmitted_at = new Date().toISOString();
  }

  const insertPayload = {
    applicant_name: applicantName,
    applicant_email: applicantEmail,
    status_id: statusId,
    agent_id: agentId,
    carrier_id: carrierId,
    data: notes ? { notes } : {},
    created_by: actor.id,
    updated_by: actor.id,
    ...timestamps,
  };

  const { data: application, error: insertError } = await supabase
    .from("applications")
    .insert(insertPayload)
    .select(
      `id, applicant_name, applicant_email, status_id, agent_id, carrier_id, submitted_at, approved_at, rejected_at, requested_documents, created_at, updated_at, data,` +
        `agents(id, full_name, email), carriers(id, name), application_statuses(id, label)`
    )
    .single();

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  if (!application || typeof application !== "object" || !("id" in application)) {
    return NextResponse.json(
      { ok: false, error: "Application was created but could not be loaded from the database response" },
      { status: 500 }
    );
  }

  const createdApplicationId = String((application as { id: string }).id);

  const { error: auditError } = await supabase.from("application_audit_logs").insert({
    application_id: createdApplicationId,
    event_type: "create_application",
    event_data: {
      statusId,
      agentId,
      carrierId,
      notes,
    },
    performed_by: actor.id,
  });

  if (auditError) {
    return NextResponse.json(
      { ok: false, error: `Application created, but audit logging failed: ${auditError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, data: application }, { status: 201 });
}
