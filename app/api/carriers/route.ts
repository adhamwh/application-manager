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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("carriers")
    .select("id, name, api_endpoint, metadata, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}
