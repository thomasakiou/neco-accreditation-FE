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
import StateSchools from './pages/state/Schools';
import HeadOfficeStates from './pages/head-office/States';
import HeadOfficeSchools from './pages/head-office/Schools';
import HeadOfficeLGAs from './pages/head-office/LGAs';
import HeadOfficeCustodians from './pages/head-office/Custodians';
import HeadOfficeZones from './pages/head-office/Zones';
import HeadOfficeFinalApproval from './pages/head-office/FinalApproval';
import HeadOfficeReports from './pages/head-office/Reports';
import HeadOfficeUsers from './pages/head-office/Users';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* School Routes */}
          <Route path="/school/*" element={
            <ProtectedRoute allowedRoles={['school']}>
              <DashboardLayout role="school">
                <Routes>
                  <Route path="dashboard" element={<SchoolDashboard />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* State Routes */}
          <Route path="/state/*" element={
            <ProtectedRoute allowedRoles={['state']}>
              <DashboardLayout role="state">
                <Routes>
                  <Route path="dashboard" element={<StateDashboard />} />
                  <Route path="schools" element={<StateSchools />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Head Office Routes */}
          <Route path="/head-office/*" element={
            <ProtectedRoute allowedRoles={['hq', 'admin']}>
              <DashboardLayout role="head-office">
                <Routes>
                  <Route path="dashboard" element={<HeadOfficeDashboard />} />
                  <Route path="zones" element={<HeadOfficeZones />} />
                  <Route path="states" element={<HeadOfficeStates />} />
                  <Route path="lgas" element={<HeadOfficeLGAs />} />
                  <Route path="schools" element={<HeadOfficeSchools />} />
                  <Route path="custodians" element={<HeadOfficeCustodians />} />
                  <Route path="approvals" element={<HeadOfficeFinalApproval />} />
                  <Route path="reports" element={<HeadOfficeReports />} />
                  <Route path="users" element={<HeadOfficeUsers />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </DashboardLayout>
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
