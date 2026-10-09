import React, { useState } from 'react';
import EvidenceModal from './EvidenceModal';

export default function ComplaintTimeline({ complaint, history = [] }) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (!complaint) return null;

  const status = complaint.status;
  const isRejected = status === 'REJECTED';

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Pending';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Node states for 4-step workflow (1 to 7)
  const getNodeState = (nodeIndex) => {
    if (isRejected) {
      if (complaint.labInchargeVerification?.action === 'REJECTED') {
        if (nodeIndex === 1) return 'completed';
        if (nodeIndex === 2) return 'rejected';
        return 'inactive';
      }
      if (complaint.hodVerification?.action === 'REJECTED') {
        if (nodeIndex <= 2) return 'completed';
        if (nodeIndex === 3) return 'rejected';
        return 'inactive';
      }
      return 'inactive';
    }

    switch (nodeIndex) {
      case 1: // Step 1: Problem Reported
        return 'completed';

      case 2: // Step 2: Lab Incharge Verified
        if (['LAB_INCHARGE_APPROVED', 'HOD_APPROVED', 'ADMIN_REVIEW', 'ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ACCEPTED'].includes(status)) return 'completed';
        if (['SUBMITTED_TO_LAB_INCHARGE', 'LAB_INCHARGE_VERIFICATION', 'SUBMITTED'].includes(status)) return 'active';
        return 'inactive';

      case 3: // Step 3: HOD Approved
        if (['HOD_APPROVED', 'ADMIN_REVIEW', 'ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ACCEPTED'].includes(status)) return 'completed';
        if (['LAB_INCHARGE_APPROVED', 'HOD_VERIFICATION'].includes(status)) return 'active';
        return 'inactive';

      case 4: // Step 4: Admin Dispatched / Assigned to Assistant
        if (['ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ACCEPTED'].includes(status)) return 'completed';
        if (['HOD_APPROVED', 'ADMIN_REVIEW', 'ASSIGNED_TO_MAIN_ADMIN'].includes(status)) return 'active';
        return 'inactive';

      case 5: // Repair In Progress
        if (['RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        if (status === 'IN_PROGRESS' || status === 'ON_HOLD') return 'active';
        return 'inactive';

      case 6: // Problem Resolved
        if (['RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        return 'inactive';

      case 7: // Request Closed
        if (status === 'CLOSED') return 'completed';
        return 'inactive';

      default:
        return 'inactive';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-error/10 text-error border-error/20';
      case 'HIGH':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const nodes = [
    {
      num: 1,
      name: 'Step 1: Reported',
      timestamp: formatDate(complaint.createdAt),
      meta: `Logged by ${complaint.reporter?.name || complaint.studentId?.name || 'Student'}`,
    },
    {
      num: 2,
      name: 'Step 2: Lab In-Charge',
      timestamp: formatDate(complaint.labInchargeVerification?.verifiedAt),
      meta: complaint.labInchargeVerification?.remarks || 'Pending technical review',
    },
    {
      num: 3,
      name: 'Step 3: HOD Approval',
      timestamp: formatDate(complaint.hodVerification?.verifiedAt),
      meta: complaint.hodVerification?.remarks || 'Pending departmental sign-off',
    },
    {
      num: 4,
      name: 'Step 4: Admin Dispatch',
      timestamp: formatDate(complaint.adminAction?.assignedAt),
      meta: complaint.adminAction?.assignedAssistantName ? `Assigned: ${complaint.adminAction.assignedAssistantName}` : 'Awaiting technician assignment',
    },
    {
      num: 5,
      name: 'Repair In Progress',
      timestamp: complaint.adminAction?.progressNotes?.length > 0 ? formatDate(complaint.adminAction.progressNotes[0].updatedAt) : 'Pending work',
      meta: complaint.adminAction?.progressNotes?.length > 0 ? `${complaint.adminAction.progressNotes.length} progress note(s) logged` : 'Work pending',
    },
    {
      num: 6,
      name: 'Problem Resolved',
      timestamp: formatDate(complaint.resolvedAt),
      meta: complaint.resolutionRemarks || 'Pending final testing',
    },
    {
      num: 7,
      name: 'Request Closed',
      timestamp: formatDate(complaint.closedAt),
      meta: 'Institutional grievance archived',
    },
  ];

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-space-md space-y-space-md shadow-xs">
      {/* Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-primary text-headline-sm">{complaint.complaintId}</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getPriorityBadge(complaint.priority)}`}>
              {complaint.priority}
            </span>
          </div>
          <h3 className="font-headline-md font-bold text-on-surface">{complaint.title}</h3>
        </div>

        <span className={`px-3 py-1 rounded-full text-label-md font-bold self-start sm:self-auto ${
          complaint.status === 'RESOLVED' || complaint.status === 'CLOSED'
            ? 'bg-emerald-100 text-emerald-800'
            : complaint.status === 'REJECTED'
            ? 'bg-red-100 text-red-800'
            : 'bg-primary/10 text-primary'
        }`}>
          {complaint.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Facility & Equipment Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-body-sm">
        <div>
          <span className="text-secondary font-label-sm uppercase font-bold text-[11px] block">Facility</span>
          <p className="font-bold text-on-surface mt-0.5">{complaint.labName}</p>
        </div>
        <div>
          <span className="text-secondary font-label-sm uppercase font-bold text-[11px] block">Workstation / Rig</span>
          <p className="font-mono font-bold text-primary mt-0.5">{complaint.systemNumber}</p>
        </div>
        <div>
          <span className="text-secondary font-label-sm uppercase font-bold text-[11px] block">Category</span>
          <p className="font-semibold text-on-surface mt-0.5">{complaint.issueCategory}</p>
        </div>
        <div>
          <span className="text-secondary font-label-sm uppercase font-bold text-[11px] block">Department</span>
          <p className="font-semibold text-on-surface mt-0.5">{complaint.department}</p>
        </div>
      </div>

      {/* Rejection Alert if Rejected */}
      {isRejected && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-900 rounded-lg text-body-sm flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[20px] text-red-700 shrink-0">cancel</span>
          <div>
            <span className="font-bold">Request Rejected:</span>
            <p className="text-[12px] mt-0.5">{complaint.rejectionReason || 'Defect could not be verified by faculty review.'}</p>
          </div>
        </div>
      )}

      {/* Progress Stepper Line */}
      <div className="pt-2">
        <h4 className="font-label-md uppercase tracking-wider text-secondary font-bold text-[11px] mb-4">
          Institutional Multi-Level Workflow Progress
        </h4>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-outline-variant/40">
          {nodes.map((node) => {
            const state = getNodeState(node.num);

            return (
              <div key={node.num} className="relative flex items-start gap-3">
                {/* Circle Icon Indicator */}
                <div
                  className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                    state === 'completed'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : state === 'active'
                      ? 'bg-primary border-primary text-white animate-pulse'
                      : state === 'rejected'
                      ? 'bg-red-600 border-red-600 text-white'
                      : 'bg-surface border-outline-variant text-secondary'
                  }`}
                >
                  {state === 'completed' ? '✓' : state === 'rejected' ? '✕' : node.num}
                </div>

                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-body-sm font-bold ${
                      state === 'active' ? 'text-primary font-bold' : state === 'completed' ? 'text-on-surface' : 'text-secondary'
                    }`}>
                      {node.name}
                    </span>
                    <span className="text-[11px] font-mono text-secondary">{node.timestamp}</span>
                  </div>
                  <p className="text-[12px] text-secondary">{node.meta}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Photographic Evidence Link */}
      {complaint.imageUrl && (
        <div className="pt-2 border-t border-outline-variant/30">
          <button
            type="button"
            onClick={() => setShowEvidence(true)}
            className="text-primary font-semibold text-body-sm flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">image</span>
            <span>View Uploaded Photographic Evidence</span>
          </button>
        </div>
      )}

      {/* Immutable History Timeline List */}
      {history.length > 0 && (
        <div className="pt-4 border-t border-outline-variant/30 space-y-2">
          <h4 className="font-label-md uppercase tracking-wider text-secondary font-bold text-[11px]">
            Activity History & Audit Trail ({history.length} events)
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {history.map((h, idx) => (
              <div key={h._id || idx} className="p-2.5 bg-surface-container-low rounded-lg text-[12px] border border-outline-variant/30 space-y-1">
                <div className="flex items-center justify-between font-mono text-secondary text-[11px]">
                  <span className="font-bold text-primary">{h.action}</span>
                  <span>{new Date(h.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-on-surface">{h.remarks || h.newStatus}</p>
                <div className="text-[11px] text-secondary">
                  By: {h.userName || h.user?.name || 'Staff'} ({h.userRole || h.user?.role || 'User'})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEvidence && (
        <EvidenceModal
          imageUrl={complaint.imageUrl}
          title={complaint.title}
          onClose={() => setShowEvidence(false)}
        />
      )}
    </div>
  );
}
