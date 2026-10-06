import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/common/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import StudentHub from './pages/StudentHub';
import RaiseIssue from './pages/RaiseIssue';
import HodQueue from './pages/HodQueue';
import LabInchargeQueue from './pages/LabInchargeQueue';
import AdminConsole from './pages/AdminConsole';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected App Shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/student-hub" replace />} />
              <Route path="/student-hub" element={<StudentHub />} />
              
              {/* Role-Specific Consoles */}
              <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
                <Route path="/raise-issue" element={<RaiseIssue />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['HOD', 'MAIN_ADMIN']} />}>
                <Route path="/hod-queue" element={<HodQueue />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['LAB_INCHARGE', 'MAIN_ADMIN']} />}>
                <Route path="/lab-incharge-queue" element={<LabInchargeQueue />} />
              </Route>

              <Route element={<ProtectedRoute allowedRoles={['MAIN_ADMIN']} />}>
                <Route path="/admin-console" element={<AdminConsole />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/student-hub" replace />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
