function readRequiredEnv(name: string, fallbackName?: string) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);

  if (!value) {
    const fallbackHint = fallbackName ? ` or ${fallbackName}` : "";
    throw new Error(`Missing required environment variable: ${name}${fallbackHint}`);
  }

  return value;
}

export const env = {
  supabaseUrl: readRequiredEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readRequiredEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
};
