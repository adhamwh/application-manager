'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { apiFetch } from '@/lib/apiClient';
import ReportFiltersComponent, { ReportFilters } from './ReportFilters';

interface GeographyData {
  byCountry: Array<{
    countryCode: string;
    countryName: string;
    applications: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }>;
  byRegion: Array<{
    countryCode: string | null;
    regionName: string;
    applications: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }>;
  byCity: Array<{
    countryCode: string | null;
    regionName: string | null;
    cityName: string;
    applications: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }>;
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function GeographyReport() {
  const [data, setData] = useState<GeographyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    groupBy: 'month',
  });
  const [viewMode, setViewMode] = useState<'country' | 'region' | 'city'>('country');

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

      const response = await apiFetch(`/api/reports/geography?${params}`);
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

  const getCurrentData = (): Array<{
    location: string;
    applications: number;
    approved: number;
    rejected: number;
    approvalRate: number;
  }> => {
    const rawData = (() => {
      switch (viewMode) {
        case 'country':
          return data.byCountry;
        case 'region':
          return data.byRegion;
        case 'city':
          return data.byCity;
        default:
          return data.byCountry;
      }
    })() ?? [];

    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map((item) => ({
      location: (item as any)[getDataKey()] || 'Unknown',
      applications: item.applications,
      approved: item.approved,
      rejected: item.rejected,
      approvalRate: item.approvalRate,
    }));
  };

  const getDataKey = () => {
    switch (viewMode) {
      case 'country':
        return 'countryName';
      case 'region':
        return 'regionName';
      case 'city':
        return 'cityName';
      default:
        return 'countryName';
    }
  };

  const currentData = getCurrentData();
  const dataKey = getDataKey();

  // Prepare data for pie chart (applications by location)
  const pieData = currentData.map((item, index) => ({
    name: item.location,
    value: item.applications,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Geographic Analytics</h2>
        <p className="text-gray-600">Analyze application distribution and approval rates by geographic location</p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showAdvancedFilters={true}
      />

      {/* View Mode Selector */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setViewMode('country')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'country'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Country
          </button>
          <button
            onClick={() => setViewMode('region')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'region'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By Region
          </button>
          <button
            onClick={() => setViewMode('city')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              viewMode === 'city'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            By City
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">🌍</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Locations</dt>
              <dd className="text-2xl font-semibold text-gray-900">{currentData.length}</dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Applications</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {currentData.reduce((sum, item) => sum + item.applications, 0).toLocaleString()}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-bold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 truncate">Avg Approval Rate</dt>
              <dd className="text-2xl font-semibold text-gray-900">
                {(currentData.reduce((sum, item) => sum + item.approvalRate, 0) / currentData.length).toFixed(1)}%
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Applications by Location */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Applications by {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [(value as number).toLocaleString(), 'Applications']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Approval Rates by Location */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Approval Rates by {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currentData.slice(0, 10)} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis
                type="category"
                dataKey="location"
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip formatter={(value) => [`${value}%`, 'Approval Rate']} />
              <Bar dataKey="approvalRate" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Detailed Breakdown by {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applications
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
              {currentData.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.applications.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                    {item.approved.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                    {item.rejected.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.approvalRate.toFixed(1)}%
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