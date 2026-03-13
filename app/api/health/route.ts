import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const { data, error } = await supabase.from('application_statuses').select('id').limit(1);

  return NextResponse.json({
    ok: true,
    supabase: {
      healthy: !error,
      error: error?.message ?? null,
      sample: data ?? []
    }
  });
}
