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
  const [showEvidence, setShowEvidence] = useState(false);

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
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span>Faculty Administration</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Step 2: Technical Review</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Lab In-Charge Verification Console
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Department Scope: <strong className="text-on-surface">{user?.department || 'Allocated Department'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/raise-issue"
            className="btn-tactile-primary px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 text-body-sm shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Report Lab Issue</span>
          </Link>

          {/* Tab Selector */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/40">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 rounded text-label-md font-semibold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              Pending Verification
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded text-label-md font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              All Department Requests
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats (Shown on All Requests Tab) */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-amber-800 font-label-sm uppercase font-bold text-[11px]">Awaiting Lab Review</span>
            <div className="font-headline-md font-bold text-amber-700 mt-1">{stats.pendingReview}</div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-blue-800 font-label-sm uppercase font-bold text-[11px]">Awaiting HOD Sign-off</span>
            <div className="font-headline-md font-bold text-blue-700 mt-1">{stats.approvedToHod}</div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-purple-800 font-label-sm uppercase font-bold text-[11px]">Approved to Admin</span>
            <div className="font-headline-md font-bold text-purple-700 mt-1">{stats.hodApproved}</div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-orange-800 font-label-sm uppercase font-bold text-[11px]">Active Repairs</span>
            <div className="font-headline-md font-bold text-orange-700 mt-1">{stats.inRepair}</div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-emerald-800 font-label-sm uppercase font-bold text-[11px]">Resolved</span>
            <div className="font-headline-md font-bold text-emerald-700 mt-1">{stats.resolved}</div>
          </div>
          <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-red-800 font-label-sm uppercase font-bold text-[11px]">Rejected</span>
            <div className="font-headline-md font-bold text-red-700 mt-1">{stats.rejected}</div>
          </div>
        </div>
      )}

      {/* Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="font-headline-sm text-on-surface font-bold flex items-center justify-between">
            <span>{activeTab === 'pending' ? 'Verification Queue' : 'Department Requests'}</span>
            <span className="text-body-sm text-secondary font-mono">{complaints.length} requests</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-secondary flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Loading queue...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-secondary">
              <span className="material-symbols-outlined text-[36px] text-secondary mb-2 block">verified</span>
              <p className="font-semibold text-on-surface">No grievances pending verification</p>
              <p className="text-body-sm mt-1">All reported issues in your department have been reviewed!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {complaints.map((item) => (
                <div
                  key={item._id}
                  onClick={() => setSelectedComplaint(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedComplaint?._id === item._id
                      ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary/30'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-mono font-bold text-primary text-body-sm">{item.complaintId}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.status === 'LAB_INCHARGE_APPROVED' || item.status === 'HOD_APPROVED' || item.status === 'RESOLVED' || item.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-semibold text-on-surface text-body-md line-clamp-1">
                    {item.title || `${item.issueCategory} at ${item.labName}`}
                  </h4>

                  <div className="flex items-center gap-3 text-secondary text-[12px] mt-2">
                    <span className="font-mono font-semibold text-primary">{item.systemNumber}</span>
                    <span>&bull;</span>
                    <span className="line-clamp-1">{item.labName}</span>
                    <span>&bull;</span>
                    <span className="text-[11px] font-mono">{item.reporter?.rollNumber || item.reporter?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Details (7 cols) */}
        <div className="lg:col-span-7">
          {selectedComplaint ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-space-md space-y-space-md shadow-xs sticky top-20">
              <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-primary text-headline-sm">{selectedComplaint.complaintId}</span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary uppercase">
                      {selectedComplaint.priority} Priority
                    </span>
                  </div>
                  <h3 className="font-headline-md font-bold text-on-surface">{selectedComplaint.title}</h3>
                </div>

                <span className={`px-3 py-1 rounded-full text-label-md font-bold ${
                  selectedComplaint.status === 'LAB_INCHARGE_APPROVED' || selectedComplaint.status === 'HOD_APPROVED' || selectedComplaint.status === 'RESOLVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedComplaint.status === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedComplaint.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Facility & Reporter Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-body-sm">
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Laboratory Facility</span>
                  <p className="font-bold text-on-surface mt-0.5">{selectedComplaint.labName}</p>
                  <p className="text-secondary text-[12px]">{selectedComplaint.labId?.location}</p>
                </div>
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Rig / Workstation</span>
                  <p className="font-mono font-bold text-primary text-body-md mt-0.5">{selectedComplaint.systemNumber}</p>
                  <p className="text-secondary text-[12px]">Category: {selectedComplaint.issueCategory}</p>
                </div>
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Reported By</span>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedComplaint.reporter?.name || 'Student'}</p>
                  <p className="text-secondary text-[12px] font-mono">Roll: {selectedComplaint.reporter?.rollNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Department Scope</span>
                  <p className="font-semibold text-on-surface mt-0.5">{selectedComplaint.department}</p>
                  <p className="text-secondary text-[12px]">{new Date(selectedComplaint.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-secondary font-label-sm uppercase font-bold block mb-1">Reported Issue Description</span>
                <p className="text-on-surface text-body-md leading-relaxed whitespace-pre-line bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* Photographic Evidence */}
              {selectedComplaint.imageUrl && (
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block mb-1">Attached Photographic Evidence</span>
                  <button
                    type="button"
                    onClick={() => setShowEvidence(true)}
                    className="p-2 bg-surface-container-low border border-outline-variant rounded-lg flex items-center gap-2 text-primary font-semibold text-body-sm hover:bg-surface-container cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">image</span>
                    <span>View Photographic Evidence</span>
                  </button>
                </div>
              )}

              {/* Action Buttons (Only available if in SUBMITTED_TO_LAB_INCHARGE status) */}
              {['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_VERIFICATION', 'SUBMITTED'].includes(selectedComplaint.status) && (
                <div className="pt-4 border-t border-outline-variant/30 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="btn-tactile-secondary text-error px-5 py-2.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Reject Grievance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(true)}
                    className="btn-tactile-primary px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Approve & Forward to HOD</span>
                  </button>
                </div>
              )}

              {/* If already approved */}
              {selectedComplaint.status === 'LAB_INCHARGE_APPROVED' && (
                <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-body-sm flex items-center gap-2 border border-blue-200">
                  <span className="material-symbols-outlined text-[20px] text-blue-700">check_circle</span>
                  <span>Verified by Lab In-Charge & forwarded to HOD for departmental sign-off.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-secondary">
              Select a grievance from the left to inspect diagnostics and perform verification.
            </div>
          )}
        </div>
      </div>

      {/* Verify & Forward Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Approve & Forward to HOD</h3>
            <p className="text-body-sm text-secondary">
              Confirm that you have inspected workstation <strong>{selectedComplaint?.systemNumber}</strong> in <strong>{selectedComplaint?.labName}</strong>. This request will be forwarded to the HOD of {selectedComplaint?.department}.
            </p>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Technical remarks (e.g. Hardware diagnostic confirmed, requires parts/technician)."
              className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleVerify}
                className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
              >
                Confirm & Escalate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-error">Reject Laboratory Grievance</h3>
            <p className="text-body-sm text-secondary">
              Please enter the specific reason for rejecting this problem report (minimum 5 characters).
            </p>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Workstation tested and fully operational; cable was unplugged by student."
              className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-error"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="bg-error hover:bg-error/90 text-on-error font-bold px-5 py-2 rounded-lg"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {showEvidence && selectedComplaint && (
        <EvidenceModal
          imageUrl={selectedComplaint.imageUrl}
          title={selectedComplaint.title}
          onClose={() => setShowEvidence(false)}
        />
      )}
    </div>
  );
}
