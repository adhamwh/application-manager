'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { apiFetch } from '@/lib/apiClient';
import ReportFiltersComponent, { ReportFilters } from './ReportFilters';

interface ApprovalRatesData {
  summary: {
    reviewed: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  };
  series: Array<{
    bucket: string;
    reviewed: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }>;
  breakdown: {
    byAgent: Array<{
      agentId: string;
      agentName: string;
      reviewed: number;
      approved: number;
      rejected: number;
      approvalRate: number;
    }>;
  };
  filters: {
    groupBy: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
}

export default function ApprovalRatesReport() {
  const [data, setData] = useState<ApprovalRatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    groupBy: 'month',
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      params.append('groupBy', filters.groupBy);
      if (filters.status) params.append('status', filters.status);
      if (filters.agentId) params.append('agentId', filters.agentId);
      if (filters.carrierId) params.append('carrierId', filters.carrierId);
      if (filters.countryCode) params.append('countryCode', filters.countryCode);
      if (filters.source) params.append('source', filters.source);
      if (filters.medium) params.append('medium', filters.medium);
      if (filters.campaign) params.append('campaign', filters.campaign);

      const response = await apiFetch(`/api/reports/approval-rates?${params}`);
      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading report</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-4">
              <button
                onClick={fetchData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Application Approval Rates</h2>
        <p className="text-gray-600">Monitor approval and rejection trends across time and agents</p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showAdvancedFilters={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">📋</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Reviewed</dt>
              <dd className="text-2xl font-semibold text-gray-900">{data.summary.reviewed.toLocaleString()}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
              <dd className="text-2xl font-semibold text-gray-900">{data.summary.approved.toLocaleString()}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">❌</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
              <dd className="text-2xl font-semibold text-gray-900">{data.summary.rejected.toLocaleString()}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Approval Rate</dt>
              <dd className="text-2xl font-semibold text-gray-900">{data.summary.approvalRate.toFixed(1)}%</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Approval Rate Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Approval Rate Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${value}%`, 'Approval Rate']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="approvalRate"
                stroke="#8884d8"
                strokeWidth={2}
                name="Approval Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Volume by Status */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Decision Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="approved" stackId="a" fill="#82ca9d" name="Approved" />
              <Bar dataKey="rejected" stackId="a" fill="#ff7c7c" name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agent Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approved
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rejected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.breakdown.byAgent.map((agent, index) => (
                <tr key={agent.agentId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {agent.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.reviewed.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {agent.approved.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {agent.rejected.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {agent.approvalRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}