export type ReportGroupBy = "day" | "week" | "month";

export type ReportFilters = {
  dateFrom: Date | null;
  dateTo: Date | null;
  groupBy: ReportGroupBy;
  status: string | null;
  agentId: string | null;
  carrierId: string | null;
  countryCode: string | null;
  regionName: string | null;
  cityName: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

function normalizeDate(value: string | null, endOfDay: boolean) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsed.setUTCHours(23, 59, 59, 999);
  } else {
    parsed.setUTCHours(0, 0, 0, 0);
  }

  return parsed;
}

function normalizeText(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

type ReportFilterInput = {
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

export function createReportFilters(input: ReportFilterInput): ReportFilters {
  const rawGroupBy = input.groupBy;
  const groupBy: ReportGroupBy =
    rawGroupBy === "day" || rawGroupBy === "week" || rawGroupBy === "month"
      ? rawGroupBy
      : "month";

  return {
    dateFrom: normalizeDate(input.dateFrom ?? null, false),
    dateTo: normalizeDate(input.dateTo ?? null, true),
    groupBy,
    status: normalizeText(input.status ?? null),
    agentId: normalizeText(input.agentId ?? null),
    carrierId: normalizeText(input.carrierId ?? null),
    countryCode: normalizeText(input.countryCode ?? null),
    regionName: normalizeText(input.regionName ?? null),
    cityName: normalizeText(input.cityName ?? null),
    source: normalizeText(input.source ?? null),
    medium: normalizeText(input.medium ?? null),
    campaign: normalizeText(input.campaign ?? null),
  };
}

export function parseReportFilters(request: Request): ReportFilters {
  const url = new URL(request.url);

  return createReportFilters({
    groupBy: url.searchParams.get("groupBy"),
    dateFrom: url.searchParams.get("dateFrom"),
    dateTo: url.searchParams.get("dateTo"),
    status: url.searchParams.get("status"),
    agentId: url.searchParams.get("agentId"),
    carrierId: url.searchParams.get("carrierId"),
    countryCode: url.searchParams.get("countryCode"),
    regionName: url.searchParams.get("regionName"),
    cityName: url.searchParams.get("cityName"),
    source: url.searchParams.get("source"),
    medium: url.searchParams.get("medium"),
    campaign: url.searchParams.get("campaign"),
  });
}

export function matchesCommonFilters<
  T extends {
    status_id?: string | null;
    agent_id?: string | null;
    carrier_id?: string | null;
    country_code?: string | null;
    region_name?: string | null;
    city_name?: string | null;
    source?: string | null;
    medium?: string | null;
    campaign?: string | null;
  },
>(row: T, filters: ReportFilters) {
  if (filters.status && row.status_id !== filters.status) return false;
  if (filters.agentId && row.agent_id !== filters.agentId) return false;
  if (filters.carrierId && row.carrier_id !== filters.carrierId) return false;
  if (filters.countryCode && row.country_code !== filters.countryCode) return false;
  if (filters.regionName && row.region_name !== filters.regionName) return false;
  if (filters.cityName && row.city_name !== filters.cityName) return false;
  if (filters.source && row.source !== filters.source) return false;
  if (filters.medium && row.medium !== filters.medium) return false;
  if (filters.campaign && row.campaign !== filters.campaign) return false;
  return true;
}

export function isWithinDateRange(value: string | null, filters: ReportFilters) {
  if (!value) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  if (filters.dateFrom && parsed < filters.dateFrom) {
    return false;
  }

  if (filters.dateTo && parsed > filters.dateTo) {
    return false;
  }

  return true;
}

export function formatBucket(date: Date, groupBy: ReportGroupBy) {
  const utcYear = date.getUTCFullYear();
  const utcMonth = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const utcDay = `${date.getUTCDate()}`.padStart(2, "0");

  if (groupBy === "day") {
    return `${utcYear}-${utcMonth}-${utcDay}`;
  }

  if (groupBy === "week") {
    const start = new Date(Date.UTC(utcYear, date.getUTCMonth(), date.getUTCDate()));
    const day = start.getUTCDay() || 7;
    start.setUTCDate(start.getUTCDate() - day + 1);
    const startMonth = `${start.getUTCMonth() + 1}`.padStart(2, "0");
    const startDay = `${start.getUTCDate()}`.padStart(2, "0");
    return `${start.getUTCFullYear()}-${startMonth}-${startDay}`;
  }

  return `${utcYear}-${utcMonth}`;
}
