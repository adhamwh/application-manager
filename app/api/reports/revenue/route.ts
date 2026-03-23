import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import {
  formatBucket,
  isWithinDateRange,
  matchesCommonFilters,
  parseReportFilters,
} from "@/lib/reports/filters";
import { requireReportActor } from "@/lib/reports/auth";

type RevenueRow = {
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
  expected_revenue: number | string | null;
  realized_revenue: number | string | null;
  currency_code: string | null;
  carriers?: { id: string; name: string } | { id: string; name: string }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toAmount(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
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
      "id, status_id, agent_id, carrier_id, country_code, region_name, city_name, source, medium, campaign, created_at, expected_revenue, realized_revenue, currency_code, carriers(id, name)"
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as RevenueRow[];
  const filteredRows = rows.filter(
    (row) => matchesCommonFilters(row, filters) && isWithinDateRange(row.created_at, filters)
  );

  const currencies = new Set(
    filteredRows.map((row) => row.currency_code?.trim() || "USD").filter(Boolean)
  );
  const currencyCode =
    currencies.size === 0 ? "USD" : currencies.size === 1 ? Array.from(currencies)[0] : "MIXED";

  const summary = filteredRows.reduce(
    (accumulator, row) => {
      accumulator.expectedRevenue += toAmount(row.expected_revenue);
      accumulator.realizedRevenue += toAmount(row.realized_revenue);
      return accumulator;
    },
    { expectedRevenue: 0, realizedRevenue: 0 }
  );

  const seriesMap = new Map<
    string,
    { bucket: string; expectedRevenue: number; realizedRevenue: number }
  >();

  for (const row of filteredRows) {
    if (!row.created_at) {
      continue;
    }

    const bucket = formatBucket(new Date(row.created_at), filters.groupBy);
    const current = seriesMap.get(bucket) ?? {
      bucket,
      expectedRevenue: 0,
      realizedRevenue: 0,
    };

    current.expectedRevenue += toAmount(row.expected_revenue);
    current.realizedRevenue += toAmount(row.realized_revenue);
    seriesMap.set(bucket, current);
  }

  const byCarrierMap = new Map<
    string,
    { carrierId: string; carrierName: string; expectedRevenue: number; realizedRevenue: number }
  >();

  for (const row of filteredRows) {
    const carrier = firstRelation(row.carriers);
    const carrierId = row.carrier_id ?? "unassigned";
    const current = byCarrierMap.get(carrierId) ?? {
      carrierId,
      carrierName: carrier?.name ?? "Unassigned",
      expectedRevenue: 0,
      realizedRevenue: 0,
    };

    current.expectedRevenue += toAmount(row.expected_revenue);
    current.realizedRevenue += toAmount(row.realized_revenue);
    byCarrierMap.set(carrierId, current);
  }

  return NextResponse.json({
    ok: true,
    data: {
      summary: {
        expectedRevenue: Number(summary.expectedRevenue.toFixed(2)),
        realizedRevenue: Number(summary.realizedRevenue.toFixed(2)),
        currencyCode,
      },
      series: Array.from(seriesMap.values())
        .sort((left, right) => left.bucket.localeCompare(right.bucket))
        .map((row) => ({
          bucket: row.bucket,
          expectedRevenue: Number(row.expectedRevenue.toFixed(2)),
          realizedRevenue: Number(row.realizedRevenue.toFixed(2)),
        })),
      breakdown: {
        byCarrier: Array.from(byCarrierMap.values())
          .sort((left, right) => right.expectedRevenue - left.expectedRevenue)
          .map((row) => ({
            carrierId: row.carrierId,
            carrierName: row.carrierName,
            expectedRevenue: Number(row.expectedRevenue.toFixed(2)),
            realizedRevenue: Number(row.realizedRevenue.toFixed(2)),
          })),
      },
      filters: {
        groupBy: filters.groupBy,
        dateFrom: filters.dateFrom?.toISOString() ?? null,
        dateTo: filters.dateTo?.toISOString() ?? null,
      },
    },
  });
}
