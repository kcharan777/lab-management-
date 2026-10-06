import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { hodService } from '../services/hodService';
import EvidenceModal from '../components/complaints/EvidenceModal';

export default function HodQueue() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals & form state
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [showEvidence, setShowEvidence] = useState(false);

  const fetchPendingQueue = async () => {
    try {
      setLoading(true);
      const res = await hodService.getPendingComplaints();
      if (res.success && res.data) {
        const list = res.data.complaints || [];
        setComplaints(list);
        if (list.length > 0) {
          setSelectedComplaint(list[0]);
        } else {
          setSelectedComplaint(null);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch HOD queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingQueue();
  }, []);

  const handleVerify = async () => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await hodService.verifyComplaint(
        selectedComplaint.complaintId,
        remarks || 'Technical grievance verified. Forwarded to Lab Incharge for hardware diagnostics.'
      );
      if (res.success) {
        addToast(`Grievance ${selectedComplaint.complaintId} verified and escalated to Lab Incharge!`, 'success');
        setShowVerifyModal(false);
        setRemarks('');
        fetchPendingQueue();
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
        addToast(`Grievance ${selectedComplaint.complaintId} rejected and student notified.`, 'info');
        setShowRejectModal(false);
        setRemarks('');
        fetchPendingQueue();
      }
    } catch (err) {
      addToast(err.message || 'Rejection failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span>Faculty Administration</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Department Verification Triage</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            HOD Verification Queue
          </h1>
          <p className="font-body-md text-body-md text-secondary max-w-3xl">
            Review logged student lab issues, verify technical validity, and route to Lab Incharge for physical inspection or reject with remarks.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface-container-lowest p-2.5 rounded-lg shadow-sm border border-outline-variant/30">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
            {complaints.length}
          </div>
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">Action Queue</span>
            <span className="font-label-md text-label-md font-semibold text-on-surface">
              {user?.department || 'Department'} CSE/ECE
            </span>
          </div>
        </div>
      </div>

      {/* Dual Panel Verification Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: Queue Card List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="font-label-md text-label-md text-secondary uppercase font-bold tracking-wider">
              Pending Items ({complaints.length})
            </span>
            <button
              onClick={fetchPendingQueue}
              className="text-body-sm text-primary hover:underline font-semibold flex items-center gap-1 text-[12px] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-secondary bg-surface-container-lowest rounded-xl border border-outline-variant/30">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading verification queue...
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-2">
              <span className="material-symbols-outlined text-emerald-600 text-[36px]">task_alt</span>
              <h4 className="font-bold text-on-surface">Verification Queue Clear</h4>
              <p className="text-secondary text-body-sm text-[12px]">
                No grievances are currently awaiting HOD sign-off.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((item) => {
                const isSelected = selectedComplaint?._id === item._id;
                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedComplaint(item)}
                    className={`relative bg-surface-container-lowest rounded-xl p-space-md shadow-sm transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-l-4 border-l-primary border-outline-variant shadow-md bg-primary/5'
                        : 'border-outline-variant/40 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-space-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-label-md font-bold text-primary font-mono">
                          {item.complaintId}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
                          {item.priority}
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm text-secondary font-mono">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="font-headline-sm text-body-md font-semibold text-on-surface leading-snug line-clamp-1">
                      {item.systemNumber} — {item.description}
                    </h3>

                    <div className="mt-2 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-secondary text-[12px]">
                      <span className="font-medium text-on-surface truncate max-w-[180px]">
                        {item.studentId?.name || 'Student'}
                      </span>
                      <span className="font-mono text-primary font-semibold">
                        {item.labName.slice(0, 24)}...
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Full Inspection & Action Viewport (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 space-y-space-md">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-3 border-b border-outline-variant/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label-lg text-label-lg font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                      {selectedComplaint.complaintId}
                    </span>
                    <span className="font-label-sm text-label-sm px-2 py-0.5 rounded uppercase font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      Awaiting HOD Sign-off
                    </span>
                  </div>
                  <h2 className="font-headline-md text-headline-sm font-bold text-on-surface pt-1">
                    {selectedComplaint.systemNumber} — {selectedComplaint.issueCategory} Issue
                  </h2>
                  <p className="text-secondary text-body-sm">
                    Filed on {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </p>
                </div>

                {selectedComplaint.imageUrl && (
                  <button
                    onClick={() => setShowEvidence(true)}
                    className="btn-tactile-secondary px-3 py-1.5 rounded text-body-sm font-semibold flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">photo_camera</span>
                    Photo Proof
                  </button>
                )}
              </div>

              {/* Student & Equipment Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-surface-container-low rounded-lg border border-outline-variant/40 text-body-sm">
                <div>
                  <span className="font-label-sm text-label-sm uppercase text-secondary font-bold block">
                    Filing Student
                  </span>
                  <span className="font-semibold text-on-surface">
                    {selectedComplaint.studentId?.name || 'Authorized Student'}
                  </span>
                  <span className="block text-secondary font-mono text-[11px]">
                    {selectedComplaint.studentId?.email}
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm uppercase text-secondary font-bold block">
                    Target Station & Facility
                  </span>
                  <span className="font-semibold text-on-surface">
                    {selectedComplaint.systemNumber}
                  </span>
                  <span className="block text-secondary text-[11px] truncate">
                    {selectedComplaint.labName}
                  </span>
                </div>
              </div>

              {/* Description Body */}
              <div className="space-y-1.5">
                <span className="font-label-md text-label-md uppercase text-secondary font-bold tracking-wide">
                  Technical Diagnostics Description
                </span>
                <div className="p-4 bg-surface-container-low/70 rounded-lg text-body-md text-on-surface border border-outline-variant/30 leading-relaxed font-normal whitespace-pre-wrap">
                  {selectedComplaint.description}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-outline-variant/30 flex items-center justify-end gap-3 flex-wrap">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                  className="btn-tactile-danger px-4 py-2.5 rounded-lg text-body-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  Reject Grievance
                </button>

                <button
                  onClick={() => setShowVerifyModal(true)}
                  disabled={actionLoading}
                  className="btn-tactile-primary px-5 py-2.5 rounded-lg text-body-sm font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  Verify & Escalate to Incharge
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-2">
              <span className="material-symbols-outlined text-secondary text-[40px]">touch_app</span>
              <h4 className="font-bold text-on-surface">Select a Grievance to Inspect</h4>
              <p className="text-secondary text-body-sm text-[12px]">
                Click any pending ticket in the queue on the left to review hardware telemetry and verify.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Verify Confirmation Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-lg w-full bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-body-md font-bold text-on-surface">
                  Confirm HOD Verification
                </h3>
                <p className="font-label-sm text-label-sm text-secondary font-mono">
                  {selectedComplaint?.complaintId}
                </p>
              </div>
            </div>

            <p className="text-body-sm text-secondary">
              Verifying this complaint will officially escalate the work order to the <strong>Lab Incharge</strong> for hardware diagnostics and dispatch.
            </p>

            <div className="space-y-1.5">
              <label className="font-label-md text-secondary uppercase font-bold text-xs" htmlFor="verify-remarks">
                Faculty Remarks / Directives (Optional)
              </label>
              <textarea
                id="verify-remarks"
                rows="3"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Verified critical GPU fault. Escalate to Lab Incharge for hardware exchange."
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowVerifyModal(false);
                  setRemarks('');
                }}
                className="btn-tactile-secondary px-4 py-2 rounded-lg text-body-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleVerify}
                className="btn-tactile-primary px-5 py-2 rounded-lg text-body-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Verification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-lg w-full bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">cancel</span>
              </div>
              <div>
                <h3 className="font-headline-sm text-body-md font-bold text-on-surface">
                  Reject Grievance Filing
                </h3>
                <p className="font-label-sm text-label-sm text-secondary font-mono">
                  {selectedComplaint?.complaintId}
                </p>
              </div>
            </div>

            <p className="text-body-sm text-secondary">
              This complaint will be permanently terminated with status <strong className="text-error">REJECTED</strong>. The student will be notified with your remarks.
            </p>

            <div className="space-y-1.5">
              <label className="font-label-md text-secondary uppercase font-bold text-xs" htmlFor="reject-remarks">
                Rejection Reason (Mandatory, min 5 chars)
              </label>
              <textarea
                id="reject-remarks"
                rows="3"
                required
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="State technical reason or instructions for student resolution..."
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded p-3 border border-outline-variant/60 focus:outline-none focus:ring-2 focus:ring-error shadow-inner"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRemarks('');
                }}
                className="btn-tactile-secondary px-4 py-2 rounded-lg text-body-sm font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="btn-tactile-danger px-5 py-2 rounded-lg text-body-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Grievance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {showEvidence && selectedComplaint?.imageUrl && (
        <EvidenceModal
          imageUrl={selectedComplaint.imageUrl}
          complaintId={selectedComplaint.complaintId}
          labName={selectedComplaint.labName}
          onClose={() => setShowEvidence(false)}
        />
      )}
    </div>
  );
}
