import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import {
  isWithinDateRange,
  matchesCommonFilters,
  parseReportFilters,
} from "@/lib/reports/filters";
import { requireReportActor } from "@/lib/reports/auth";

type FunnelStage =
  | "created"
  | "submitted"
  | "needs_docs"
  | "approved"
  | "rejected"
  | "resubmitted";

type ApplicationRow = {
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
  approved_at: string | null;
  rejected_at: string | null;
  last_resubmitted_at: string | null;
};

type AuditLogRow = {
  application_id: string;
  event_type: string;
  event_data: {
    to?: string;
  } | null;
  performed_at: string | null;
};

const STAGE_ORDER: FunnelStage[] = [
  "created",
  "submitted",
  "needs_docs",
  "approved",
  "rejected",
  "resubmitted",
];

const STAGE_REFERENCE: Record<
  FunnelStage,
  FunnelStage | null
> = {
  created: null,
  submitted: "created",
  needs_docs: "submitted",
  approved: "submitted",
  rejected: "submitted",
  resubmitted: "needs_docs",
};

function addStageEvent(
  stageEvents: Map<FunnelStage, Set<string>>,
  stage: FunnelStage,
  applicationId: string,
  eventAt: string | null,
  hasDateFilter: boolean
) {
  if (hasDateFilter && !eventAt) {
    return;
  }

  const current = stageEvents.get(stage) ?? new Set<string>();
  current.add(applicationId);
  stageEvents.set(stage, current);
}

export async function GET(request: Request) {
  const { errorResponse } = await requireReportActor(request);

  if (errorResponse) {
    return errorResponse;
  }

  const filters = parseReportFilters(request);
  const supabase = createAdminClient();
  const { data: applications, error: applicationsError } = await supabase
    .from("applications")
    .select(
      "id, status_id, agent_id, carrier_id, country_code, region_name, city_name, source, medium, campaign, created_at, submitted_at, approved_at, rejected_at, last_resubmitted_at"
    );

  if (applicationsError) {
    return NextResponse.json({ ok: false, error: applicationsError.message }, { status: 500 });
  }

  const applicationRows = (applications ?? []) as ApplicationRow[];
  const filteredApplications = applicationRows.filter((row) => matchesCommonFilters(row, filters));
  const filteredApplicationIds = new Set(filteredApplications.map((row) => row.id));
  const hasDateFilter = Boolean(filters.dateFrom || filters.dateTo);
  const stageEvents = new Map<FunnelStage, Set<string>>();

  for (const row of filteredApplications) {
    if (isWithinDateRange(row.created_at, filters)) {
      addStageEvent(stageEvents, "created", row.id, row.created_at, hasDateFilter);
    } else if (!hasDateFilter && row.created_at) {
      addStageEvent(stageEvents, "created", row.id, row.created_at, hasDateFilter);
    }

    if (isWithinDateRange(row.submitted_at, filters)) {
      addStageEvent(stageEvents, "submitted", row.id, row.submitted_at, hasDateFilter);
    } else if (!hasDateFilter && row.submitted_at) {
      addStageEvent(stageEvents, "submitted", row.id, row.submitted_at, hasDateFilter);
    }

    if (isWithinDateRange(row.approved_at, filters)) {
      addStageEvent(stageEvents, "approved", row.id, row.approved_at, hasDateFilter);
    } else if (!hasDateFilter && row.approved_at) {
      addStageEvent(stageEvents, "approved", row.id, row.approved_at, hasDateFilter);
    }

    if (isWithinDateRange(row.rejected_at, filters)) {
      addStageEvent(stageEvents, "rejected", row.id, row.rejected_at, hasDateFilter);
    } else if (!hasDateFilter && row.rejected_at) {
      addStageEvent(stageEvents, "rejected", row.id, row.rejected_at, hasDateFilter);
    }

    if (isWithinDateRange(row.last_resubmitted_at, filters)) {
      addStageEvent(stageEvents, "resubmitted", row.id, row.last_resubmitted_at, hasDateFilter);
    } else if (!hasDateFilter && row.last_resubmitted_at) {
      addStageEvent(stageEvents, "resubmitted", row.id, row.last_resubmitted_at, hasDateFilter);
    }

    // For the default (no date filter) view, "Needs Documents" should represent
    // applications that are currently in that stage.
    if (!hasDateFilter && row.status_id === "needs_docs") {
      addStageEvent(stageEvents, "needs_docs", row.id, null, hasDateFilter);
    }
  }

  const { data: auditLogs, error: auditError } = await supabase
    .from("application_audit_logs")
    .select("application_id, event_type, event_data, performed_at");

  if (auditError) {
    return NextResponse.json({ ok: false, error: auditError.message }, { status: 500 });
  }

  for (const row of (auditLogs ?? []) as AuditLogRow[]) {
    if (!filteredApplicationIds.has(row.application_id)) {
      continue;
    }

    if (!isWithinDateRange(row.performed_at, filters) && hasDateFilter) {
      continue;
    }

    const nextStatus = row.event_data?.to;
    const isNeedsDocsEvent =
      row.event_type === "request_documents" ||
      (row.event_type === "status_change" && nextStatus === "needs_docs");

    if (isNeedsDocsEvent) {
      // When a date filter is applied, derive "Needs Documents" from audited events
      // inside the selected time window.
      if (hasDateFilter) {
        addStageEvent(stageEvents, "needs_docs", row.application_id, row.performed_at, hasDateFilter);
      }
      continue;
    }

    if (row.event_type === "resubmit") {
      addStageEvent(stageEvents, "resubmitted", row.application_id, row.performed_at, hasDateFilter);
    }
  }

  const summary = {
    created: stageEvents.get("created")?.size ?? 0,
    submitted: stageEvents.get("submitted")?.size ?? 0,
    needsDocs: stageEvents.get("needs_docs")?.size ?? 0,
    approved: stageEvents.get("approved")?.size ?? 0,
    rejected: stageEvents.get("rejected")?.size ?? 0,
    resubmitted: stageEvents.get("resubmitted")?.size ?? 0,
  };

  const stages = STAGE_ORDER.map((stage) => {
    const count = stageEvents.get(stage)?.size ?? 0;
    const referenceStage = STAGE_REFERENCE[stage];

    if (!referenceStage) {
      return {
        stage,
        count,
        referenceStage: null,
        conversionFromReference: null,
        dropOffFromReference: null,
      };
    }

    const referenceCount = stageEvents.get(referenceStage)?.size ?? 0;
    const conversionFromReference =
      referenceCount === 0 ? 0 : Number(((count / referenceCount) * 100).toFixed(2));
    const dropOffFromReference =
      referenceCount === 0 ? 0 : Number((100 - conversionFromReference).toFixed(2));

    return {
      stage,
      count,
      referenceStage,
      conversionFromReference,
      dropOffFromReference,
    };
  });

  return NextResponse.json(
    {
      ok: true,
      data: {
        summary,
        stages,
        filters: {
          groupBy: filters.groupBy,
          dateFrom: filters.dateFrom?.toISOString() ?? null,
          dateTo: filters.dateTo?.toISOString() ?? null,
        },
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
