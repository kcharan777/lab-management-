import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import StudentHub from './pages/StudentHub';
import RaiseIssue from './pages/RaiseIssue';
import HodQueue from './pages/HodQueue';
import LabInchargeQueue from './pages/LabInchargeQueue';
import AdminConsole from './pages/AdminConsole';
import RepairAssistantConsole from './pages/RepairAssistantConsole';

// Role-based root redirector
function RoleHomeRedirect() {
  const { user } = useAuth();
  switch (user?.role) {
    case 'MAIN_ADMIN':
      return <Navigate to="/admin-console" replace />;
    case 'HOD':
      return <Navigate to="/hod-queue" replace />;
    case 'LAB_INCHARGE':
      return <Navigate to="/lab-incharge-queue" replace />;
    case 'REPAIR_ASSISTANT':
      return <Navigate to="/repair-assistant" replace />;
    default:
      return <Navigate to="/student-hub" replace />;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected App Shell */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<RoleHomeRedirect />} />
                <Route path="/student-hub" element={<StudentHub />} />

                {/* Role-Specific Consoles */}
                <Route element={<ProtectedRoute allowedRoles={['STUDENT', 'LAB_INCHARGE', 'MAIN_ADMIN']} />}>
                  <Route path="/raise-issue" element={<RaiseIssue />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['HOD', 'MAIN_ADMIN']} />}>
                  <Route path="/hod-queue" element={<HodQueue />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['LAB_INCHARGE', 'MAIN_ADMIN']} />}>
                  <Route path="/lab-incharge-queue" element={<LabInchargeQueue />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['REPAIR_ASSISTANT', 'MAIN_ADMIN']} />}>
                  <Route path="/repair-assistant" element={<RepairAssistantConsole />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={['MAIN_ADMIN']} />}>
                  <Route path="/admin-console" element={<AdminConsole />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<RoleHomeRedirect />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
