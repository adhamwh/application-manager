"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Eye, FileText, RotateCcw, User, X } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

type StatusRecord = {
  id: string;
  label: string;
};

type AgentRecord = {
  id: string;
  full_name: string;
  email: string;
} | null;

type CarrierRecord = {
  id: string;
  name: string;
} | null;

type ApplicationApiRow = {
  id: string;
  applicant_name: string | null;
  applicant_email: string | null;
  status_id: string;
  agent_id: string | null;
  carrier_id: string | null;
  submitted_at: string | null;
  requested_documents: unknown;
  data: { notes?: string | null } | null;
  agents?: AgentRecord[] | AgentRecord;
  carriers?: CarrierRecord[] | CarrierRecord;
  application_statuses?: StatusRecord[] | StatusRecord;
};

type ApplicationRow = {
  id: string;
  applicant_name: string;
  applicant_email: string | null;
  status_id: string;
  status_label: string;
  agent_id: string | null;
  agent_name: string;
  carrier_id: string | null;
  carrier_name: string;
  submitted_at: string | null;
  notes: string | null;
  requested_documents: string[];
};

type AgentLookup = {
  id: string;
  full_name: string;
};

type CarrierLookup = {
  id: string;
  name: string;
};

type ActiveAction =
  | { type: "view"; app: ApplicationRow }
  | { type: "approve"; app: ApplicationRow }
  | { type: "reject"; app: ApplicationRow }
  | { type: "request_docs"; app: ApplicationRow }
  | { type: "assign"; app: ApplicationRow }
  | { type: "resubmit"; app: ApplicationRow };

const STATUS_OPTIONS = [
  { id: "draft", label: "Draft" },
  { id: "submitted", label: "Submitted" },
  { id: "needs_docs", label: "Needs Documents" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "resubmitted", label: "Resubmitted" },
];

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

