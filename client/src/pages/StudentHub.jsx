import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { complaintService } from '../services/complaintService';
import ComplaintTimeline from '../components/complaints/ComplaintTimeline';

export default function StudentHub() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [kpis, setKpis] = useState({
    total: 0,
    awaitingVerification: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintHistory, setComplaintHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await complaintService.getMyComplaints({
        category: filterCategory !== 'ALL' ? filterCategory : undefined,
        search: searchQuery || undefined,
      });

      if (res.success && res.data) {
        const fetchedComplaints = res.data.complaints || [];
        setComplaints(fetchedComplaints);
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        }

        // Auto-select the first or currently selected complaint to spotlight in timeline
        if (fetchedComplaints.length > 0) {
          loadComplaintDetails(fetchedComplaints[0].complaintId);
        } else {
          setSelectedComplaint(null);
          setComplaintHistory([]);
        }
      }
    } catch (err) {
      console.error('Failed to load student hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadComplaintDetails = async (id) => {
    try {
      const res = await complaintService.getComplaintById(id);
      if (res.success && res.data) {
        setSelectedComplaint(res.data.complaint);
        setComplaintHistory(res.data.history || []);
      }
    } catch (err) {
      console.error('Failed to load complaint details:', err);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [filterCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudentData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
      case 'HOD_VERIFICATION':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'LAB_INCHARGE_VERIFICATION':
        return 'bg-blue-50 text-blue-900 border-blue-300';
      case 'ASSIGNED_TO_MAIN_ADMIN':
      case 'ACCEPTED':
        return 'bg-purple-50 text-purple-900 border-purple-300';
      case 'IN_PROGRESS':
        return 'bg-primary/10 text-primary border-primary/30';
      case 'RESOLVED':
      case 'CLOSED':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300';
      case 'REJECTED':
        return 'bg-error-container text-on-error-container border-error/30';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span>Student Portal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Live Operational Telemetry</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Student Hub & Issue Tracking
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-3xl">
            Live telemetry, status verification progression, and hardware maintenance tracking for logged grievances.
          </p>
        </div>

        <Link
          to="/raise-issue"
          className="btn-tactile-primary px-4 py-2.5 rounded-lg font-bold text-body-sm flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Raise New Issue</span>
        </Link>
      </div>

      {/* KPI Stats Cards matching Stitch student_hub.html */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {/* Awaiting Action */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-tertiary uppercase tracking-wider font-bold">
              Awaiting Verification
            </span>
            <div className="w-9 h-9 rounded-lg bg-tertiary-fixed/30 flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-tertiary font-bold">
              {kpis.awaitingVerification}
            </span>
            <span className="font-label-sm text-label-sm text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded font-mono font-bold">
              HOD / Incharge
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-secondary text-body-sm">
            <span className="material-symbols-outlined text-[14px] text-tertiary">schedule</span>
            <span>Target turnaround: &lt; 4.2h</span>
          </div>
        </div>

        {/* Work In Progress */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-primary uppercase tracking-wider font-bold">
              Work In Progress
            </span>
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">build_circle</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-primary font-bold">
              {kpis.inProgress}
            </span>
            <span className="font-label-sm text-label-sm text-on-primary bg-primary-container px-2 py-0.5 rounded font-mono font-bold">
              Under Repair
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-secondary text-body-sm">
            <span className="material-symbols-outlined text-[14px] text-primary">local_shipping</span>
            <span>Hardware maintenance queued</span>
          </div>
        </div>

        {/* Resolved & Verified */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-outline-variant/30 hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-label-md text-label-md text-emerald-700 uppercase tracking-wider font-bold">
              Resolved & Verified
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
              {kpis.resolved}
            </span>
            <span className="font-label-sm text-label-sm text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
              Operational
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-secondary text-body-sm">
            <span className="material-symbols-outlined text-[14px] text-emerald-600">thumb_up</span>
            <span>Verified by diagnostics</span>
          </div>
        </div>
      </div>

      {/* Hero Spotlight: Active Status Tracking Pipeline (7 Nodes) */}
      {selectedComplaint ? (
        <ComplaintTimeline complaint={selectedComplaint} history={complaintHistory} />
      ) : (
        <div className="bg-surface-container-lowest rounded-xl p-space-xl text-center border border-outline-variant/30 space-y-3">
          <span className="material-symbols-outlined text-secondary text-[48px]">pending_actions</span>
          <h3 className="font-headline-sm text-on-surface font-bold">No Active Grievance Selected</h3>
          <p className="text-secondary text-body-sm max-w-md mx-auto">
            You currently have no complaints selected for tracking. File a new equipment grievance or choose a past record below.
          </p>
          <Link to="/raise-issue" className="inline-flex btn-tactile-primary px-4 py-2 rounded-lg text-body-sm font-bold">
            Raise Laboratory Grievance
          </Link>
        </div>
      )}

      {/* Grievance Ledger & History Table matching Stitch design */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden space-y-4 p-space-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-outline-variant/30">
          <div>
            <h3 className="font-headline-md text-headline-sm font-bold text-on-surface">
              Grievance Ledger & History
            </h3>
            <p className="font-body-sm text-secondary">
              Chronological log of your filed lab equipment reports and real-time status.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket / equipment..."
                className="bg-surface-container-low text-on-surface text-body-sm font-body-sm rounded p-2 pl-8 border border-outline-variant/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="material-symbols-outlined absolute left-2 top-2.5 text-secondary text-[16px]">
                search
              </span>
            </form>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-surface-container-low text-on-surface text-body-sm font-body-sm rounded p-2 border border-outline-variant/50 focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">All Categories</option>
              <option value="HARDWARE">Hardware</option>
              <option value="SOFTWARE">Software</option>
              <option value="NETWORK">Network</option>
              <option value="POWER_ELECTRICAL">Power</option>
              <option value="PERIPHERAL">Peripheral</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-wider border-b border-outline-variant/40">
                <th className="p-3">Complaint ID</th>
                <th className="p-3">Lab Facility</th>
                <th className="p-3">Equipment Node</th>
                <th className="p-3">Category</th>
                <th className="p-3">Filed On</th>
                <th className="p-3">Lifecycle Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-body-sm text-body-sm">
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-secondary">
                    No complaints match your search or filter criteria.
                  </td>
                </tr>
              ) : (
                complaints.map((c) => {
                  const isCurrent = selectedComplaint?._id === c._id;
                  return (
                    <tr
                      key={c._id}
                      onClick={() => loadComplaintDetails(c.complaintId)}
                      className={`hover:bg-surface-container-low/70 transition-colors cursor-pointer ${
                        isCurrent ? 'bg-primary/5 font-semibold' : ''
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-primary">
                        {c.complaintId}
                      </td>
                      <td className="p-3 font-medium text-on-surface truncate max-w-xs">
                        {c.labName}
                      </td>
                      <td className="p-3 font-mono text-on-surface-variant">
                        {c.systemNumber}
                      </td>
                      <td className="p-3">
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                          {c.issueCategory}
                        </span>
                      </td>
                      <td className="p-3 text-secondary font-mono text-label-sm">
                        {new Date(c.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="p-3">
                        <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded border font-mono font-semibold uppercase ${getStatusBadge(c.status)}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadComplaintDetails(c.complaintId);
                          }}
                          className="btn-tactile-secondary px-2.5 py-1 rounded text-body-sm text-[12px] font-semibold cursor-pointer"
                        >
                          Spotlight
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
