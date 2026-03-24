'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { apiFetch } from '@/lib/apiClient';
import ReportFiltersComponent, { ReportFilters } from './ReportFilters';

interface CustomReportData {
  data: Array<Record<string, any>>;
  metrics: string[];
  dimensions: string[];
  filters: {
    dateFrom: string | null;
    dateTo: string | null;
  };
}

type Metric = 'applications_count' | 'submitted_count' | 'needs_docs_count' | 'approved_count' | 'rejected_count' | 'approval_rate' | 'expected_revenue_sum' | 'realized_revenue_sum';
type Dimension = 'day' | 'week' | 'month' | 'status' | 'agent' | 'carrier' | 'country' | 'region' | 'city' | 'source' | 'medium' | 'campaign';

const AVAILABLE_METRICS: { value: Metric; label: string; type: 'count' | 'rate' | 'sum' }[] = [
  { value: 'applications_count', label: 'Applications Count', type: 'count' },
  { value: 'submitted_count', label: 'Submitted Count', type: 'count' },
  { value: 'needs_docs_count', label: 'Needs Documents Count', type: 'count' },
  { value: 'approved_count', label: 'Approved Count', type: 'count' },
  { value: 'rejected_count', label: 'Rejected Count', type: 'count' },
  { value: 'approval_rate', label: 'Approval Rate (%)', type: 'rate' },
  { value: 'expected_revenue_sum', label: 'Expected Revenue', type: 'sum' },
  { value: 'realized_revenue_sum', label: 'Realized Revenue', type: 'sum' },
];

const AVAILABLE_DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'status', label: 'Status' },
  { value: 'agent', label: 'Agent' },
  { value: 'carrier', label: 'Carrier' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'city', label: 'City' },
  { value: 'source', label: 'Source' },
  { value: 'medium', label: 'Medium' },
  { value: 'campaign', label: 'Campaign' },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function CustomReport() {
  const [data, setData] = useState<CustomReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    groupBy: 'month',
  });

  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(['applications_count']);
  const [selectedDimensions, setSelectedDimensions] = useState<Dimension[]>(['month']);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const requestBody = {
        metric: selectedMetrics[0], // API only supports one metric at a time
        dimensions: selectedDimensions,
        filters: {
          groupBy: filters.groupBy,
          dateFrom: filters.dateFrom || null,
          dateTo: filters.dateTo || null,
          status: filters.status || null,
          agentId: filters.agentId || null,
          carrierId: filters.carrierId || null,
          countryCode: filters.countryCode || null,
          regionName: filters.regionName || null,
          cityName: filters.cityName || null,
          source: filters.source || null,
          medium: filters.medium || null,
          campaign: filters.campaign || null,
        },
      };

      const response = await apiFetch('/api/reports/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch data');
      }

      // Transform the API response to match our expected format
      const transformedData = {
        data: result.data.rows.map((row: any) => ({
          ...row,
          [selectedMetrics[0]]: row.value,
        })),
        metrics: selectedMetrics,
        dimensions: selectedDimensions,
        filters: result.data.filters,
      };

      setData(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMetrics.length > 0 && selectedDimensions.length > 0) {
      fetchData();
    }
  }, [filters, selectedMetrics, selectedDimensions]);

  const toggleMetric = (metric: Metric) => {
    setSelectedMetrics([metric]); // Only allow one metric at a time
  };

  const toggleDimension = (dimension: Dimension) => {
    setSelectedDimensions(prev =>
      prev.includes(dimension)
        ? prev.filter(d => d !== dimension)
        : [...prev, dimension]
    );
  };

  const formatValue = (value: any, metric: string) => {
    if (typeof value === 'number') {
      if (metric.includes('revenue')) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      }
      if (metric.includes('rate')) {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  const renderChart = () => {
    if (!data || data.data.length === 0) return null;

    const dimensionLabels = selectedDimensions.map(dim =>
      AVAILABLE_DIMENSIONS.find(d => d.value === dim)?.label || dim
    );

    const primaryDimension = selectedDimensions[0];
    const dimensionLabel = AVAILABLE_DIMENSIONS.find(d => d.value === primaryDimension)?.label || primaryDimension;

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={primaryDimension} />
              <YAxis />
              <Tooltip formatter={(value, name) => [formatValue(value, String(name)), String(name)]} />
              <Legend />
              {selectedMetrics.map((metric, index) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  name={AVAILABLE_METRICS.find(m => m.value === metric)?.label || metric}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = data.data.map((item, index) => ({
          name: item[primaryDimension] || `Item ${index + 1}`,
          value: item[selectedMetrics[0]] || 0,
          fill: COLORS[index % COLORS.length],
        }));

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [formatValue(value, selectedMetrics[0]), selectedMetrics[0]]} />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // bar
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={primaryDimension} />
              <YAxis />
              <Tooltip formatter={(value, name) => [formatValue(value, String(name)), String(name)]} />
              <Legend />
              {selectedMetrics.map((metric, index) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={COLORS[index % COLORS.length]}
                  name={AVAILABLE_METRICS.find(m => m.value === metric)?.label || metric}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Custom Report Builder</h2>
        <p className="text-gray-600">Create custom reports by selecting metrics and dimensions</p>
      </div>

      <ReportFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        showAdvancedFilters={true}
      />

      {/* Metric and Dimension Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metrics Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Metric</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_METRICS.map((metric) => (
                <label key={metric.value} className="flex items-center">
                  <input
                    type="radio"
                    checked={selectedMetrics.includes(metric.value)}
                    onChange={() => toggleMetric(metric.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{metric.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Dimensions Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Dimensions</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {AVAILABLE_DIMENSIONS.map((dimension) => (
                <label key={dimension.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(dimension.value)}
                    onChange={() => toggleDimension(dimension.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">{dimension.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Type Selection */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Chart Type</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => setChartType('bar')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                chartType === 'bar'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bar Chart
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                chartType === 'line'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Line Chart
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                chartType === 'pie'
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pie Chart
            </button>
          </div>
        </div>
      </div>

      {/* Loading/Error States */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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
      )}

      {/* Chart */}
      {data && data.data.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Report Visualization</h3>
          {renderChart()}
        </div>
      )}

      {/* Data Table */}
      {data && data.data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Data Table</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedDimensions.map((dimension) => (
                    <th key={dimension} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {AVAILABLE_DIMENSIONS.find(d => d.value === dimension)?.label || dimension}
                    </th>
                  ))}
                  {selectedMetrics.map((metric) => (
                    <th key={metric} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {AVAILABLE_METRICS.find(m => m.value === metric)?.label || metric}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.data.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {selectedDimensions.map((dimension) => (
                      <td key={dimension} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row[dimension] || '-'}
                      </td>
                    ))}
                    {selectedMetrics.map((metric) => (
                      <td key={metric} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatValue(row[metric], metric)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data && data.data.length === 0 && !loading && (
        <div className="bg-white p-12 rounded-lg shadow-sm border border-gray-200 text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
          <p className="text-gray-600">Try adjusting your filters or selecting different metrics/dimensions.</p>
        </div>
      )}
    </div>
  );
}