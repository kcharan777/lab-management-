import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { hodService } from '../services/hodService';
import EvidenceModal from '../components/complaints/EvidenceModal';

export default function HodQueue() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    awaitingReview: 0,
    approvedToAdmin: 0,
    activeRepairs: 0,
    resolved: 0,
    rejected: 0,
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & form state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [evidenceModal, setEvidenceModal] = useState({ isOpen: false, imageUrl: '', title: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'pending') {
        const res = await hodService.getPendingComplaints();
        if (res.success && res.data) {
          const list = res.data.complaints || [];
          setComplaints(list);
          setSelectedComplaint(list.length > 0 ? list[0] : null);
        }
      } else {
        const res = await hodService.getAllComplaints();
        if (res.success && res.data) {
          const list = res.data.complaints || [];
          setComplaints(list);
          if (res.data.stats) setStats(res.data.stats);
          setSelectedComplaint(list.length > 0 ? list[0] : null);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch HOD queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleVerify = async () => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await hodService.verifyComplaint(
        selectedComplaint.complaintId,
        remarks || 'Departmental authorization granted by HOD. Forwarded to Admin for work order generation and repair dispatch.'
      );
      if (res.success) {
        addToast(`Grievance ${selectedComplaint.complaintId} approved and forwarded to Admin!`, 'success');
        setShowVerifyModal(false);
        setRemarks('');
        fetchData();
      }
    } catch (err) {
      addToast(err.message || 'Verification failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedComplaint) return;
    if (!remarks.trim() || remarks.trim().length < 5) {
      addToast('Rejection remarks are mandatory (minimum 5 characters)', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const res = await hodService.rejectComplaint(selectedComplaint.complaintId, remarks);
      if (res.success) {
        addToast(`Grievance ${selectedComplaint.complaintId} rejected.`, 'info');
        setShowRejectModal(false);
        setRemarks('');
        fetchData();
      }
    } catch (err) {
      addToast(err.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6 animate-in fade-in duration-300">
      {/* 1. Distinct Theme Header: Executive Department Chair Governance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 border border-purple-500/30 p-6 sm:p-7 text-white shadow-xl">
        {/* Regal Executive Orbs */}
        <div className="absolute -top-10 -right-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 left-1/4 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold border border-purple-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
                STEP 03 // EXECUTIVE CHAIR CLEARANCE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-semibold border border-amber-500/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">gavel</span>
                SINGLE HOD AUTHORITY
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 font-mono text-[11px] border border-white/15">
                DEPT: {user?.department || 'Department'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-purple-400 text-[32px]">account_balance</span>
              <span>Department Chair Governance Terminal</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Exercise departmental sign-off on pre-verified laboratory hardware faults. Authorize procurement and escalate tickets to Central Campus Operations.
            </p>
          </div>

          {/* Tactical Executive Tabs */}
          <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-xl border border-purple-500/30 self-start md:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">pending_actions</span>
              <span>Awaiting Chair Sign-off</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 font-extrabold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">history_edu</span>
              <span>Departmental Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Telemetry KPI Strip */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Awaiting Sign-off', count: stats.awaitingReview, icon: 'hourglass_empty', border: 'border-amber-400/40', text: 'text-amber-500' },
            { label: 'Approved to Admin', count: stats.approvedToAdmin, icon: 'shield_person', border: 'border-purple-400/40', text: 'text-purple-500' },
            { label: 'Active in Repair', count: stats.activeRepairs, icon: 'construction', border: 'border-blue-400/40', text: 'text-blue-500' },
            { label: 'Certified Resolved', count: stats.resolved, icon: 'task_alt', border: 'border-emerald-400/40', text: 'text-emerald-500' },
            { label: 'Authorization Denied', count: stats.rejected, icon: 'cancel', border: 'border-rose-400/40', text: 'text-rose-500' },
          ].map((item) => (
            <div
              key={item.label}
              className={`p-3.5 rounded-xl bg-surface-container-lowest border ${item.border} shadow-sm transition-all hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-secondary uppercase tracking-wider">{item.label}</span>
                <span className={`material-symbols-outlined text-[18px] ${item.text}`}>{item.icon}</span>
              </div>
              <div className={`font-mono text-2xl font-black ${item.text} mt-1`}>{item.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Main Split Grid: Dossier Queue & Executive Clearance Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List (5 cols): Dossier Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-on-surface text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-500 text-[20px]">policy</span>
              <span>{activeTab === 'pending' ? 'Executive Review Queue' : 'Department Authorization Ledger'}</span>
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-secondary border border-outline-variant/30">
              {complaints.length} dossiers
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-purple-500 text-[32px] animate-spin">sync</span>
              <span className="font-mono text-xs">Loading faculty governance dossiers...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-secondary space-y-2">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">verified_user</span>
              </div>
              <p className="font-bold text-on-surface text-sm">All Departmental Requests Cleared</p>
              <p className="text-xs text-secondary max-w-xs mx-auto">No unreviewed laboratory requests currently pending your executive authorization.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {complaints.map((item) => {
                const isSelected = selectedComplaint?._id === item._id;
                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedComplaint(item)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected
                        ? 'bg-surface-container-lowest border-purple-500 shadow-md ring-2 ring-purple-500/20'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:border-purple-500/40 hover:bg-surface-container-low/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-purple-500 to-indigo-500"></div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-1.5 pl-1">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-purple-500 text-[16px]">verified</span>
                        <span className="font-mono font-bold text-primary text-xs">{item.complaintId}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.status === 'HOD_APPROVED' || item.status === 'RESOLVED' || item.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="font-semibold text-on-surface text-sm line-clamp-1 pl-1">
                      {item.title || `${item.issueCategory} at ${item.labName}`}
                    </h4>

                    <div className="flex items-center gap-2 text-secondary text-[11px] mt-2.5 pl-1 flex-wrap font-mono">
                      <span className="px-2 py-0.5 rounded bg-surface-container font-bold text-purple-700">
                        {item.systemNumber}
                      </span>
                      <span>•</span>
                      <span className="text-secondary truncate max-w-[140px]">{item.labName}</span>
                      <span>•</span>
                      <span className="text-secondary">{item.reporter?.rollNumber || item.reporter?.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Details (7 cols): Executive Clearance Inspector */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-6 space-y-5 shadow-sm sticky top-20">
              {/* Header with Dossier ID & Priority */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-outline-variant/30 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono font-black text-purple-600 text-lg">{selectedComplaint.complaintId}</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      selectedComplaint.priority === 'HIGH' || selectedComplaint.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {selectedComplaint.priority} PRIORITY
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      CATEGORY: {selectedComplaint.issueCategory}
                    </span>
                  </div>
                  <h3 className="font-bold text-on-surface text-lg">{selectedComplaint.title}</h3>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start ${
                  selectedComplaint.status === 'HOD_APPROVED' || selectedComplaint.status === 'RESOLVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedComplaint.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                }`}>
                  {selectedComplaint.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Lab Incharge Step 2 Verification Seal Badge */}
              {selectedComplaint.labInchargeVerification?.verifiedBy && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">verified_user</span>
                    <span>STEP 02 VERIFIED: LABORATORY IN-CHARGE TECHNICAL INSPECTION</span>
                  </div>
                  <p className="text-emerald-950 font-medium pl-6">
                    "{selectedComplaint.labInchargeVerification.remarks || 'Hardware diagnostic completed. Fault verified.'}"
                  </p>
                  <p className="text-emerald-800 font-mono text-[11px] pl-6">
                    Certified by: {selectedComplaint.labInchargeVerification.verifiedBy?.name || 'In-Charge'} on{' '}
                    {new Date(selectedComplaint.labInchargeVerification.verifiedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              {/* Facility & Reporter Grid */}
              <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/40 text-xs">
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Laboratory Facility</span>
                  <p className="font-bold text-on-surface text-sm mt-0.5">{selectedComplaint.labName}</p>
                  <p className="text-secondary font-mono text-[11px]">{selectedComplaint.labId?.location || 'Campus Facility'}</p>
                </div>
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Rig / Terminal No</span>
                  <p className="font-mono font-black text-purple-600 text-sm mt-0.5">{selectedComplaint.systemNumber}</p>
                  <p className="text-secondary font-mono text-[11px]">Subsystem: {selectedComplaint.issueCategory}</p>
                </div>
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Reported By</span>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedComplaint.reporter?.name || 'Student Reporter'}</p>
                  <p className="text-secondary font-mono text-[11px]">Roll: {selectedComplaint.reporter?.rollNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Department Scope</span>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedComplaint.department}</p>
                  <p className="text-secondary font-mono text-[11px]">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-secondary font-mono font-bold uppercase text-[11px] block mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-purple-500">description</span>
                  <span>Reported Problem Details</span>
                </span>
                <p className="text-on-surface text-sm leading-relaxed whitespace-pre-line bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 font-sans">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Photographic Evidence Lightbox Previews */}
              <div className="flex flex-wrap gap-3">
                {selectedComplaint.imageUrl && (
                  <div>
                    <span className="text-secondary font-mono font-bold uppercase text-[10px] block mb-1">Attached Fault Evidence</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceModal({
                        isOpen: true,
                        imageUrl: selectedComplaint.imageUrl,
                        title: 'Equipment Fault Photographic Evidence',
                      })}
                      className="px-3.5 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-2 text-purple-700 font-semibold text-xs hover:bg-purple-500/20 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">image</span>
                      <span>View Fault Evidence</span>
                    </button>
                  </div>
                )}
                {selectedComplaint.completionProofImageUrl && (
                  <div>
                    <span className="text-emerald-700 font-mono font-bold uppercase text-[10px] block mb-1">Work Completion Proof</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceModal({
                        isOpen: true,
                        imageUrl: selectedComplaint.completionProofImageUrl,
                        title: 'Work Completion Photographic Proof',
                      })}
                      className="px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-800 font-semibold text-xs hover:bg-emerald-500/20 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                      <span>View Completion Photo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Toolbar: Executive Authorization Decision */}
              {['LAB_INCHARGE_APPROVED', 'HOD_VERIFICATION'].includes(selectedComplaint.status) && (
                <div className="pt-4 border-t border-outline-variant/30 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[17px]">cancel</span>
                    <span>Reject Dossier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-600 hover:to-indigo-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-purple-700/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                    <span>Grant Chair Authorization & Escalate to Admin</span>
                  </button>
                </div>
              )}

              {/* Status Note */}
              {selectedComplaint.status === 'HOD_APPROVED' && (
                <div className="p-3.5 bg-purple-50 text-purple-900 rounded-xl text-xs flex items-center gap-2.5 border border-purple-200">
                  <span className="material-symbols-outlined text-[20px] text-purple-700">check_circle</span>
                  <span className="font-medium">Departmental authorization granted by HOD. Queued in Campus Admin Operations Console for technician assignment.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-secondary space-y-2">
              <span className="material-symbols-outlined text-[36px] text-purple-500/60 block">account_balance</span>
              <p className="font-bold text-on-surface text-sm">Select Dossier from Department Queue</p>
              <p className="text-xs text-secondary">Choose any grievance from the list to review Lab In-Charge technical verification and grant departmental authorization.</p>
            </div>
          )}
        </div>
      </div>

      {/* Verify & Forward Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-purple-500/30 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-purple-600 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-[18px]">gavel</span>
              <span>EXECUTIVE CHAIR AUTHORIZATION</span>
            </div>
            <h3 className="font-bold text-on-surface text-lg">Approve & Escalate to Central Admin</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Authorizing this request will notify the Central Campus System Administrator to dispatch a Repair Assistant or issue procurement for workstation <strong className="text-on-surface">{selectedComplaint?.systemNumber}</strong> in <strong className="text-on-surface">{selectedComplaint?.labName}</strong>.
            </p>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="HOD comments (e.g. Budget authorization approved, technician dispatch requested)."
              className="w-full bg-surface-container-low text-on-surface text-xs rounded-xl p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-secondary hover:text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleVerify}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 text-white font-bold text-xs shadow-md shadow-purple-700/30 flex items-center gap-1.5"
              >
                {actionLoading ? 'Processing...' : 'Authorize & Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-rose-300 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-rose-700 text-lg">Reject Laboratory Request</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Please enter the specific reason for rejecting this problem report (minimum 5 characters).
            </p>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Laboratory decommissioning scheduled next week; replacement units pending."
              className="w-full bg-surface-container-low text-on-surface text-xs rounded-xl p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-outline-variant text-secondary hover:text-on-surface text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md shadow-rose-600/30"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {evidenceModal.isOpen && selectedComplaint && (
        <EvidenceModal
          imageUrl={evidenceModal.imageUrl}
          title={evidenceModal.title}
          complaintId={selectedComplaint.complaintId}
          labName={selectedComplaint.labName}
          onClose={() => setEvidenceModal({ isOpen: false, imageUrl: '', title: '' })}
        />
      )}
    </div>
  );
}
