import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationDrawer from '../notifications/NotificationDrawer';

export default function Navbar({ onMenuClick = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleDisplayName = (r) => {
    switch (r) {
      case 'STUDENT': return 'College Student';
      case 'HOD': return 'Head of Department';
      case 'LAB_INCHARGE': return 'Lab In-Charge';
      case 'REPAIR_ASSISTANT': return 'Repair Assistant';
      case 'MAIN_ADMIN': return 'System Administrator';
      default: return r || 'User';
    }
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'MAIN_ADMIN': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'HOD': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'LAB_INCHARGE': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'REPAIR_ASSISTANT': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 z-40 flex items-center justify-between px-space-md lg:px-space-lg shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
      {/* Left: Mobile Toggle & Campus Indicator */}
      <div className="flex items-center gap-space-sm lg:gap-space-md">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 text-secondary hover:text-on-surface rounded hover:bg-surface-container cursor-pointer"
          type="button"
          title="Toggle Navigation Menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <div className="hidden xl:flex items-center gap-space-xs px-2.5 py-1 bg-surface-container-low border border-outline-variant/40 rounded-lg">
          <span className="material-symbols-outlined text-[16px] text-primary">domain</span>
          <span className="font-label-md text-label-md text-on-surface font-semibold">MLRIT Campus:</span>
          <span className="font-label-md text-label-md text-emerald-700 font-semibold">
            Laboratories Operational
          </span>
        </div>

        {/* Current Active Role Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-container-lowest border border-outline-variant rounded-lg">
          <span className="font-label-sm text-[11px] text-secondary uppercase font-bold">Role:</span>
          <span className={`font-label-md text-[11px] px-2 py-0.5 rounded border font-bold ${getRoleBadgeStyle(user?.role)}`}>
            {user?.role || 'GUEST'}
          </span>
        </div>
      </div>

      {/* Right: Notifications & User profile */}
      <div className="flex items-center gap-space-md">
        {/* Notifications Button & Dropdown */}
        <div className="relative">
          <button
            className="relative p-1.5 text-on-surface-variant hover:text-on-surface transition-colors rounded-lg hover:bg-surface-container cursor-pointer"
            type="button"
            title="Campus Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full ring-2 ring-surface"></span>
          </button>
          <NotificationDrawer
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        <div className="h-6 w-px bg-outline-variant/40"></div>

        {/* User Identity and Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-space-sm p-1 rounded-lg hover:bg-surface-container transition-all cursor-pointer"
          >
            <div className="flex flex-col text-right hidden sm:flex">
              <span className="font-headline-sm text-body-sm font-semibold text-on-surface leading-tight">
                {user?.name || 'Authorized User'}
              </span>
              <span className="font-label-sm text-[11px] text-secondary font-medium">
                {user?.rollNumber ? `Roll: ${user.rollNumber}` : getRoleDisplayName(user?.role)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-sm font-bold font-mono text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2.5 border-b border-outline-variant/30">
                <p className="text-body-sm font-bold text-on-surface truncate">{user?.name}</p>
                <p className="font-label-sm text-[11px] text-secondary truncate font-mono">{user?.email}</p>
                {user?.department && (
                  <p className="text-[11px] text-primary font-semibold mt-0.5">{user.department}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="w-full text-left px-4 py-2 text-body-sm text-error hover:bg-error-container/20 flex items-center gap-2 transition-colors font-semibold cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
