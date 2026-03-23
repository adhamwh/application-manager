import { NextResponse } from "next/server";
import { getAuthenticatedActor, type AppRole } from "@/lib/auth";

export const REPORT_ROLES: AppRole[] = ["admin", "reviewer"];

export async function requireReportActor(request: Request) {
  const actor = await getAuthenticatedActor(request);

  if (!actor) {
    return {
      actor: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      ),
    };
  }

  if (!REPORT_ROLES.includes(actor.role)) {
    return {
      actor: null,
      errorResponse: NextResponse.json(
        { ok: false, error: "Insufficient permissions" },
        { status: 403 }
      ),
    };
  }

  return {
    actor,
    errorResponse: null,
  };
}
