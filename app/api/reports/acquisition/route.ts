import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import {
  formatBucket,
  isWithinDateRange,
  matchesCommonFilters,
  parseReportFilters,
} from "@/lib/reports/filters";
import { requireReportActor } from "@/lib/reports/auth";

type AcquisitionRow = {
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
  created_at: string | null;
  submitted_at: string | null;
};

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
      "id, status_id, agent_id, carrier_id, country_code, region_name, city_name, source, medium, campaign, created_at, submitted_at"
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as AcquisitionRow[];
  const filteredRows = rows.filter((row) => matchesCommonFilters(row, filters));

  const applicationsCreated = filteredRows.filter((row) =>
    isWithinDateRange(row.created_at, filters)
  );

  const applicationsSubmitted = filteredRows.filter((row) =>
    isWithinDateRange(row.submitted_at, filters)
  );

  const seriesMap = new Map<
    string,
    { bucket: string; applicationsCreated: number; applicationsSubmitted: number }
  >();

  for (const row of applicationsCreated) {
    if (!row.created_at) {
      continue;
    }

    const bucket = formatBucket(new Date(row.created_at), filters.groupBy);
    const current = seriesMap.get(bucket) ?? {
      bucket,
      applicationsCreated: 0,
      applicationsSubmitted: 0,
    };
    current.applicationsCreated += 1;
    seriesMap.set(bucket, current);
  }

  for (const row of applicationsSubmitted) {
    if (!row.submitted_at) {
      continue;
    }

    const bucket = formatBucket(new Date(row.submitted_at), filters.groupBy);
    const current = seriesMap.get(bucket) ?? {
      bucket,
      applicationsCreated: 0,
      applicationsSubmitted: 0,
    };
    current.applicationsSubmitted += 1;
    seriesMap.set(bucket, current);
  }

  const bySourceMap = new Map<string, number>();

  for (const row of applicationsCreated) {
    const source = row.source ?? "unknown";
    bySourceMap.set(source, (bySourceMap.get(source) ?? 0) + 1);
  }

  const bySource = Array.from(bySourceMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((left, right) => right.count - left.count);

  return NextResponse.json({
    ok: true,
    data: {
      summary: {
        applicationsCreated: applicationsCreated.length,
        applicationsSubmitted: applicationsSubmitted.length,
      },
      series: Array.from(seriesMap.values()).sort((left, right) =>
        left.bucket.localeCompare(right.bucket)
      ),
      breakdown: {
        bySource,
      },
      filters: {
        groupBy: filters.groupBy,
        dateFrom: filters.dateFrom?.toISOString() ?? null,
        dateTo: filters.dateTo?.toISOString() ?? null,
      },
    },
  });
}
