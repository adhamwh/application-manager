import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("application_statuses").select("id").limit(1);

  return NextResponse.json({
    ok: true,
    supabase: {
      healthy: !error,
      error: error?.message ?? null,
      sample: data ?? [],
    },
  });
}
