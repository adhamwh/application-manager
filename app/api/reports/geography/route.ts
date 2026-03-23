import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import {
  isWithinDateRange,
  matchesCommonFilters,
  parseReportFilters,
} from "@/lib/reports/filters";
import { requireReportActor } from "@/lib/reports/auth";

type GeographyRow = {
  id: string;
  status_id: string;
  agent_id: string | null;
  carrier_id: string | null;
  country_code: string | null;
  country_name: string | null;
  region_name: string | null;
  city_name: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  created_at: string | null;
};

type GeographySummary = {
  applications: number;
  approved: number;
  rejected: number;
};

function createSummary(): GeographySummary {
  return {
    applications: 0,
    approved: 0,
    rejected: 0,
  };
}

function withApprovalRate<T extends GeographySummary>(row: T) {
  const reviewed = row.approved + row.rejected;
  return {
    ...row,
    approvalRate: reviewed === 0 ? 0 : Number(((row.approved / reviewed) * 100).toFixed(2)),
  };
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
      "id, status_id, agent_id, carrier_id, country_code, country_name, region_name, city_name, source, medium, campaign, created_at"
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as GeographyRow[];
  const filteredRows = rows.filter(
    (row) => matchesCommonFilters(row, filters) && isWithinDateRange(row.created_at, filters)
  );

  const byCountryMap = new Map<
    string,
    GeographySummary & { countryCode: string; countryName: string }
  >();
  const byRegionMap = new Map<
    string,
    GeographySummary & { countryCode: string | null; regionName: string }
  >();
  const byCityMap = new Map<
    string,
    GeographySummary & { countryCode: string | null; regionName: string | null; cityName: string }
  >();

  for (const row of filteredRows) {
    const countryCode = row.country_code?.trim() || "unknown";
    const countryName = row.country_name?.trim() || "Unknown";
    const regionName = row.region_name?.trim() || "Unknown";
    const cityName = row.city_name?.trim() || "Unknown";

    const country = byCountryMap.get(countryCode) ?? {
      countryCode,
      countryName,
      ...createSummary(),
    };
    country.applications += 1;
    if (row.status_id === "approved") country.approved += 1;
    if (row.status_id === "rejected") country.rejected += 1;
    byCountryMap.set(countryCode, country);

    const regionKey = `${countryCode}:${regionName}`;
    const region = byRegionMap.get(regionKey) ?? {
      countryCode: row.country_code,
      regionName,
      ...createSummary(),
    };
    region.applications += 1;
    if (row.status_id === "approved") region.approved += 1;
    if (row.status_id === "rejected") region.rejected += 1;
    byRegionMap.set(regionKey, region);

    const cityKey = `${countryCode}:${regionName}:${cityName}`;
    const city = byCityMap.get(cityKey) ?? {
      countryCode: row.country_code,
      regionName: row.region_name,
      cityName,
      ...createSummary(),
    };
    city.applications += 1;
    if (row.status_id === "approved") city.approved += 1;
    if (row.status_id === "rejected") city.rejected += 1;
    byCityMap.set(cityKey, city);
  }

  const summary = filteredRows.reduce(
    (accumulator, row) => {
      accumulator.applications += 1;
      if (row.status_id === "approved") accumulator.approved += 1;
      if (row.status_id === "rejected") accumulator.rejected += 1;
      return accumulator;
    },
    createSummary()
  );

  return NextResponse.json({
    ok: true,
    data: {
      summary: withApprovalRate(summary),
      breakdown: {
        byCountry: Array.from(byCountryMap.values())
          .sort((left, right) => right.applications - left.applications)
          .map((row) => withApprovalRate(row)),
        byRegion: Array.from(byRegionMap.values())
          .sort((left, right) => right.applications - left.applications)
          .map((row) => withApprovalRate(row)),
        byCity: Array.from(byCityMap.values())
          .sort((left, right) => right.applications - left.applications)
          .map((row) => withApprovalRate(row)),
      },
      filters: {
        groupBy: filters.groupBy,
        dateFrom: filters.dateFrom?.toISOString() ?? null,
        dateTo: filters.dateTo?.toISOString() ?? null,
      },
    },
  });
}
