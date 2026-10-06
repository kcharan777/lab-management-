import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-label-md text-label-md text-secondary uppercase tracking-wider">
            Authenticating Session...
          </span>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-12 bg-surface-container-lowest rounded-xl border border-error/30 shadow-sm text-center space-y-4">
        <span className="material-symbols-outlined text-error text-[48px]">security</span>
        <h2 className="font-headline-md text-on-surface font-bold">Access Restricted</h2>
        <p className="text-secondary text-body-md">
          Your role (<span className="font-mono font-bold text-primary">{user.role}</span>) does not have authorization to view this administrative terminal.
        </p>
        <button
          onClick={() => window.history.back()}
          className="btn-tactile-secondary px-4 py-2 rounded text-body-sm font-semibold"
        >
          Return to Previous Console
        </button>
      </div>
    );
  }

  return <Outlet />;
}
