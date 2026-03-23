import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import {
  createReportFilters,
  formatBucket,
  isWithinDateRange,
  matchesCommonFilters,
} from "@/lib/reports/filters";
import { requireReportActor } from "@/lib/reports/auth";

type CustomMetric =
  | "applications_count"
  | "submitted_count"
  | "needs_docs_count"
  | "approved_count"
  | "rejected_count"
  | "approval_rate"
  | "expected_revenue_sum"
  | "realized_revenue_sum";

type CustomDimension =
  | "day"
  | "week"
  | "month"
  | "status"
  | "agent"
  | "carrier"
  | "country"
  | "region"
  | "city"
  | "source"
  | "medium"
  | "campaign";

type CustomReportRow = {
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
  submitted_at: string | null;
  expected_revenue: number | string | null;
  realized_revenue: number | string | null;
  agents?: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
  carriers?: { id: string; name: string } | { id: string; name: string }[] | null;
};

const ALLOWED_METRICS: CustomMetric[] = [
  "applications_count",
  "submitted_count",
  "needs_docs_count",
  "approved_count",
  "rejected_count",
  "approval_rate",
  "expected_revenue_sum",
  "realized_revenue_sum",
];

const ALLOWED_DIMENSIONS: CustomDimension[] = [
  "day",
  "week",
  "month",
  "status",
  "agent",
  "carrier",
  "country",
  "region",
  "city",
  "source",
  "medium",
  "campaign",
];

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

function getDimensionValue(row: CustomReportRow, dimension: CustomDimension, groupBy: string) {
  if (dimension === "day" || dimension === "week" || dimension === "month") {
    if (!row.created_at) {
      return null;
    }

    return formatBucket(new Date(row.created_at), groupBy as "day" | "week" | "month");
  }

  if (dimension === "status") {
    return row.status_id || "unknown";
  }

  if (dimension === "agent") {
    const agent = firstRelation(row.agents);
    return JSON.stringify({
      agentId: row.agent_id ?? "unassigned",
      agentName: agent?.full_name ?? "Unassigned",
    });
  }

  if (dimension === "carrier") {
    const carrier = firstRelation(row.carriers);
    return JSON.stringify({
      carrierId: row.carrier_id ?? "unassigned",
      carrierName: carrier?.name ?? "Unassigned",
    });
  }

  if (dimension === "country") {
    return JSON.stringify({
      countryCode: row.country_code ?? "unknown",
      countryName: row.country_name ?? "Unknown",
    });
  }

  if (dimension === "region") {
    return JSON.stringify({
      regionName: row.region_name ?? "Unknown",
    });
  }

  if (dimension === "city") {
    return JSON.stringify({
      cityName: row.city_name ?? "Unknown",
    });
  }

  if (dimension === "source") {
    return row.source ?? "unknown";
  }

  if (dimension === "medium") {
    return row.medium ?? "unknown";
  }

  return row.campaign ?? "unknown";
}

export async function POST(request: Request) {
  const { errorResponse } = await requireReportActor(request);

  if (errorResponse) {
    return errorResponse;
  }

  const body = (await request.json().catch(() => ({}))) as {
    metric?: string;
    dimensions?: string[];
    filters?: {
      groupBy?: string | null;
      dateFrom?: string | null;
      dateTo?: string | null;
      status?: string | null;
      agentId?: string | null;
      carrierId?: string | null;
      countryCode?: string | null;
      regionName?: string | null;
      cityName?: string | null;
      source?: string | null;
      medium?: string | null;
      campaign?: string | null;
    };
  };

  if (!body.metric || !ALLOWED_METRICS.includes(body.metric as CustomMetric)) {
    return NextResponse.json({ ok: false, error: "Invalid metric" }, { status: 400 });
  }

  const dimensions = Array.isArray(body.dimensions) ? body.dimensions : [];
  const invalidDimension = dimensions.find(
    (dimension) => !ALLOWED_DIMENSIONS.includes(dimension as CustomDimension)
  );

  if (invalidDimension) {
    return NextResponse.json({ ok: false, error: `Invalid dimension: ${invalidDimension}` }, { status: 400 });
  }

  const filters = createReportFilters(body.filters ?? {});
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status_id, agent_id, carrier_id, country_code, country_name, region_name, city_name, source, medium, campaign, created_at, submitted_at, expected_revenue, realized_revenue, agents(id, full_name), carriers(id, name)"
    );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as CustomReportRow[];
  const filteredRows = rows.filter(
    (row) => matchesCommonFilters(row, filters) && isWithinDateRange(row.created_at, filters)
  );

  const groups = new Map<
    string,
    {
      values: Record<string, string | number | null>;
      applicationsCount: number;
      submittedCount: number;
      needsDocsCount: number;
      approvedCount: number;
      rejectedCount: number;
      reviewedCount: number;
      expectedRevenueSum: number;
      realizedRevenueSum: number;
    }
  >();

  for (const row of filteredRows) {
    const keyValues: Record<string, string | number | null> = {};

    for (const dimension of dimensions as CustomDimension[]) {
      const rawValue = getDimensionValue(row, dimension, filters.groupBy);

      if (rawValue && rawValue.startsWith("{")) {
        Object.assign(keyValues, JSON.parse(rawValue));
      } else {
        keyValues[dimension] = rawValue;
      }
    }

    const groupKey = JSON.stringify(keyValues);
    const current = groups.get(groupKey) ?? {
      values: keyValues,
      applicationsCount: 0,
      submittedCount: 0,
      needsDocsCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      reviewedCount: 0,
      expectedRevenueSum: 0,
      realizedRevenueSum: 0,
    };

    current.applicationsCount += 1;
    if (row.submitted_at) current.submittedCount += 1;
    if (row.status_id === "needs_docs") current.needsDocsCount += 1;
    if (row.status_id === "approved") {
      current.approvedCount += 1;
      current.reviewedCount += 1;
    }
    if (row.status_id === "rejected") {
      current.rejectedCount += 1;
      current.reviewedCount += 1;
    }
    current.expectedRevenueSum += toAmount(row.expected_revenue);
    current.realizedRevenueSum += toAmount(row.realized_revenue);
    groups.set(groupKey, current);
  }

  const metric = body.metric as CustomMetric;
  const resultRows = Array.from(groups.values()).map((group) => {
    let value = 0;

    switch (metric) {
      case "applications_count":
        value = group.applicationsCount;
        break;
      case "submitted_count":
        value = group.submittedCount;
        break;
      case "needs_docs_count":
        value = group.needsDocsCount;
        break;
      case "approved_count":
        value = group.approvedCount;
        break;
      case "rejected_count":
        value = group.rejectedCount;
        break;
      case "approval_rate":
        value =
          group.reviewedCount === 0
            ? 0
            : Number(((group.approvedCount / group.reviewedCount) * 100).toFixed(2));
        break;
      case "expected_revenue_sum":
        value = Number(group.expectedRevenueSum.toFixed(2));
        break;
      case "realized_revenue_sum":
        value = Number(group.realizedRevenueSum.toFixed(2));
        break;
    }

    return {
      ...group.values,
      value,
    };
  });

  resultRows.sort((left, right) => {
    const leftValue = typeof left.value === "number" ? left.value : 0;
    const rightValue = typeof right.value === "number" ? right.value : 0;
    return rightValue - leftValue;
  });

  return NextResponse.json({
    ok: true,
    data: {
      metric,
      dimensions,
      rows: resultRows,
      filters: {
        groupBy: filters.groupBy,
        dateFrom: filters.dateFrom?.toISOString() ?? null,
        dateTo: filters.dateTo?.toISOString() ?? null,
      },
    },
  });
}
