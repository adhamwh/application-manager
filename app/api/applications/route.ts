import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const agentId = url.searchParams.get('agentId');
  const search = url.searchParams.get('search');
  const page = Number(url.searchParams.get('page') ?? '1');
  const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

  const offset = (Math.max(page, 1) - 1) * pageSize;

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
    query = query.eq('agent_id', agentId);
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
