'use client';

import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import AcquisitionReport from '../../components/reports/AcquisitionReport';
import ApprovalRatesReport from '../../components/reports/ApprovalRatesReport';
import FunnelReport from '../../components/reports/FunnelReport';
import RevenueReport from '../../components/reports/RevenueReport';
import GeographyReport from '../../components/reports/GeographyReport';
import CustomReport from '../../components/reports/CustomReport';

type ReportType = 'acquisition' | 'approval-rates' | 'funnel' | 'revenue' | 'geography' | 'custom';

const reportTabs = [
  { id: 'acquisition' as ReportType, label: 'User Acquisition', icon: '📈' },
  { id: 'funnel' as ReportType, label: 'Conversion Funnel', icon: '🔄' },
  { id: 'approval-rates' as ReportType, label: 'Approval Rates', icon: '✅' },
  { id: 'revenue' as ReportType, label: 'Revenue Reports', icon: '💰' },
  { id: 'geography' as ReportType, label: 'Geographic Analytics', icon: '🌍' },
  { id: 'custom' as ReportType, label: 'Custom Report Builder', icon: '🔧' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('acquisition');

  const renderActiveReport = () => {
    switch (activeTab) {
      case 'acquisition':
        return <AcquisitionReport />;
      case 'approval-rates':
        return <ApprovalRatesReport />;
      case 'funnel':
        return <FunnelReport />;
      case 'revenue':
        return <RevenueReport />;
      case 'geography':
        return <GeographyReport />;
      case 'custom':
        return <CustomReport />;
      default:
        return <AcquisitionReport />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar title="Analytics & Reports" />
      <main className="ml-64 mt-20 px-6 pb-6 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Report Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Report Content */}
          <div className="p-6">
            {renderActiveReport()}
          </div>
        </div>
      </main>
    </div>
  );
}
