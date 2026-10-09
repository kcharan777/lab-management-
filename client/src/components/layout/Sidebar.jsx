import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const role = user?.role || 'STUDENT';

  const navItems = [
    {
      to: '/student-hub',
      label: 'Student Portal & Issues',
      icon: 'hub',
      roles: ['STUDENT', 'HOD', 'LAB_INCHARGE', 'REPAIR_ASSISTANT', 'MAIN_ADMIN'],
    },
    {
      to: '/raise-issue',
      label: 'Report Problem',
      icon: 'report_problem',
      badge: 'Step 1',
      roles: ['STUDENT', 'LAB_INCHARGE', 'MAIN_ADMIN'],
    },
    {
      to: '/lab-incharge-queue',
      label: 'Lab In-Charge Verification',
      icon: 'verified_user',
      badge: 'Step 2',
      roles: ['LAB_INCHARGE', 'MAIN_ADMIN'],
    },
    {
      to: '/hod-queue',
      label: 'HOD Department Queue',
      icon: 'gavel',
      badge: 'Step 3',
      roles: ['HOD', 'MAIN_ADMIN'],
    },
    {
      to: '/repair-assistant',
      label: 'Field Repair Tasks',
      icon: 'build',
      badge: 'Step 4',
      roles: ['REPAIR_ASSISTANT', 'MAIN_ADMIN'],
    },
    {
      to: '/admin-console',
      label: 'Admin Operations Suite',
      icon: 'engineering',
      badge: 'Admin',
      roles: ['MAIN_ADMIN'],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
        />
      )}

      {/* Responsive Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest border-r border-outline-variant/30 z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] select-none transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="h-16 px-space-md flex items-center justify-between border-b border-outline-variant/30">
            <div className="flex items-center gap-space-sm">
              <img
                alt="LabPulse Logo"
                className="h-9 w-9 object-contain"
                src="/logo.svg"
              />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">
                  LabPulse
                </span>
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest text-[10px]">
                  MLRIT Campus Ops v2.5
                </span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-secondary hover:text-on-surface rounded cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Department / Scope Pill */}
          <div className="px-space-md py-space-sm">
            <div className="p-space-xs bg-surface-container-low rounded-lg flex items-center justify-between border border-outline-variant/40">
              <div className="flex items-center gap-space-xs overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold truncate text-[11px]">
                  {user?.department || 'MLRIT Central'}
                </span>
              </div>
              <span className="font-label-sm text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded uppercase font-bold shrink-0">
                Live
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 px-space-sm space-y-1 overflow-y-auto pt-space-xs">
            {navItems.map((item) => {
              const hasAccess = item.roles.includes(role);
              if (!hasAccess) return null;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-space-sm py-2 rounded-lg transition-all text-body-sm ${
                      isActive
                        ? 'bg-primary text-on-primary font-bold shadow-[0_2px_0_0_#1e40af] translate-y-[-1px]'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface font-medium'
                    }`
                  }
                >
                  <div className="flex items-center gap-space-sm">
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="font-label-sm text-[10px] bg-surface-container-highest text-on-surface font-bold px-1.5 py-0.5 rounded border border-outline-variant/40">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom SLA Benchmark Card */}
          <div className="p-space-sm border-t border-outline-variant/30">
            <div className="p-space-sm bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-[11px] uppercase text-secondary font-bold">
                  SLA Target Health
                </span>
                <span className="font-label-sm text-[11px] text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded font-semibold">
                  98.7%
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                <div className="bg-primary h-full w-[88%]"></div>
              </div>
              <div className="flex items-center gap-space-xs pt-1">
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  support_agent
                </span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-[11px] text-on-surface font-semibold">
                    Campus Helpdesk
                  </span>
                  <span className="font-label-sm text-[10px] text-secondary font-mono">
                    EXT #4092 &bull; MLRIT Labs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
