/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SchoolDashboard from './pages/school/Dashboard';
import StateDashboard from './pages/state/Dashboard';
import HeadOfficeDashboard from './pages/head-office/Dashboard';
import DashboardLayout from './components/layout/DashboardLayout';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* School Routes */}
        <Route path="/school/*" element={
          <DashboardLayout role="school">
            <Routes>
              <Route path="dashboard" element={<SchoolDashboard />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </DashboardLayout>
        } />

        {/* State Routes */}
        <Route path="/state/*" element={
          <DashboardLayout role="state">
            <Routes>
              <Route path="dashboard" element={<StateDashboard />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </DashboardLayout>
        } />

        {/* Head Office Routes */}
        <Route path="/head-office/*" element={
          <DashboardLayout role="head-office">
            <Routes>
              <Route path="dashboard" element={<HeadOfficeDashboard />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </DashboardLayout>
        } />
      </Routes>
    </BrowserRouter>
  );
}
