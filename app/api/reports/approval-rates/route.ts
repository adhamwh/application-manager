import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import {
  formatBucket,
  isWithinDateRange,
  matchesCommonFilters,
  parseReportFilters,
} from "@/lib/reports/filters";
import { requireReportActor } from "@/lib/reports/auth";

type ApprovalRateRow = {
  id: string;
  status_id: string;
  agent_id: string | null;
  carrier_id: string | null;
  country_code: string | null;
  region_name: string | null;
  city_name: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  agents?: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export async function GET(request: Request) {
  const { errorResponse } = await requireReportActor(request);

  if (errorResponse) {
    return errorResponse;
  }

  const filters = parseReportFilters(request);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status_id, agent_id, carrier_id, country_code, region_name, city_name, source, medium, campaign, approved_at, rejected_at, agents(id, full_name)"
    )
    .in("status_id", ["approved", "rejected"]);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as ApprovalRateRow[];
  const filteredRows = rows.filter((row) => {
    if (!matchesCommonFilters(row, filters)) {
      return false;
    }

    const decisionDate = row.status_id === "approved" ? row.approved_at : row.rejected_at;
    return isWithinDateRange(decisionDate, filters);
  });

  const summary = filteredRows.reduce(
    (accumulator, row) => {
      accumulator.reviewed += 1;

      if (row.status_id === "approved") {
        accumulator.approved += 1;
      }

      if (row.status_id === "rejected") {
        accumulator.rejected += 1;
      }

      return accumulator;
    },
    { reviewed: 0, approved: 0, rejected: 0 }
  );

  const approvalRate =
    summary.reviewed === 0 ? 0 : Number(((summary.approved / summary.reviewed) * 100).toFixed(2));

  const seriesMap = new Map<
    string,
    { bucket: string; reviewed: number; approved: number; rejected: number }
  >();

  for (const row of filteredRows) {
    const decisionDate = row.status_id === "approved" ? row.approved_at : row.rejected_at;
    if (!decisionDate) {
      continue;
    }

    const bucket = formatBucket(new Date(decisionDate), filters.groupBy);
    const current = seriesMap.get(bucket) ?? {
      bucket,
      reviewed: 0,
      approved: 0,
      rejected: 0,
    };

    current.reviewed += 1;
    if (row.status_id === "approved") current.approved += 1;
    if (row.status_id === "rejected") current.rejected += 1;
    seriesMap.set(bucket, current);
  }

  const series = Array.from(seriesMap.values())
    .sort((left, right) => left.bucket.localeCompare(right.bucket))
    .map((row) => ({
      ...row,
      approvalRate:
        row.reviewed === 0 ? 0 : Number(((row.approved / row.reviewed) * 100).toFixed(2)),
    }));

  const byAgentMap = new Map<
    string,
    { agentId: string; agentName: string; reviewed: number; approved: number; rejected: number }
  >();

  for (const row of filteredRows) {
    const agent = firstRelation(row.agents);
    const agentId = row.agent_id ?? "unassigned";
    const current = byAgentMap.get(agentId) ?? {
      agentId,
      agentName: agent?.full_name ?? "Unassigned",
      reviewed: 0,
      approved: 0,
      rejected: 0,
    };

    current.reviewed += 1;
    if (row.status_id === "approved") current.approved += 1;
    if (row.status_id === "rejected") current.rejected += 1;
    byAgentMap.set(agentId, current);
  }

  const byAgent = Array.from(byAgentMap.values())
    .sort((left, right) => right.reviewed - left.reviewed)
    .map((row) => ({
      ...row,
      approvalRate:
        row.reviewed === 0 ? 0 : Number(((row.approved / row.reviewed) * 100).toFixed(2)),
    }));

  return NextResponse.json({
    ok: true,
    data: {
      summary: {
        ...summary,
        approvalRate,
      },
      series,
      breakdown: {
        byAgent,
      },
      filters: {
        groupBy: filters.groupBy,
        dateFrom: filters.dateFrom?.toISOString() ?? null,
        dateTo: filters.dateTo?.toISOString() ?? null,
      },
    },
  });
}
