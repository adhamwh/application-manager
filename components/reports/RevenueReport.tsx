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

interface RevenueData {
  summary: {
    expectedRevenue: number;
    realizedRevenue: number;
  };
  series: Array<{
    bucket: string;
    expectedRevenue: number;
    realizedRevenue: number;
  }>;
  breakdown: {
    byCarrier: Array<{
      carrierId: string;
      carrierName: string;
      expectedRevenue: number;
      realizedRevenue: number;
    }>;
  };
  currencyCode: string;
  filters: {
    groupBy: string;
    dateFrom: string | null;
    dateTo: string | null;
  };
}

export default function RevenueReport() {
  const [data, setData] = useState<RevenueData | null>(null);
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

      const response = await apiFetch(`/api/reports/revenue?${params}`);
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

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  const currency = data.currencyCode || 'USD';

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Reports</h2>
        <p className="text-gray-600">Track expected and realized revenue across applications and carriers</p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showAdvancedFilters={true}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">💰</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Expected Revenue</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {formatCurrency(data.summary.expectedRevenue, currency)}
              </dd>
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
              <dt className="text-sm font-medium text-gray-500 truncate">Realized Revenue</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {formatCurrency(data.summary.realizedRevenue, currency)}
              </dd>
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
              <dt className="text-sm font-medium text-gray-500 truncate">Realization Rate</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {data.summary.expectedRevenue > 0
                  ? ((data.summary.realizedRevenue / data.summary.expectedRevenue) * 100).toFixed(1)
                  : '0.0'}%
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis tickFormatter={(value) => formatCurrency(value, currency)} />
              <Tooltip formatter={(value) => [formatCurrency(value as number, currency), '']} />
              <Legend />
              <Line
                type="monotone"
                dataKey="expectedRevenue"
                stroke="#8884d8"
                strokeWidth={2}
                name="Expected Revenue"
              />
              <Line
                type="monotone"
                dataKey="realizedRevenue"
                stroke="#82ca9d"
                strokeWidth={2}
                name="Realized Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis tickFormatter={(value) => formatCurrency(value, currency)} />
              <Tooltip formatter={(value) => [formatCurrency(value as number, currency), '']} />
              <Legend />
              <Bar dataKey="expectedRevenue" fill="#8884d8" name="Expected" />
              <Bar dataKey="realizedRevenue" fill="#82ca9d" name="Realized" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Carrier Performance Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Revenue by Carrier</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Realized Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Realization Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.breakdown.byCarrier.map((carrier, index) => {
                const realizationRate = carrier.expectedRevenue > 0
                  ? ((carrier.realizedRevenue / carrier.expectedRevenue) * 100).toFixed(1)
                  : '0.0';

                return (
                  <tr key={carrier.carrierId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {carrier.carrierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(carrier.expectedRevenue, currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(carrier.realizedRevenue, currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {realizationRate}%
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