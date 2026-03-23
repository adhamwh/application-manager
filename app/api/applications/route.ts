import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth";
import { hasRequiredRole, READ_ROLES } from "@/lib/applications";
import { createAdminClient } from "@/lib/supabaseServer";

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
      `id, applicant_name, applicant_email, status_id, agent_id, submitted_at, approved_at, rejected_at, requested_documents, created_at, updated_at, data,` +
        `agents(id, full_name, email), application_statuses(id, label)`
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
