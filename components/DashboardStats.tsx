"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

interface StatsData {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitingForDocuments: number;
}

const DashboardStats = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const statuses = ["submitted", "approved", "rejected", "needs_docs"] as const;
        const [allResponse, ...statusResponses] = await Promise.all([
          apiFetch("/api/applications?page=1&pageSize=1"),
          ...statuses.map((status) =>
            apiFetch(`/api/applications?status=${status}&page=1&pageSize=1`)
          ),
        ]);

        const responses = await Promise.all([allResponse, ...statusResponses].map((response) => response.json()));
        const [allApplications, submitted, approved, rejected, needsDocs] = responses;

        if (!allApplications.ok) {
          throw new Error(allApplications.error || "Failed to fetch total application count");
        }

        setStats({
          total: allApplications.meta?.total ?? 0,
          pending: submitted.meta?.total ?? 0,
          approved: approved.meta?.total ?? 0,
          rejected: rejected.meta?.total ?? 0,
          waitingForDocuments: needsDocs.meta?.total ?? 0,
        });
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const handleAuthChange = () => {
      fetchStats();
    };

    window.addEventListener("admin-man-auth-changed", handleAuthChange);
    return () => window.removeEventListener("admin-man-auth-changed", handleAuthChange);
  }, []);

  const statCards = [
    {
      title: 'Total Applications',
      value: stats?.total || 0,
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      title: 'Pending Applications',
      value: stats?.pending || 0,
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'Approved Applications',
      value: stats?.approved || 0,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Rejected Applications',
      value: stats?.rejected || 0,
      icon: XCircle,
      color: 'text-red-600'
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="col-span-full bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-red-600">Error loading statistics: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat) => (
        <div key={stat.title} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
            </div>
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
