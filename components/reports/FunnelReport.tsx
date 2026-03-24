'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { apiFetch } from '@/lib/apiClient';
import ReportFiltersComponent, { ReportFilters } from './ReportFilters';

interface FunnelData {
  stages: Array<{
    stage: string;
    count: number;
    conversionFromReference: number;
    dropOffFromReference: number;
  }>;
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
  };
}

export default function FunnelReport() {
  const [data, setData] = useState<FunnelData | null>(null);
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
      if (filters.status) params.append('status', filters.status);
      if (filters.agentId) params.append('agentId', filters.agentId);
      if (filters.carrierId) params.append('carrierId', filters.carrierId);
      if (filters.countryCode) params.append('countryCode', filters.countryCode);
      if (filters.source) params.append('source', filters.source);
      if (filters.medium) params.append('medium', filters.medium);
      if (filters.campaign) params.append('campaign', filters.campaign);

      const response = await apiFetch(`/api/reports/funnel?${params}`);
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

  const stageLabels = {
    created: 'Created',
    submitted: 'Submitted',
    needs_docs: 'Needs Documents',
    approved: 'Approved',
    rejected: 'Rejected',
    resubmitted: 'Resubmitted',
  };

  const stageColors = {
    created: '#8884d8',
    submitted: '#82ca9d',
    needs_docs: '#ffc658',
    approved: '#00C49F',
    rejected: '#ff7c7c',
    resubmitted: '#8dd1e1',
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Conversion Funnel Analysis</h2>
        <p className="text-gray-600">Track application progression through each stage of the approval process</p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showAdvancedFilters={true}
      />

      {/* Funnel Visualization */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Application Funnel</h3>
        <div className="space-y-4">
          {data.stages.map((stage, index) => {
            const widthPercentage = stage.count > 0
              ? Math.max((stage.count / data.stages[0].count) * 100, 5) // Minimum 5% width
              : 0;

            return (
              <div key={stage.stage} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {stageLabels[stage.stage as keyof typeof stageLabels]}
                  </span>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{stage.count.toLocaleString()} applications</span>
                    <span>{(stage.conversionFromReference ?? 0).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative h-12 bg-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-lg transition-all duration-500 ease-out"
                    style={{
                      width: `${widthPercentage}%`,
                      backgroundColor: stageColors[stage.stage as keyof typeof stageColors],
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                {index < data.stages.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <div className="text-xs text-gray-400">
                      ↓ {(stage.conversionFromReference ?? 0).toFixed(1)}% conversion
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Funnel Overview</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={data.stages}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="stage"
              tickFormatter={(value) => stageLabels[value as keyof typeof stageLabels]}
              width={90}
            />
            <Tooltip
              formatter={(value, name) => [(value as number).toLocaleString(), 'Applications']}
              labelFormatter={(label) => stageLabels[label as keyof typeof stageLabels]}
            />
            <Bar
              dataKey="count"
              fill="#8884d8"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Funnel Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drop-off
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.stages.map((stage, index) => {
                const previousCount = index > 0 ? data.stages[index - 1].count : stage.count;
                const dropOff = previousCount - stage.count;
                const dropOffRate = previousCount > 0 ? ((dropOff / previousCount) * 100).toFixed(1) : '0.0';

                return (
                  <tr key={stage.stage} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {stageLabels[stage.stage as keyof typeof stageLabels]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stage.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(stage.conversionFromReference ?? 0).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {index > 0 ? `-${dropOffRate}% (${dropOff.toLocaleString()})` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}