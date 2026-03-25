"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type AddApplicationCardProps = {
  onCreated?: () => void;
};

type Agent = { id: string; full_name: string; email: string };
type Carrier = { id: string; name: string };

const AddApplicationCard = ({ onCreated }: AddApplicationCardProps) => {
  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    statusId: "submitted",
    agentId: "",
    carrierId: "",
    submittedAt: "",
    notes: "",
  });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        setLookupError(null);
        const [agentsRes, carriersRes] = await Promise.all([
          apiFetch("/api/agents"),
          apiFetch("/api/carriers"),
        ]);
        const agentsResult = await agentsRes.json();
        const carriersResult = await carriersRes.json();

        if (!agentsRes.ok || !agentsResult.ok) {
          throw new Error(agentsResult.error || "Failed to load agents");
        }

        if (!carriersRes.ok || !carriersResult.ok) {
          throw new Error(carriersResult.error || "Failed to load carriers");
        }

        setAgents(agentsResult.data ?? []);
        setCarriers(carriersResult.data ?? []);
      } catch (lookupFetchError) {
        setLookupError(
          lookupFetchError instanceof Error ? lookupFetchError.message : "Failed to load lookups"
        );
      }
    };

    loadLookups();

    const handleAuthChange = () => {
      loadLookups();
    };

    window.addEventListener("admin-man-auth-changed", handleAuthChange);
    return () => window.removeEventListener("admin-man-auth-changed", handleAuthChange);
  }, []);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await apiFetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_name: form.applicantName,
          applicant_email: form.applicantEmail || undefined,
          status_id: form.statusId,
          agent_id: form.agentId || undefined,
          carrier_id: form.carrierId || undefined,
          submitted_at: form.submittedAt || undefined,
          notes: form.notes || undefined,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Failed to create application");
      }

      setForm({
        applicantName: "",
        applicantEmail: "",
        statusId: "submitted",
        agentId: "",
        carrierId: "",
        submittedAt: "",
        notes: "",
      });
      setOpen(false);
      setMessage("Application created successfully.");
      onCreated?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col gap-2 px-6 py-5 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Add Application</h2>
        <p className="text-sm text-gray-600">
          Create a new application entry for testing or live intake.
        </p>
      </div>
      <div className="px-6 py-5">
        {!open ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setMessage(null);
                setError(null);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
            >
              Create Application
            </button>
            {message && <span className="text-sm text-emerald-700">{message}</span>}
            {lookupError && <span className="text-sm text-red-600">{lookupError}</span>}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicant Name</label>
                <input
                  type="text"
                  required
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.applicantName}
                  onChange={(event) => handleChange("applicantName", event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applicant Email</label>
                <input
                  type="email"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.applicantEmail}
                  onChange={(event) => handleChange("applicantEmail", event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.statusId}
                  onChange={(event) => handleChange("statusId", event.target.value)}
                >
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="needs_docs">Needs Documents</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resubmitted">Resubmitted</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Agent</label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.agentId}
                  onChange={(event) => handleChange("agentId", event.target.value)}
                >
                  <option value="">Unassigned</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Carrier</label>
                <select
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.carrierId}
                  onChange={(event) => handleChange("carrierId", event.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Submitted</label>
                <input
                  type="date"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={form.submittedAt}
                  onChange={(event) => handleChange("submittedAt", event.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Comments</label>
                <textarea
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  rows={3}
                  value={form.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-60"
              >
                {loading ? "Creating..." : "Create Application"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                  setMessage(null);
                }}
                className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors shadow-sm"
              >
                Cancel
              </button>
              {message && <span className="text-sm text-emerald-700">{message}</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
              {lookupError && <span className="text-sm text-red-600">{lookupError}</span>}
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default AddApplicationCard;
