import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { adminService } from '../services/adminService';
import EvidenceModal from '../components/complaints/EvidenceModal';

const TECHNICIAN_ROSTER = [
  'Rajesh M. - Senior Hardware Specialist (Badge #ENG-402)',
  'S. Pillai - Electrical & Power Specialist (Badge #ENG-119)',
  'Anil Kumar - Telecommunication & Networking (Badge #ENG-204)',
  'P. Venkat - Robotics Firmware Diagnostics (Badge #ENG-508)',
  'K. Raman - High Performance Computing Rig Specialist (Badge #ENG-301)',
];

export default function AdminConsole() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [kanban, setKanban] = useState({
    intake: [],
    accepted: [],
    inProgress: [],
    resolved: [],
  });
  const [telemetry, setTelemetry] = useState({
    totalWorkOrders: 0,
    openCount: 0,
    resolvedCount: 0,
    rejectedCount: 0,
    avgTurnaroundHours: 4.2,
    equipmentSlaHealth: '98.4%',
  });

  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [labFilter, setLabFilter] = useState('ALL');

  // Modals / Action States
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);

  // Form Fields
  const [technicianAssigned, setTechnicianAssigned] = useState(TECHNICIAN_ROSTER[0]);
  const [acceptRemarks, setAcceptRemarks] = useState('Work order approved and queued for technician dispatch.');
  const [progressNote, setProgressNote] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [closeImmediately, setCloseImmediately] = useState(true);

  const fetchAdminComplaints = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (labFilter !== 'ALL') params.lab = labFilter;

      const res = await adminService.getComplaints(params);
      if (res.success && res.data) {
        setKanban(res.data.kanban || { intake: [], accepted: [], inProgress: [], resolved: [] });
        setTelemetry(res.data.telemetry || {
          totalWorkOrders: 0,
          openCount: 0,
          resolvedCount: 0,
          rejectedCount: 0,
          avgTurnaroundHours: 4.2,
          equipmentSlaHealth: '98.4%',
        });

        // Retain or select first available complaint
        if (selectedComplaint) {
          const allList = res.data.complaints || [];
          const updated = allList.find(c => c._id === selectedComplaint._id || c.complaintId === selectedComplaint.complaintId);
          if (updated) {
            setSelectedComplaint(updated);
          } else if (allList.length > 0) {
            setSelectedComplaint(allList[0]);
          }
        } else if (res.data.complaints && res.data.complaints.length > 0) {
          setSelectedComplaint(res.data.complaints[0]);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to load maintenance console matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminComplaints();
  }, [priorityFilter, labFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminComplaints();
  };

  // Actions
  const handleAcceptWorkOrder = async () => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await adminService.acceptComplaint(selectedComplaint.complaintId, {
        technicianAssigned,
        remarks: acceptRemarks,
      });
      if (res.success) {
        addToast(`Work order ${selectedComplaint.complaintId} accepted & technician dispatched!`, 'success');
        setShowAcceptModal(false);
        fetchAdminComplaints();
      }
    } catch (err) {
      addToast(err.message || 'Failed to accept work order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedComplaint) return;
    if (!progressNote.trim() || progressNote.trim().length < 3) {
      addToast('Progress note must be at least 3 characters', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const res = await adminService.updateProgress(selectedComplaint.complaintId, progressNote);
      if (res.success) {
        addToast(`Progress recorded for ${selectedComplaint.complaintId}`, 'success');
        setProgressNote('');
        setShowProgressModal(false);
        fetchAdminComplaints();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update progress', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveWorkOrder = async () => {
    if (!selectedComplaint) return;
    if (!resolutionRemarks.trim() || resolutionRemarks.trim().length < 5) {
      addToast('Resolution remarks are mandatory (min 5 characters)', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const res = await adminService.resolveComplaint(selectedComplaint.complaintId, {
        resolutionRemarks,
        closeImmediately,
      });
      if (res.success) {
        addToast(`Work order ${selectedComplaint.complaintId} resolved & archived successfully!`, 'success');
        setResolutionRemarks('');
        setShowResolveModal(false);
        fetchAdminComplaints();
      }
    } catch (err) {
      addToast(err.message || 'Failed to resolve work order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportAudit = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      telemetry,
      activeKanban: {
        intakeCount: kanban.intake.length,
        acceptedCount: kanban.accepted.length,
        inProgressCount: kanban.inProgress.length,
        resolvedCount: kanban.resolved.length,
      },
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LabPulse_Audit_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Audit Telemetry Report exported successfully.', 'success');
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'CRITICAL':
        return 'bg-error-container text-on-error-container';
      case 'HIGH':
        return 'bg-tertiary-fixed text-tertiary-container';
      case 'MEDIUM':
        return 'bg-secondary-container text-on-secondary-container';
      default:
        return 'bg-surface-container text-secondary';
    }
  };

  const totalItems = kanban.intake.length + kanban.accepted.length + kanban.inProgress.length + kanban.resolved.length;

  return (
    <div className="w-full max-w-[1720px] mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Command Center Header */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-space-md relative overflow-hidden border border-outline-variant/30">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-surface-container rounded-full opacity-60 pointer-events-none"></div>
        <div className="space-y-space-xs relative z-10">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Tier 4 Clearance
            </span>
            <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Telemetry Online • Central Engineering Core
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Central Campus Infrastructure & Engineering Administration
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-3xl">
            Authorized console for university asset restoration, component allocation, technician logistics, and institutional audit verification across 38 physical laboratory nodes.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center flex-wrap gap-space-sm relative z-10 shrink-0">
          <button
            onClick={handleExportAudit}
            className="btn-tactile-secondary px-4 py-2 flex items-center gap-2"
            id="btn-export-audit"
          >
            <span className="material-symbols-outlined text-[18px]">sim_card_download</span>
            Export Audit Report
          </button>
          <button
            onClick={() => {
              if (kanban.intake.length > 0) {
                setSelectedComplaint(kanban.intake[0]);
                setShowAcceptModal(true);
              } else {
                addToast('No pending intake orders to dispatch.', 'info');
              }
            }}
            className="btn-tactile-primary px-4 py-2 flex items-center gap-2"
            id="btn-dispatch-top"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Dispatch Work Order
          </button>
        </div>
      </div>

      {/* Live Operational Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">
              Verified Intake Awaiting WO
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface">
                {kanban.intake.length}
              </span>
              <span className="font-label-sm text-label-sm text-tertiary-container bg-tertiary-fixed px-1.5 py-0.5 rounded font-bold uppercase">
                Pending Tech
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">Validated by both HOD and Lab Head</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">inbox</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">
              Active Work Orders (Repair)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-primary">
                {kanban.accepted.length + kanban.inProgress.length}
              </span>
              <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-1.5 py-0.5 rounded font-bold uppercase">
                Work In Progress
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              {kanban.inProgress.length} In Diagnostic, {kanban.accepted.length} Dispatched
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">build_circle</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">
              Average Turnaround Time (TAT)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-on-surface">
                {telemetry.avgTurnaroundHours}
                <span className="font-headline-sm text-headline-sm font-normal text-secondary">h</span>
              </span>
              <span className="font-label-sm text-label-sm text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase">
                &lt; 6h SLA Target
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">-18% faster than SLA baseline</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-[22px]">timer</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 flex items-start justify-between">
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm uppercase text-secondary font-semibold">
              Equipment SLA Health
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-xl text-headline-xl font-bold text-emerald-700">
                {telemetry.equipmentSlaHealth || '98.4%'}
              </span>
              <span className="font-label-sm text-label-sm text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase">
                Nominal
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">Campus workstations live & monitored</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/30 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-secondary text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by ID, Lab name, system number, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low pl-10 pr-4 py-2 rounded-lg text-body-md text-on-surface placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30"
            />
          </div>
          <button type="submit" className="btn-tactile-secondary px-3 py-2 text-label-sm">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-label-sm font-label-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">P1 Critical</option>
            <option value="HIGH">P2 High</option>
            <option value="MEDIUM">P3 Medium</option>
            <option value="LOW">P4 Low</option>
          </select>

          <select
            value={labFilter}
            onChange={(e) => setLabFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-3 py-2 text-label-sm font-label-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Labs</option>
            <option value="IoT">IoT Lab</option>
            <option value="Cloud">Cloud Systems Lab</option>
            <option value="Machine Learning">Machine Learning Lab</option>
            <option value="Robotics">Robotics Lab</option>
            <option value="VLSI">VLSI Lab</option>
          </select>
        </div>
      </div>

      {/* Main Orchestration Split: 4-Column Kanban + Analytics Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Kanban Board (8 Columns) */}
        <div className="lg:col-span-8 space-y-space-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary text-[22px]">splitscreen</span>
              <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                Maintenance Orchestration Matrix
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-semibold font-mono">
                {totalItems} Items
              </span>
            </div>
          </div>

          {/* 4-Column Responsive Kanban View */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-sm">
            {/* Column 1: Intake Ready */}
            <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col space-y-space-sm min-h-[520px] border border-outline-variant/30">
              <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container"></span>
                  <span className="font-label-md text-label-md font-bold text-on-surface uppercase">
                    Verified Intake
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest font-label-sm text-label-sm font-bold text-on-surface-variant">
                  {kanban.intake.length}
                </span>
              </div>

              <div className="space-y-space-xs flex-1 overflow-y-auto max-h-[580px]">
                {kanban.intake.length === 0 ? (
                  <div className="text-center py-8 text-secondary font-label-sm">No intake queue</div>
                ) : (
                  kanban.intake.map((c) => {
                    const isSelected = selectedComplaint?.complaintId === c.complaintId;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedComplaint(c)}
                        className={`p-3 bg-surface-container-lowest rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border ${
                          isSelected ? 'ring-2 ring-primary border-primary' : 'border-outline-variant/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-bold text-primary font-mono">
                            #{c.complaintId}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase ${getPriorityBadge(c.priority)}`}>
                            {c.priority}
                          </span>
                        </div>
                        <h4 className="font-body-md text-body-md font-bold text-on-surface line-clamp-1">
                          {c.title || c.description}
                        </h4>
                        <p className="font-body-sm text-body-sm text-secondary line-clamp-2">
                          {c.labName} • Sys #{c.systemNumber}
                        </p>
                        <div className="pt-1 flex items-center justify-between text-secondary">
                          <span className="font-label-sm text-label-sm flex items-center gap-1 text-emerald-700">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                            Dual Approved
                          </span>
                          <span className="font-label-sm text-label-sm font-mono text-tertiary">
                            Awaiting Tech
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Parts Dispatched / Accepted */}
            <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col space-y-space-sm min-h-[520px] border border-outline-variant/30">
              <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  <span className="font-label-md text-label-md font-bold text-on-surface uppercase">
                    Dispatched
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest font-label-sm text-label-sm font-bold text-on-surface-variant">
                  {kanban.accepted.length}
                </span>
              </div>

              <div className="space-y-space-xs flex-1 overflow-y-auto max-h-[580px]">
                {kanban.accepted.length === 0 ? (
                  <div className="text-center py-8 text-secondary font-label-sm">No dispatched orders</div>
                ) : (
                  kanban.accepted.map((c) => {
                    const isSelected = selectedComplaint?.complaintId === c.complaintId;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedComplaint(c)}
                        className={`p-3 bg-surface-container-lowest rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border ${
                          isSelected ? 'ring-2 ring-primary border-primary' : 'border-outline-variant/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-bold text-primary font-mono">
                            #{c.complaintId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
                            Tech Dispatched
                          </span>
                        </div>
                        <h4 className="font-body-md text-body-md font-bold text-on-surface line-clamp-1">
                          {c.title || c.description}
                        </h4>
                        <p className="font-label-sm text-label-sm text-secondary truncate">
                          Tech: {c.mainAdminAction?.technicianAssigned || 'Senior Technician'}
                        </p>
                        <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full w-2/5"></div>
                        </div>
                        <span className="font-label-sm text-label-sm text-secondary font-mono block">
                          {c.labName} • Work In Progress
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: In Active Repair */}
            <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col space-y-space-sm min-h-[520px] border border-outline-variant/30">
              <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
                  <span className="font-label-md text-label-md font-bold text-on-surface uppercase">
                    Active Repair
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest font-label-sm text-label-sm font-bold text-on-surface-variant">
                  {kanban.inProgress.length}
                </span>
              </div>

              <div className="space-y-space-xs flex-1 overflow-y-auto max-h-[580px]">
                {kanban.inProgress.length === 0 ? (
                  <div className="text-center py-8 text-secondary font-label-sm">No active repairs</div>
                ) : (
                  kanban.inProgress.map((c) => {
                    const isSelected = selectedComplaint?.complaintId === c.complaintId;
                    const latestNote = c.mainAdminAction?.progressNotes?.[c.mainAdminAction.progressNotes.length - 1]?.note;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedComplaint(c)}
                        className={`p-3 bg-surface-container-lowest rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border ${
                          isSelected ? 'ring-2 ring-primary border-primary' : 'border-outline-variant/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-bold text-tertiary font-mono">
                            #{c.complaintId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-tertiary-fixed text-tertiary-container font-label-sm text-label-sm font-bold uppercase">
                            Diagnostics
                          </span>
                        </div>
                        <h4 className="font-body-md text-body-md font-bold text-on-surface line-clamp-1">
                          {c.title || c.description}
                        </h4>
                        <p className="font-body-sm text-body-sm text-secondary line-clamp-2">
                          {latestNote || `${c.labName} • System #${c.systemNumber}`}
                        </p>
                        <div className="p-1.5 rounded bg-surface-container-low flex items-center justify-between font-label-sm text-label-sm font-mono text-tertiary">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">engineering</span>
                            Repair Cycle
                          </span>
                          <span className="font-bold">Active</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 4: Resolved / Ready Sign-off */}
            <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col space-y-space-sm min-h-[520px] border border-outline-variant/30">
              <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  <span className="font-label-md text-label-md font-bold text-on-surface uppercase">
                    Resolved & Closed
                  </span>
                </div>
                <span className="px-1.5 py-0.5 rounded bg-emerald-100 font-label-sm text-label-sm font-bold text-emerald-800">
                  {kanban.resolved.length}
                </span>
              </div>

              <div className="space-y-space-xs flex-1 overflow-y-auto max-h-[580px]">
                {kanban.resolved.length === 0 ? (
                  <div className="text-center py-8 text-secondary font-label-sm">No resolved orders</div>
                ) : (
                  kanban.resolved.map((c) => {
                    const isSelected = selectedComplaint?.complaintId === c.complaintId;
                    return (
                      <div
                        key={c._id}
                        onClick={() => setSelectedComplaint(c)}
                        className={`p-3 bg-surface-container-lowest rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2 border ${
                          isSelected ? 'ring-2 ring-primary border-primary' : 'border-outline-variant/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm font-bold text-emerald-700 font-mono">
                            #{c.complaintId}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold">
                            {c.status}
                          </span>
                        </div>
                        <h4 className="font-body-md text-body-md font-bold text-on-surface line-clamp-1">
                          {c.title || c.description}
                        </h4>
                        <p className="font-body-sm text-body-sm text-secondary line-clamp-2">
                          {c.resolutionRemarks || 'Repair signed off and certified.'}
                        </p>
                        <div className="flex items-center justify-between pt-1 font-label-sm text-label-sm text-emerald-700">
                          <span>Certified</span>
                          <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Analytics & Radar (4 Columns) */}
        <div className="lg:col-span-4 space-y-space-md">
          {/* Lab Failure Breakdown */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 space-y-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Lab Incident Breakdown (Telemetry)
              </h3>
              <span className="font-label-sm text-label-sm text-secondary uppercase font-mono">Real-time</span>
            </div>

            <div className="p-space-sm bg-surface-container-low rounded-lg space-y-space-xs">
              <div className="flex items-end justify-between h-36 px-3 pt-4">
                <div className="flex flex-col items-center gap-1.5 w-1/5">
                  <span className="font-label-sm text-label-sm text-primary font-bold">42%</span>
                  <div className="w-full bg-primary rounded-t h-28 transition-all"></div>
                  <span className="font-label-sm text-label-sm font-mono text-secondary">GPU</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 w-1/5">
                  <span className="font-label-sm text-label-sm text-tertiary-container font-bold">24%</span>
                  <div className="w-full bg-tertiary-container rounded-t h-16 transition-all"></div>
                  <span className="font-label-sm text-label-sm font-mono text-secondary">PSU</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 w-1/5">
                  <span className="font-label-sm text-label-sm text-secondary font-bold">18%</span>
                  <div className="w-full bg-secondary rounded-t h-12 transition-all"></div>
                  <span className="font-label-sm text-label-sm font-mono text-secondary">DISP</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 w-1/5">
                  <span className="font-label-sm text-label-sm text-outline font-bold">16%</span>
                  <div className="w-full bg-outline rounded-t h-10 transition-all"></div>
                  <span className="font-label-sm text-label-sm font-mono text-secondary">NET</span>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-secondary text-center pt-2">
                Heavy AI & CAD training clusters generating primary thermal throttling events in IoT & ML nodes.
              </p>
            </div>

            {/* Technicians On Duty Strip */}
            <div className="space-y-space-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">
                  Technicians On Duty
                </span>
                <span className="font-label-sm text-label-sm text-emerald-700 font-bold">4 Active Dispatch</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-primary text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                      RM
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm font-bold text-on-surface">Rajesh M.</span>
                      <span className="font-label-sm text-label-sm text-secondary">Sr. Hardware Specialist</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-label-sm text-label-sm font-bold">
                    Dispatched
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-secondary text-on-secondary font-label-sm text-label-sm flex items-center justify-center font-bold">
                      SP
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm font-bold text-on-surface">S. Pillai</span>
                      <span className="font-label-sm text-label-sm text-secondary">Power Systems</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold">
                    Assigned
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-surface-container-low">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-emerald-700 text-on-primary font-label-sm text-label-sm flex items-center justify-center font-bold">
                      AK
                    </div>
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm font-bold text-on-surface">Anil Kumar</span>
                      <span className="font-label-sm text-label-sm text-secondary">Networking & Telecom</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-bold">
                    Standby
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Central Inventory Buffer Status */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 space-y-space-xs">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm uppercase font-bold text-secondary">
                Critical Spares Buffer
              </span>
              <span className="font-label-sm text-label-sm font-mono text-primary font-semibold">Store Nominal</span>
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-on-surface">RTX 4070 Ti 16GB VRAM</span>
                <span className="font-label-sm text-label-sm font-mono font-bold text-tertiary-container bg-tertiary-fixed px-1 rounded">
                  2 Units Left
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-on-surface">Gold PSU 850W ATX Modular</span>
                <span className="font-label-sm text-label-sm font-mono font-bold text-emerald-800 bg-emerald-100 px-1 rounded">
                  7 Units
                </span>
              </div>
              <div className="flex items-center justify-between text-body-sm">
                <span className="text-on-surface">CAT6 Shielded 305m Spool</span>
                <span className="font-label-sm text-label-sm font-mono font-bold text-emerald-800 bg-emerald-100 px-1 rounded">
                  4 Spools
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Work Order Inspection & Deep Dive Execution Console */}
      {selectedComplaint ? (
        <div
          id="active-work-order-panel"
          className="bg-surface-container-lowest rounded-xl shadow-md p-space-lg space-y-space-lg border border-outline-variant/30"
        >
          {/* Header */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-space-md border-b border-outline-variant/30 gap-space-md">
            <div className="space-y-1">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="px-2.5 py-1 rounded bg-primary text-on-primary font-label-md text-label-md font-bold tracking-wider uppercase font-mono">
                  Order #{selectedComplaint.complaintId}
                </span>
                <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold uppercase ${getPriorityBadge(selectedComplaint.priority)}`}>
                  Priority: {selectedComplaint.priority}
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-mono">
                  Status: {selectedComplaint.status} • Logged: {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
                {selectedComplaint.title || selectedComplaint.description}
              </h2>
              <p className="font-body-md text-body-md text-secondary">
                Lab: <span className="text-on-surface font-semibold">{selectedComplaint.labName}</span> • System/Node: <span className="text-on-surface font-semibold">#{selectedComplaint.systemNumber}</span> • Student: <span className="text-on-surface font-semibold">{selectedComplaint.studentId?.name || 'Enrolled Student'}</span>
              </p>
            </div>

            {/* Dual Multi-Tier Verification Stamps */}
            <div className="flex items-center gap-space-sm flex-wrap">
              {/* HOD Stamp */}
              <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2 border border-outline-variant/30">
                <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified</span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                    Tier 2 Approval: HOD
                  </span>
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    {selectedComplaint.hodVerification?.verifiedBy?.name || 'Department HOD'} (Verified)
                  </span>
                  {selectedComplaint.hodVerification?.remarks && (
                    <span className="text-[11px] text-secondary line-clamp-1 italic">
                      "{selectedComplaint.hodVerification.remarks}"
                    </span>
                  )}
                </div>
              </div>

              {/* Lab Incharge Stamp */}
              <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2 border border-outline-variant/30">
                <span className="material-symbols-outlined text-emerald-700 text-[22px]">verified_user</span>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">
                    Tier 3 Approval: Incharge
                  </span>
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    {selectedComplaint.labInchargeVerification?.verifiedBy?.name || 'Lab Incharge'} (Verified)
                  </span>
                  {selectedComplaint.labInchargeVerification?.remarks && (
                    <span className="text-[11px] text-secondary line-clamp-1 italic">
                      "{selectedComplaint.labInchargeVerification.remarks}"
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4-Step Physical Progress Pipeline */}
          <div className="space-y-space-xs p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm font-bold uppercase text-secondary">
                Repair Stage Workflow Execution
              </span>
              <span className="font-label-sm text-label-sm font-bold text-primary font-mono">
                Current State: {selectedComplaint.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2.5 rounded bg-surface-container-lowest flex items-center gap-2 shadow-sm border border-outline-variant/20">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-on-primary flex items-center justify-center font-label-sm text-label-sm font-bold">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-secondary uppercase">Step 01</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">Dual Approved</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded flex items-center gap-2 shadow-sm border border-outline-variant/20 ${
                  ['ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                    ? 'bg-surface-container-lowest text-on-surface'
                    : 'bg-surface-container-lowest opacity-50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    ['ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                      ? 'bg-emerald-600 text-on-primary'
                      : 'bg-surface-container-highest text-secondary'
                  }`}
                >
                  {['ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status) ? (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    '2'
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-secondary uppercase">Step 02</span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">Tech Dispatched</span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded flex items-center gap-2 shadow-sm border border-outline-variant/20 ${
                  ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-lowest opacity-50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                      ? 'bg-on-primary text-primary'
                      : 'bg-surface-container-highest text-secondary'
                  }`}
                >
                  {['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) ? (
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  ) : (
                    '3'
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`font-label-sm text-label-sm uppercase ${
                      ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                        ? 'text-on-primary-container'
                        : 'text-secondary'
                    }`}
                  >
                    Step 03
                  </span>
                  <span
                    className={`font-body-sm text-body-sm font-semibold ${
                      ['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                        ? 'text-on-primary'
                        : 'text-on-surface'
                    }`}
                  >
                    Repair & Diagnostics
                  </span>
                </div>
              </div>

              <div
                className={`p-2.5 rounded flex items-center gap-2 shadow-sm border border-outline-variant/20 ${
                  ['RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-container-lowest opacity-50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-label-sm text-label-sm font-bold ${
                    ['RESOLVED', 'CLOSED'].includes(selectedComplaint.status)
                      ? 'bg-white text-emerald-700'
                      : 'bg-surface-container-highest text-secondary'
                  }`}
                >
                  {['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) ? (
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                  ) : (
                    '4'
                  )}
                </div>
                <div className="flex flex-col">
                  <span
                    className={`font-label-sm text-label-sm uppercase ${
                      ['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) ? 'text-emerald-100' : 'text-secondary'
                    }`}
                  >
                    Step 04
                  </span>
                  <span
                    className={`font-body-sm text-body-sm font-semibold ${
                      ['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) ? 'text-white' : 'text-on-surface'
                    }`}
                  >
                    Resolved & Closed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Details & Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* Left Column: Work Order Logistics & Notes */}
            <div className="lg:col-span-6 space-y-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-3 border border-outline-variant/30">
                <span className="font-label-sm text-label-sm uppercase font-bold text-secondary">
                  Work Order Description & Reported Fault
                </span>
                <p className="font-body-md text-on-surface bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20 whitespace-pre-wrap">
                  {selectedComplaint.description}
                </p>
                <div className="flex items-center justify-between text-body-sm text-secondary pt-1">
                  <span>Category: <strong className="text-on-surface">{selectedComplaint.category || 'Hardware'}</strong></span>
                  <span>System: <strong className="text-on-surface">Node #{selectedComplaint.systemNumber}</strong></span>
                </div>
              </div>

              {/* Technician Assignment */}
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-3 border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-secondary">
                    Designated Engineering Lead / Technician
                  </span>
                  {selectedComplaint.mainAdminAction?.technicianAssigned && (
                    <span className="px-2 py-0.5 rounded bg-primary-fixed text-primary font-label-sm font-bold">
                      ASSIGNED
                    </span>
                  )}
                </div>

                {selectedComplaint.mainAdminAction?.technicianAssigned ? (
                  <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center font-bold">
                        <span className="material-symbols-outlined text-[20px]">engineering</span>
                      </div>
                      <div>
                        <h5 className="font-body-md font-bold text-on-surface">
                          {selectedComplaint.mainAdminAction.technicianAssigned}
                        </h5>
                        <p className="font-label-sm text-secondary font-mono">
                          Dispatched: {new Date(selectedComplaint.mainAdminAction.acceptedAt || Date.now()).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={technicianAssigned}
                      onChange={(e) => setTechnicianAssigned(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface font-body-md p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30 cursor-pointer"
                    >
                      {TECHNICIAN_ROSTER.map((tech) => (
                        <option key={tech} value={tech}>
                          {tech}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Progress Notes Timeline */}
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-3 border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm uppercase font-bold text-secondary">
                    Diagnostic & Repair Progress Log
                  </span>
                  <span className="font-mono text-label-sm text-secondary">
                    {selectedComplaint.mainAdminAction?.progressNotes?.length || 0} Entries
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedComplaint.mainAdminAction?.progressNotes?.length > 0 ? (
                    selectedComplaint.mainAdminAction.progressNotes.map((pn, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/20 space-y-1"
                      >
                        <div className="flex items-center justify-between text-label-sm text-secondary">
                          <span className="font-semibold text-primary">Log #{idx + 1}</span>
                          <span className="font-mono">{new Date(pn.updatedAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="font-body-sm text-on-surface">{pn.note}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/20 text-center text-secondary text-body-sm">
                      No progress notes logged yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Visual Telemetry Evidence & Checkpoints */}
            <div className="lg:col-span-6 space-y-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low space-y-3 border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md uppercase font-bold text-secondary">
                    Visual Evidence & Telemetry Attachment
                  </span>
                  <span className="font-label-sm text-label-sm text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                    EXIF Verified
                  </span>
                </div>

                {selectedComplaint.imageUrl ? (
                  <div className="space-y-2">
                    <div
                      onClick={() => setShowEvidence(true)}
                      className="relative rounded-lg overflow-hidden h-52 bg-surface-container-high group cursor-pointer border border-outline-variant/30"
                    >
                      <img
                        src={selectedComplaint.imageUrl}
                        alt="Issue Evidence"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-between p-3">
                        <span className="font-label-sm text-white font-mono flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">photo_camera</span>
                          Incident Photo Evidence
                        </span>
                        <span className="text-white text-label-sm underline flex items-center gap-1">
                          Zoom <span className="material-symbols-outlined text-[14px]">fullscreen</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-52 rounded-lg bg-surface-container-lowest border border-dashed border-outline-variant flex flex-col items-center justify-center text-secondary space-y-2">
                    <span className="material-symbols-outlined text-[36px]">image_not_supported</span>
                    <span className="font-body-sm">No photo evidence attached to this grievance</span>
                  </div>
                )}

                {/* Digital Audit Checkpoints */}
                <div className="p-space-sm rounded-lg bg-surface-container-lowest grid grid-cols-2 gap-2 text-body-sm border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="font-body-sm text-on-surface">Chassis Node Located</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="font-body-sm text-on-surface">Tier 2/3 Clearances OK</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="font-body-sm text-on-surface">Campus SLA Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
                    <span className="font-body-sm text-on-surface">Student ID Verified</span>
                  </div>
                </div>
              </div>

              {/* Resolution Remarks Display (if resolved) */}
              {['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) && (
                <div className="p-space-md rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="font-label-sm uppercase font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Certified Resolution Remarks
                    </span>
                    <span className="font-mono text-label-sm">
                      {new Date(selectedComplaint.resolvedAt || Date.now()).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-body-md text-emerald-950 font-medium">
                    {selectedComplaint.resolutionRemarks}
                  </p>
                  <p className="font-label-sm text-emerald-800 font-mono">
                    Signed off by: {selectedComplaint.resolvedBy?.name || 'Chief Engineering Administrator'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Tactile Action Bar */}
          <div className="pt-space-md border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-[20px]">policy</span>
              <span className="font-label-sm text-label-sm">
                Actions emit real-time automated notifications to Student and Incharge.
              </span>
            </div>

            <div className="flex items-center gap-space-sm w-full sm:w-auto flex-wrap justify-end">
              {/* If ASSIGNED_TO_MAIN_ADMIN */}
              {selectedComplaint.status === 'ASSIGNED_TO_MAIN_ADMIN' && (
                <button
                  onClick={() => setShowAcceptModal(true)}
                  className="btn-tactile-primary px-6 py-2.5 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">assignment_turned_in</span>
                  Accept Work Order & Assign Technician
                </button>
              )}

              {/* If ACCEPTED or IN_PROGRESS */}
              {['ACCEPTED', 'IN_PROGRESS'].includes(selectedComplaint.status) && (
                <>
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="btn-tactile-secondary px-5 py-2.5 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    Log Progress Note
                  </button>

                  <button
                    onClick={() => setShowResolveModal(true)}
                    className="btn-tactile-success px-6 py-2.5 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Mark Resolved & Sign Off
                  </button>
                </>
              )}

              {/* If already resolved or closed */}
              {['RESOLVED', 'CLOSED'].includes(selectedComplaint.status) && (
                <div className="px-4 py-2 bg-emerald-100 text-emerald-800 font-label-md rounded font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  Work Order Certified & Archived
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 text-center space-y-3">
          <span className="material-symbols-outlined text-secondary text-[48px]">splitscreen</span>
          <h3 className="font-headline-sm text-on-surface font-bold">Select a Work Order from the Matrix</h3>
          <p className="text-secondary text-body-sm max-w-md mx-auto">
            Click any complaint card in the Intake, Dispatched, or Active Repair columns above to inspect hardware diagnostics, assign technicians, or sign off resolutions.
          </p>
        </div>
      )}

      {/* MODAL 1: Accept Work Order */}
      {showAcceptModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-2xl border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">assignment_turned_in</span>
                <h3 className="font-headline-sm font-bold text-on-surface">Accept Work Order</h3>
              </div>
              <button
                onClick={() => setShowAcceptModal(false)}
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-space-sm">
              <p className="text-body-sm text-secondary">
                Dispatching work order <strong className="text-on-surface font-mono">#{selectedComplaint.complaintId}</strong> ({selectedComplaint.labName} - Sys #{selectedComplaint.systemNumber}).
              </p>

              <div className="space-y-1">
                <label className="font-label-sm uppercase font-bold text-secondary block">
                  Assign Lead Technician
                </label>
                <select
                  value={technicianAssigned}
                  onChange={(e) => setTechnicianAssigned(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {TECHNICIAN_ROSTER.map((tech) => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-label-sm uppercase font-bold text-secondary block">
                  Dispatch Remarks & Instructions
                </label>
                <textarea
                  rows="3"
                  value={acceptRemarks}
                  onChange={(e) => setAcceptRemarks(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="e.g. Work order approved. Proceed to Lab 402 with spare GPU module."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/30">
              <button
                onClick={() => setShowAcceptModal(false)}
                className="btn-tactile-secondary px-4 py-2"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptWorkOrder}
                className="btn-tactile-primary px-5 py-2 flex items-center gap-1.5"
                disabled={actionLoading}
              >
                {actionLoading ? 'Dispatching...' : 'Confirm Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Progress Note */}
      {showProgressModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-2xl border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">edit_note</span>
                <h3 className="font-headline-sm font-bold text-on-surface">Record Diagnostic / Repair Log</h3>
              </div>
              <button
                onClick={() => setShowProgressModal(false)}
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-space-sm">
              <p className="text-body-sm text-secondary">
                Add an operational progress note for <strong className="text-on-surface font-mono">#{selectedComplaint.complaintId}</strong>. This updates the live student timeline.
              </p>

              <div className="space-y-1">
                <label className="font-label-sm uppercase font-bold text-secondary block">
                  Diagnostic Progress Note
                </label>
                <textarea
                  rows="4"
                  value={progressNote}
                  onChange={(e) => setProgressNote(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="e.g. Swapped thermal paste on GPU. Executing 30-min FurMark stress test now."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/30">
              <button
                onClick={() => setShowProgressModal(false)}
                className="btn-tactile-secondary px-4 py-2"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateProgress}
                className="btn-tactile-primary px-5 py-2 flex items-center gap-1.5"
                disabled={actionLoading}
              >
                {actionLoading ? 'Recording...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Resolve Work Order */}
      {showResolveModal && selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-lg shadow-2xl border border-outline-variant/30 space-y-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-[24px]">verified</span>
                <h3 className="font-headline-sm font-bold text-on-surface">Resolve & Sign Off Work Order</h3>
              </div>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-secondary hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-space-sm">
              <p className="text-body-sm text-secondary">
                Certify repair completion for <strong className="text-on-surface font-mono">#{selectedComplaint.complaintId}</strong>. Automated resolution notifications will be emitted to the Student and Lab Incharge.
              </p>

              <div className="space-y-1">
                <label className="font-label-sm uppercase font-bold text-secondary block">
                  Resolution Remarks & Verification Report
                </label>
                <textarea
                  rows="4"
                  value={resolutionRemarks}
                  onChange={(e) => setResolutionRemarks(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md p-2.5 rounded-lg border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="e.g. Hardware stress test passed 100%. Thermal levels stable at 65°C. System restored to active service in Lab 402."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="close-immediately"
                  checked={closeImmediately}
                  onChange={(e) => setCloseImmediately(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
                />
                <label htmlFor="close-immediately" className="text-body-sm text-on-surface cursor-pointer select-none">
                  Close and archive work order immediately upon sign-off
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-outline-variant/30">
              <button
                onClick={() => setShowResolveModal(false)}
                className="btn-tactile-secondary px-4 py-2"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleResolveWorkOrder}
                className="btn-tactile-success px-5 py-2 flex items-center gap-1.5"
                disabled={actionLoading}
              >
                {actionLoading ? 'Certifying...' : 'Sign Off & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Lightbox Modal */}
      {showEvidence && selectedComplaint?.imageUrl && (
        <EvidenceModal
          imageUrl={selectedComplaint.imageUrl}
          title={`Evidence for ${selectedComplaint.complaintId}`}
          onClose={() => setShowEvidence(false)}
        />
      )}
    </div>
  );
}
