"use client";

import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import DashboardStats from '../../components/DashboardStats';
import { useState } from 'react';
import ApplicationsTable from '../../components/ApplicationsTable';
import AddApplicationCard from '../../components/AddApplicationCard';

export default function ApplicationsPage() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar title="Application Management" />
      <main className="ml-64 mt-20 px-6 pb-6 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
        <DashboardStats />
        <AddApplicationCard onCreated={() => setRefreshToken((value) => value + 1)} />
        <ApplicationsTable refreshToken={refreshToken} />
      </main>
    </div>
  );
}
