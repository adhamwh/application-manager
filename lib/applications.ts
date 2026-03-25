import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppRole, AuthenticatedActor } from "@/lib/auth";

type ApplicationAccessRecord = {
  id: string;
  agent_id: string | null;
  status_id: string;
};

export const MUTATION_ROLES: AppRole[] = ["admin", "reviewer", "agent"];
export const READ_ROLES: AppRole[] = ["admin", "reviewer", "agent"];
export const DELETE_ROLES: AppRole[] = ["admin", "reviewer"];

export function hasRequiredRole(actor: AuthenticatedActor, allowedRoles: AppRole[]) {
  return allowedRoles.includes(actor.role);
}

export async function getApplicationAccessRecord(
  supabase: SupabaseClient,
  applicationId: string
) {
  const { data, error } = await supabase
    .from("applications")
    .select("id, agent_id, status_id")
    .eq("id", applicationId)
    .maybeSingle<ApplicationAccessRecord>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export function canAccessApplication(actor: AuthenticatedActor, application: ApplicationAccessRecord) {
  if (actor.role === "admin" || actor.role === "reviewer") {
    return true;
  }

  if (actor.role === "agent") {
    return application.agent_id === actor.id;
  }

  return false;
}

export function canAssignApplications(actor: AuthenticatedActor) {
  return actor.role === "admin" || actor.role === "reviewer";
}

export function canDeleteApplications(actor: AuthenticatedActor) {
  return DELETE_ROLES.includes(actor.role);
}
