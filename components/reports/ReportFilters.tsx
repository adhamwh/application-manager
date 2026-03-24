'use client';

import { useState } from 'react';

export type ReportGroupBy = 'day' | 'week' | 'month';

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  groupBy: ReportGroupBy;
  status?: string;
  agentId?: string;
  carrierId?: string;
  countryCode?: string;
  regionName?: string;
  cityName?: string;
  source?: string;
  medium?: string;
  campaign?: string;
}

interface ReportFiltersProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  showAdvancedFilters?: boolean;
}

export default function ReportFiltersComponent({
  filters,
  onFiltersChange,
  showAdvancedFilters = false
}: ReportFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof ReportFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const resetFilters = () => {
    onFiltersChange({
      dateFrom: '',
      dateTo: '',
      groupBy: 'month',
      status: '',
      agentId: '',
      carrierId: '',
      countryCode: '',
      regionName: '',
      cityName: '',
      source: '',
      medium: '',
      campaign: '',
    });
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter('dateFrom', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilter('dateTo', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Group By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Group By
          </label>
          <select
            value={filters.groupBy}
            onChange={(e) => updateFilter('groupBy', e.target.value as ReportGroupBy)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      {showAdvancedFilters && (
        <div className="mt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="needs_docs">Needs Documents</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="resubmitted">Resubmitted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent ID
                </label>
                <input
                  type="text"
                  value={filters.agentId || ''}
                  onChange={(e) => updateFilter('agentId', e.target.value)}
                  placeholder="Agent UUID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Carrier ID
                </label>
                <input
                  type="text"
                  value={filters.carrierId || ''}
                  onChange={(e) => updateFilter('carrierId', e.target.value)}
                  placeholder="Carrier UUID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country Code
                </label>
                <input
                  type="text"
                  value={filters.countryCode || ''}
                  onChange={(e) => updateFilter('countryCode', e.target.value)}
                  placeholder="e.g., US, CA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <input
                  type="text"
                  value={filters.source || ''}
                  onChange={(e) => updateFilter('source', e.target.value)}
                  placeholder="Traffic source"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medium
                </label>
                <input
                  type="text"
                  value={filters.medium || ''}
                  onChange={(e) => updateFilter('medium', e.target.value)}
                  placeholder="Traffic medium"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}