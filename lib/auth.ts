import { createAdminClient, createAuthClient } from "@/lib/supabaseServer";

export type AppRole = "admin" | "reviewer" | "agent" | "user";

export type AuthenticatedActor = {
  id: string;
  email: string | null;
  role: AppRole;
};

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function normalizeRole(role: unknown): AppRole {
  if (role === "admin" || role === "reviewer" || role === "agent") {
    return role;
  }

  return "user";
}

export async function getAuthenticatedActor(request: Request): Promise<AuthenticatedActor | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const authClient = createAuthClient();
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const role =
    profileError || !profile
      ? normalizeRole(data.user.app_metadata.role ?? data.user.user_metadata.role)
      : normalizeRole(profile.role);

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    role,
  };
}
