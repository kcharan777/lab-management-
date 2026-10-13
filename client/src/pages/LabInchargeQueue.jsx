import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { labInchargeService } from '../services/labInchargeService';
import EvidenceModal from '../components/complaints/EvidenceModal';

export default function LabInchargeQueue() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({
    pendingReview: 0,
    approvedToHod: 0,
    hodApproved: 0,
    inRepair: 0,
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
        const res = await labInchargeService.getPendingComplaints();
        if (res.success && res.data) {
          const list = res.data.complaints || [];
          setComplaints(list);
          setSelectedComplaint(list.length > 0 ? list[0] : null);
        }
      } else {
        const res = await labInchargeService.getAllComplaints();
        if (res.success && res.data) {
          const list = res.data.complaints || [];
          setComplaints(list);
          if (res.data.stats) setStats(res.data.stats);
          setSelectedComplaint(list.length > 0 ? list[0] : null);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch Lab In-Charge queue', 'error');
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
      const res = await labInchargeService.verifyComplaint(
        selectedComplaint.complaintId,
        remarks || 'Hardware diagnostics completed by Lab In-Charge. Defect verified and forwarded to HOD for departmental sign-off.'
      );
      if (res.success) {
        addToast(`Grievance ${selectedComplaint.complaintId} verified and escalated to HOD!`, 'success');
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
      const res = await labInchargeService.rejectComplaint(selectedComplaint.complaintId, remarks);
      if (res.success) {
        addToast(`Grievance ${selectedComplaint.complaintId} rejected and reporter notified.`, 'info');
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
      {/* 1. Distinct Theme Header: Hardware Diagnostics & Bench Workbench */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950 via-slate-900 to-teal-950 border border-amber-500/30 p-6 sm:p-7 text-white shadow-xl">
        {/* Hardware Blueprint Grid Background Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07] pointer-events-none"></div>
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                STEP 02 // HARDWARE DIAGNOSTICS & BENCH TRIAGE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[11px] font-semibold border border-teal-500/30 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">developer_board</span>
                BENCH TELEMETRY ACTIVE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 font-mono text-[11px] border border-white/15">
                LAB SCOPE: {user?.department || 'Allocated Department'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-400 text-[32px]">hardware</span>
              <span>Laboratory Workbench & Rig Diagnostics</span>
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Verify physical workstation anomalies, inspect peripheral integrity, and authorize technical escalation to the Department Chair.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/raise-issue"
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Report Lab Issue</span>
            </Link>

            {/* Tactical Workbench Tabs */}
            <div className="flex p-1 bg-slate-900/80 backdrop-blur-md rounded-xl border border-amber-500/30">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">pending_actions</span>
                <span>Awaiting Bench Review</span>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">inventory_2</span>
                <span>All Lab Dispatches</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hardware Workbench KPI Telemetry Meter Bar */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Awaiting Bench Review', count: stats.pendingReview, icon: 'hourglass_empty', border: 'border-amber-400/40', text: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Awaiting HOD Sign-off', count: stats.approvedToHod, icon: 'forward_to_inbox', border: 'border-blue-400/40', text: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Approved to Admin', count: stats.hodApproved, icon: 'shield_person', border: 'border-purple-400/40', text: 'text-purple-500', bg: 'bg-purple-500/10' },
            { label: 'Active Rig Repairs', count: stats.inRepair, icon: 'construction', border: 'border-orange-400/40', text: 'text-orange-500', bg: 'bg-orange-500/10' },
            { label: 'Systems Restored', count: stats.resolved, icon: 'verified', border: 'border-teal-400/40', text: 'text-teal-500', bg: 'bg-teal-500/10' },
            { label: 'Bench Rejected', count: stats.rejected, icon: 'highlight_off', border: 'border-rose-400/40', text: 'text-rose-500', bg: 'bg-rose-500/10' },
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

      {/* 3. Main Split View: Rig Triage Roster & Hardware Diagnostic Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List (5 cols): Diagnostic Roster */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-on-surface text-base flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[20px]">precision_manufacturing</span>
              <span>{activeTab === 'pending' ? 'Triage Queue' : 'Department Hardware Roster'}</span>
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-secondary border border-outline-variant/30">
              {complaints.length} units logged
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-secondary bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[32px] animate-spin">sync</span>
              <span className="font-mono text-xs">Scanning laboratory hardware telemetry...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-secondary space-y-2">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-600 mx-auto flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">verified</span>
              </div>
              <p className="font-bold text-on-surface text-sm">All Rig Diagnostics Cleared</p>
              <p className="text-xs text-secondary max-w-xs mx-auto">No unreviewed hardware grievances currently pending in this laboratory sector.</p>
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
                        ? 'bg-surface-container-lowest border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'bg-surface-container-lowest border-outline-variant/30 hover:border-amber-500/40 hover:bg-surface-container-low/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-teal-500"></div>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-1.5 pl-1">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-[16px]">developer_board</span>
                        <span className="font-mono font-bold text-primary text-xs">{item.complaintId}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.status === 'LAB_INCHARGE_APPROVED' || item.status === 'HOD_APPROVED' || item.status === 'RESOLVED' || item.status === 'CLOSED'
                          ? 'bg-teal-100 text-teal-800 border border-teal-200'
                          : item.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {item.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h4 className="font-semibold text-on-surface text-sm line-clamp-1 pl-1">
                      {item.title || `${item.issueCategory} at ${item.labName}`}
                    </h4>

                    <div className="flex items-center gap-2 text-secondary text-[11px] mt-2.5 pl-1 flex-wrap font-mono">
                      <span className="px-2 py-0.5 rounded bg-surface-container font-bold text-amber-700">
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

        {/* Right Details (7 cols): Hardware Diagnostic Inspection Bench */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-6 space-y-5 shadow-sm sticky top-20">
              {/* Header with Rig ID & Priority */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-outline-variant/30 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono font-black text-amber-600 text-lg">{selectedComplaint.complaintId}</span>
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      selectedComplaint.priority === 'HIGH' || selectedComplaint.priority === 'URGENT'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {selectedComplaint.priority} PRIORITY
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                      CATEGORY: {selectedComplaint.issueCategory}
                    </span>
                  </div>
                  <h3 className="font-bold text-on-surface text-lg">{selectedComplaint.title}</h3>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold self-start ${
                  selectedComplaint.status === 'LAB_INCHARGE_APPROVED' || selectedComplaint.status === 'HOD_APPROVED' || selectedComplaint.status === 'RESOLVED'
                    ? 'bg-teal-100 text-teal-800'
                    : selectedComplaint.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {selectedComplaint.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Hardware Workstation Telemetry Specs */}
              <div className="grid grid-cols-2 gap-3.5 p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/40 text-xs">
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Laboratory Facility</span>
                  <p className="font-bold text-on-surface text-sm mt-0.5">{selectedComplaint.labName}</p>
                  <p className="text-secondary font-mono text-[11px]">{selectedComplaint.labId?.location || 'Campus Tech Block'}</p>
                </div>
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Rig / Terminal No</span>
                  <p className="font-mono font-black text-amber-600 text-sm mt-0.5">{selectedComplaint.systemNumber}</p>
                  <p className="text-secondary font-mono text-[11px]">Subsystem: {selectedComplaint.issueCategory}</p>
                </div>
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Reported By</span>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedComplaint.reporter?.name || 'Student Reporter'}</p>
                  <p className="text-secondary font-mono text-[11px]">ID: {selectedComplaint.reporter?.rollNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-secondary font-mono font-bold uppercase text-[10px] block">Logged Timestamp</span>
                  <p className="font-semibold text-on-surface mt-0.5 font-mono">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
                  <p className="text-secondary font-mono text-[11px]">{selectedComplaint.department}</p>
                </div>
              </div>

              {/* Symptom / Problem Specification */}
              <div>
                <span className="text-secondary font-mono font-bold uppercase text-[11px] block mb-1.5 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-amber-500">description</span>
                  <span>Reported Symptom & Diagnostic Description</span>
                </span>
                <p className="text-on-surface text-sm leading-relaxed whitespace-pre-line bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 font-sans">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Photographic Evidence Lightbox Previews */}
              <div className="flex flex-wrap gap-3">
                {selectedComplaint.imageUrl && (
                  <div>
                    <span className="text-secondary font-mono font-bold uppercase text-[10px] block mb-1">Photographic Fault Evidence</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceModal({
                        isOpen: true,
                        imageUrl: selectedComplaint.imageUrl,
                        title: 'Equipment Fault Photographic Evidence',
                      })}
                      className="px-3.5 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-amber-700 font-semibold text-xs hover:bg-amber-500/20 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">image</span>
                      <span>Inspect Fault Photo</span>
                    </button>
                  </div>
                )}
                {selectedComplaint.completionProofImageUrl && (
                  <div>
                    <span className="text-teal-700 font-mono font-bold uppercase text-[10px] block mb-1">Work Completion Certificate Proof</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceModal({
                        isOpen: true,
                        imageUrl: selectedComplaint.completionProofImageUrl,
                        title: 'Work Completion Photographic Proof',
                      })}
                      className="px-3.5 py-2 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center gap-2 text-teal-800 font-semibold text-xs hover:bg-teal-500/20 cursor-pointer transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px] text-teal-600">verified</span>
                      <span>Inspect Completion Photo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Toolbar: Hardware Inspection Decision */}
              {['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_VERIFICATION', 'SUBMITTED'].includes(selectedComplaint.status) && (
                <div className="pt-4 border-t border-outline-variant/30 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[17px]">cancel</span>
                    <span>Reject / Fault Not Found</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Verify Diagnostics & Forward to HOD</span>
                  </button>
                </div>
              )}

              {/* Status Note */}
              {selectedComplaint.status === 'LAB_INCHARGE_APPROVED' && (
                <div className="p-3.5 bg-teal-50 text-teal-900 rounded-xl text-xs flex items-center gap-2.5 border border-teal-200">
                  <span className="material-symbols-outlined text-[20px] text-teal-700">check_circle</span>
                  <span className="font-medium">Workstation diagnostics confirmed by Lab In-Charge and forwarded to Department Chair (HOD) for administrative clearance.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-16 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 text-secondary space-y-2">
              <span className="material-symbols-outlined text-[36px] text-amber-500/60 block">science</span>
              <p className="font-bold text-on-surface text-sm">Select Hardware Unit from Roster</p>
              <p className="text-xs text-secondary">Choose any grievance from the list to examine hardware diagnostics and proceed with verification.</p>
            </div>
          )}
        </div>
      </div>

      {/* Verify & Forward Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-amber-500/30 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-amber-600 font-mono text-xs font-bold">
              <span className="material-symbols-outlined text-[18px]">developer_board</span>
              <span>HARDWARE DIAGNOSTIC CERTIFICATION</span>
            </div>
            <h3 className="font-bold text-on-surface text-lg">Approve & Escalate to HOD</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Confirm that you have physically inspected workstation <strong className="text-on-surface">{selectedComplaint?.systemNumber}</strong> in <strong className="text-on-surface">{selectedComplaint?.labName}</strong>. This ticket will be dispatched to the Department Chair of <strong className="text-on-surface">{selectedComplaint?.department}</strong>.
            </p>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Technical diagnostic remarks (e.g. Component inspected. RAM seating failed, requires technician dispatch)."
              className="w-full bg-surface-container-low text-on-surface text-xs rounded-xl p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
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
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-teal-600 hover:from-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5"
              >
                {actionLoading ? 'Processing...' : 'Certify & Forward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-rose-300 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-rose-700 text-lg">Reject Laboratory Grievance</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Please enter the specific hardware inspection reason for rejecting this report (minimum 5 characters).
            </p>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Workstation tested on bench and fully functional; power socket switch was turned off."
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