function firstRelation<T>(value: T[] | T | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function toApplicationRow(app: ApplicationApiRow): ApplicationRow {
  const agent = firstRelation(app.agents);
  const carrier = firstRelation(app.carriers);
  const status = firstRelation(app.application_statuses);
  const requestedDocuments = Array.isArray(app.requested_documents)
    ? app.requested_documents.filter((document): document is string => typeof document === "string")
    : [];

  return {
    id: typeof app.id === "string" ? app.id.trim() : "",
    applicant_name: app.applicant_name ?? "Unknown applicant",
    applicant_email: app.applicant_email ?? null,
    status_id: app.status_id,
    status_label: status?.label ?? app.status_id ?? "Unknown",
    agent_id: app.agent_id ?? null,
    agent_name: agent?.full_name ?? "Unassigned",
    carrier_id: app.carrier_id ?? null,
    carrier_name: carrier?.name ?? "Unassigned",
    submitted_at: app.submitted_at ?? null,
    notes: app.data?.notes ?? null,
    requested_documents: requestedDocuments,
  };
}

const ApplicationsTable = ({ refreshToken = 0 }: { refreshToken?: number }) => {
  const [filters, setFilters] = useState({
    status: "",
    agent: "",
    search: "",
  });
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [agents, setAgents] = useState<AgentLookup[]>([]);
  const [carriers, setCarriers] = useState<CarrierLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [actionForm, setActionForm] = useState({
    notes: "",
    documents: "",
    agentId: "",
    carrierId: "",
    payload: "",
  });

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setActionError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.agent && isUuid(filters.agent)) {
        params.append("agentId", filters.agent);
      }
      if (filters.search) params.append("search", filters.search);

      const response = await apiFetch(`/api/applications?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to fetch applications");
      }

      const transformedData = (result.data as ApplicationApiRow[]).map(toApplicationRow);
      const validRows = transformedData.filter((app) => isUuid(app.id));

      if (validRows.length !== transformedData.length) {
        setActionError("Some applications were skipped because they have invalid IDs.");
      }

      setApplications(validRows);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters.agent, filters.search, filters.status]);

  const loadLookups = useCallback(async () => {
    try {
      const [agentsResponse, carriersResponse] = await Promise.all([
        apiFetch("/api/agents"),
        apiFetch("/api/carriers"),
      ]);
      const [agentsResult, carriersResult] = await Promise.all([
        agentsResponse.json(),
        carriersResponse.json(),
      ]);

      if (agentsResponse.ok && agentsResult.ok) {
        setAgents(
          (agentsResult.data ?? []).filter(
            (agent: AgentLookup) =>
              typeof agent.id === "string" && typeof agent.full_name === "string"
          )
        );
      } else {
        setAgents([]);
      }

      if (carriersResponse.ok && carriersResult.ok) {
        setCarriers(
          (carriersResult.data ?? []).filter(
            (carrier: CarrierLookup) =>
              typeof carrier.id === "string" && typeof carrier.name === "string"
          )
        );
      } else {
        setCarriers([]);
      }
    } catch {
      setAgents([]);
      setCarriers([]);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    loadLookups();

    const handleAuthChange = () => {
      fetchApplications();
      loadLookups();
    };

    window.addEventListener("admin-man-auth-changed", handleAuthChange);
    return () => window.removeEventListener("admin-man-auth-changed", handleAuthChange);
  }, [fetchApplications, loadLookups, refreshToken]);

  const getStatusBadge = (status: string) => {
    const badges = {
      Draft: "bg-gray-100 text-gray-800",
      Submitted: "bg-blue-100 text-blue-800",
      "Needs Documents": "bg-orange-100 text-orange-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
      Resubmitted: "bg-indigo-100 text-indigo-800",
    };

    return badges[status as keyof typeof badges] || "bg-gray-100 text-gray-800";
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleDateString();
  };

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const openAction = (type: ActiveAction["type"], app: ApplicationRow) => {
    const appId = app.id.trim().replace(/^"+|"+$/g, "");
    if (!isUuid(appId)) {
      setActionError("This application has an invalid id and cannot be updated.");
      return;
    }

    setActionMessage(null);
    setActionError(null);
    setActiveAction({ type, app: { ...app, id: appId } } as ActiveAction);
    setActionForm({
      notes: "",
      documents: app.requested_documents.join(", "),
      agentId: app.agent_id ?? "",
      carrierId: app.carrier_id ?? "",
      payload: "",
    });
  };

  const closeAction = () => {
    setActiveAction(null);
    setActionError(null);
  };

  const handleActionSubmit = async () => {
    if (!activeAction) return;

    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const appId = activeAction.app.id.trim().replace(/^"+|"+$/g, "");
      if (!isUuid(appId)) {
        throw new Error(`Invalid application id: ${activeAction.app.id}`);
      }

      if (activeAction.type === "approve" || activeAction.type === "reject") {
        const statusId = activeAction.type === "approve" ? "approved" : "rejected";
        const response = await apiFetch(`/api/applications/${appId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ statusId, notes: actionForm.notes || undefined }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to update status");
        }
        setActionMessage(`Application ${statusId}.`);
      }

      if (activeAction.type === "request_docs") {
        const docs = actionForm.documents
          .split(",")
          .map((doc) => doc.trim())
          .filter(Boolean);

        if (docs.length === 0) {
          throw new Error("Please provide at least one required document.");
        }

        const response = await apiFetch(`/api/applications/${appId}/request-documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requiredDocuments: docs,
            message: actionForm.notes || undefined,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to request documents");
        }
        setActionMessage("Document request sent.");
      }

      if (activeAction.type === "assign") {
        if (actionForm.agentId && !isUuid(actionForm.agentId)) {
          throw new Error("Please select a valid agent.");
        }
        const response = await apiFetch(`/api/applications/${appId}/assign`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: actionForm.agentId || null }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to assign agent");
        }
        setActionMessage("Agent assignment updated.");
      }

      if (activeAction.type === "resubmit") {
        const payloadText = actionForm.payload.trim();
        let payload: unknown = undefined;

        if (payloadText) {
          try {
            payload = JSON.parse(payloadText);
          } catch {
            payload = payloadText;
          }
        }

        const carrierId = actionForm.carrierId.trim();
        if (carrierId && !isUuid(carrierId)) {
          throw new Error("Please select a valid carrier.");
        }

        const response = await apiFetch(`/api/applications/${appId}/resubmit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carrierId: carrierId || undefined,
            payload,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Failed to resubmit application");
        }
        setActionMessage("Application resubmitted to carrier.");
      }

      await fetchApplications();
      closeAction();
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    if (applications.length === 0) {
      setExportMessage("No applications available to export.");
      return;
    }

    setExportMessage(null);

    try {
      const response = await apiFetch(`/api/applications/export?format=${format}`);
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Failed to export applications");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "excel" ? "applications.xlsx" : "applications.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setExportMessage(
        downloadError instanceof Error ? downloadError.message : "Failed to export applications"
      );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-5 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={filters.status}
              onChange={(event) => handleFilterChange("status", event.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={filters.agent}
              onChange={(event) => handleFilterChange("agent", event.target.value)}
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="xl:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by applicant name or email"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-500 shadow-sm hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={filters.search}
              onChange={(event) => handleFilterChange("search", event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={() => handleExport("excel")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export to PDF
          </button>
        </div>
        {exportMessage && <p className="mt-3 text-sm text-gray-700">{exportMessage}</p>}
        {actionMessage && <p className="mt-3 text-sm text-emerald-700">{actionMessage}</p>}
        {actionError && <p className="mt-3 text-sm text-red-600">{actionError}</p>}
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading applications...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">Error: {error}</p>
            <button
              onClick={fetchApplications}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applicant Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.applicant_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          app.status_label
                        )}`}
                      >
                        {app.status_label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.carrier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(app.submitted_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => openAction("view", app)}
                          title="View application details"
                          aria-label="View application details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => openAction("approve", app)}
                          title="Approve application"
                          aria-label="Approve application"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => openAction("reject", app)}
                          title="Reject application"
                          aria-label="Reject application"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          className="text-orange-600 hover:text-orange-900"
                          onClick={() => openAction("request_docs", app)}
                          title="Request additional documents"
                          aria-label="Request additional documents"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          className="text-purple-600 hover:text-purple-900"
                          onClick={() => openAction("assign", app)}
                          title="Assign agent"
                          aria-label="Assign agent"
                        >
                          <User className="w-4 h-4" />
                        </button>
                        <button
                          className="text-indigo-600 hover:text-indigo-900"
                          onClick={() => openAction("resubmit", app)}
                          title="Resubmit to carrier"
                          aria-label="Resubmit to carrier"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {activeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {activeAction.type === "view" && "Application Details"}
                {activeAction.type === "approve" && "Approve Application"}
                {activeAction.type === "reject" && "Reject Application"}
                {activeAction.type === "request_docs" && "Request Additional Documents"}
                {activeAction.type === "assign" && "Assign Agent"}
                {activeAction.type === "resubmit" && "Resubmit to Carrier"}
              </h3>
              <button onClick={closeAction} className="text-sm text-gray-500 hover:text-gray-700">
                Close
              </button>
            </div>
            <div className="px-6 py-5">
              {activeAction.type === "view" && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-gray-400">Applicant</p>
                    <p className="text-sm text-gray-900">{activeAction.app.applicant_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Email</p>
                    <p className="text-sm text-gray-900">{activeAction.app.applicant_email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Status</p>
                    <p className="text-sm text-gray-900">{activeAction.app.status_label}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Agent</p>
                    <p className="text-sm text-gray-900">{activeAction.app.agent_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Carrier</p>
                    <p className="text-sm text-gray-900">{activeAction.app.carrier_name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-400">Submitted</p>
                    <p className="text-sm text-gray-900">{formatDate(activeAction.app.submitted_at)}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase text-gray-400">Notes</p>
                    <p className="text-sm text-gray-900">{activeAction.app.notes || "-"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase text-gray-400">Requested Documents</p>
                    <p className="text-sm text-gray-900">
                      {activeAction.app.requested_documents.length > 0
                        ? activeAction.app.requested_documents.join(", ")
                        : "-"}
                    </p>
                  </div>
                </div>
              )}

              {activeAction.type !== "view" && (
                <div className="space-y-4">
                  {(activeAction.type === "approve" || activeAction.type === "reject") && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notes / Comments
                      </label>
                      <textarea
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        rows={3}
                        value={actionForm.notes}
                        onChange={(event) =>
                          setActionForm((current) => ({ ...current, notes: event.target.value }))
                        }
                      />
                    </div>
                  )}

                  {activeAction.type === "request_docs" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Required Documents (comma-separated)
                        </label>
                        <input
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          value={actionForm.documents}
                          onChange={(event) =>
                            setActionForm((current) => ({
                              ...current,
                              documents: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Message
                        </label>
                        <textarea
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          rows={3}
                          value={actionForm.notes}
                          onChange={(event) =>
                            setActionForm((current) => ({ ...current, notes: event.target.value }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {activeAction.type === "assign" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign Agent
                      </label>
                      <select
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        value={actionForm.agentId}
                        onChange={(event) =>
                          setActionForm((current) => ({ ...current, agentId: event.target.value }))
                        }
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeAction.type === "resubmit" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Carrier
                        </label>
                        <select
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          value={actionForm.carrierId}
                          onChange={(event) =>
                            setActionForm((current) => ({
                              ...current,
                              carrierId: event.target.value,
                            }))
                          }
                        >
                          <option value="">No carrier</option>
                          {carriers.map((carrier) => (
                            <option key={carrier.id} value={carrier.id}>
                              {carrier.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payload (optional JSON or text)
                        </label>
                        <textarea
                          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          rows={4}
                          value={actionForm.payload}
                          onChange={(event) =>
                            setActionForm((current) => ({
                              ...current,
                              payload: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </>
                  )}

                  {actionError && <p className="text-sm text-red-600">{actionError}</p>}
                </div>
              )}
            </div>

            {activeAction.type !== "view" && (
              <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
                <button
                  onClick={closeAction}
                  className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={actionLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  {actionLoading ? "Working..." : "Confirm"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsTable;
