import { NextResponse } from "next/server";
import { getAuthenticatedActor } from "@/lib/auth";
import { canDeleteApplications, getApplicationAccessRecord } from "@/lib/applications";
import { createAdminClient } from "@/lib/supabaseServer";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidPattern.test(value);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  if (!canDeleteApplications(actor)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions" }, { status: 403 });
  }

  const { id } = await params;

  if (!isUuid(id)) {
    return NextResponse.json({ ok: false, error: "Invalid application id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  let existingApplication;
  try {
    existingApplication = await getApplicationAccessRecord(supabase, id);
  } catch (error) {
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }

  if (!existingApplication) {
    return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("applications").delete().eq("id", id);

  if (deleteError) {
    return NextResponse.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
