import React, { useState } from 'react';
import EvidenceModal from './EvidenceModal';

export default function ComplaintTimeline({ complaint, history = [] }) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (!complaint) return null;

  const status = complaint.status;
  const isRejected = status === 'REJECTED';

  // Format dates helper
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

  // Node statuses determination (1 to 7)
  const getNodeState = (nodeIndex) => {
    if (isRejected) {
      // Find at which stage rejection occurred
      if (complaint.hodVerification?.action === 'REJECTED') {
        if (nodeIndex === 1) return 'completed';
        if (nodeIndex === 2) return 'rejected';
        return 'inactive';
      }
      if (complaint.labInchargeVerification?.action === 'REJECTED') {
        if (nodeIndex <= 2) return 'completed';
        if (nodeIndex === 3) return 'rejected';
        return 'inactive';
      }
      return 'inactive';
    }

    switch (nodeIndex) {
      case 1: // Submitted
        return 'completed';
      case 2: // HOD Verified
        if (['LAB_INCHARGE_VERIFICATION', 'ASSIGNED_TO_MAIN_ADMIN', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        if (['SUBMITTED', 'HOD_VERIFICATION'].includes(status)) return 'active';
        return 'inactive';
      case 3: // Lab Incharge
        if (['ASSIGNED_TO_MAIN_ADMIN', 'ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        if (status === 'LAB_INCHARGE_VERIFICATION') return 'active';
        return 'inactive';
      case 4: // Admin Accepted
        if (['ACCEPTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        if (status === 'ASSIGNED_TO_MAIN_ADMIN') return 'active';
        return 'inactive';
      case 5: // In Progress
        if (['RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        if (status === 'IN_PROGRESS') return 'active';
        return 'inactive';
      case 6: // Resolved
        if (['RESOLVED', 'CLOSED'].includes(status)) return 'completed';
        return 'inactive';
      case 7: // Closed
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

  // Node details
  const nodes = [
    {
      num: 1,
      name: '1. Submitted',
      timestamp: formatDate(complaint.createdAt),
      meta: `Logged by ${complaint.studentId?.name || 'Student'}`,
    },
    {
      num: 2,
      name: '2. HOD Verified',
      timestamp: formatDate(complaint.hodVerification?.verifiedAt),
      meta: complaint.hodVerification?.remarks || 'Pending faculty review',
    },
    {
      num: 3,
      name: '3. Lab Incharge',
      timestamp: formatDate(complaint.labInchargeVerification?.verifiedAt),
      meta: complaint.labInchargeVerification?.remarks || 'Pending equipment diagnostics',
    },
    {
      num: 4,
      name: '4. Admin Accepted',
      timestamp: formatDate(complaint.mainAdminAction?.acceptedAt),
      meta: complaint.mainAdminAction?.technicianAssigned
        ? `Dispatched: ${complaint.mainAdminAction.technicianAssigned}`
        : 'Awaiting work order intake',
    },
    {
      num: 5,
      name: '5. In Progress',
      timestamp: complaint.mainAdminAction?.progressNotes?.length
        ? formatDate(complaint.mainAdminAction.progressNotes[complaint.mainAdminAction.progressNotes.length - 1].updatedAt)
        : null,
      meta: complaint.mainAdminAction?.progressNotes?.length
        ? complaint.mainAdminAction.progressNotes[complaint.mainAdminAction.progressNotes.length - 1].note
        : 'Hardware servicing queue',
    },
    {
      num: 6,
      name: '6. Resolved',
      timestamp: formatDate(complaint.resolvedAt),
      meta: complaint.resolutionRemarks || 'Pending final resolution',
    },
    {
      num: 7,
      name: '7. Closed',
      timestamp: formatDate(complaint.closedAt || complaint.resolvedAt),
      meta: complaint.closedAt ? 'Signed off and archived' : 'Pending student sign-off',
    },
  ];

  return (
    <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
      {/* Header Bar */}
      <div className="p-space-lg bg-surface-container-low/70 flex flex-col xl:flex-row xl:items-center justify-between gap-space-md border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="font-label-lg text-label-lg font-bold text-on-surface bg-surface-container-highest px-2.5 py-1 rounded font-mono">
              {complaint.complaintId}
            </span>
            <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded font-bold uppercase border flex items-center gap-1.5 ${getPriorityBadge(complaint.priority)}`}>
              {complaint.priority === 'CRITICAL' && (
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
              )}
              {complaint.priority} Priority
            </span>
            <span className="bg-surface-container text-primary font-label-sm text-label-sm px-2.5 py-1 rounded font-semibold uppercase">
              {complaint.issueCategory}
            </span>
            <span className="font-label-sm text-label-sm bg-primary/10 text-primary px-2.5 py-1 rounded font-mono font-bold uppercase">
              {complaint.status}
            </span>
          </div>

          <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold pt-1">
            {complaint.systemNumber} — {complaint.description.length > 70 ? `${complaint.description.slice(0, 70)}...` : complaint.description}
          </h2>

          <p className="font-body-sm text-body-sm text-secondary flex items-center gap-space-xs flex-wrap">
            <span className="material-symbols-outlined text-[16px] text-primary">pin_drop</span>
            <span className="font-semibold text-on-surface">{complaint.labName}</span>
            <span>•</span>
            <span className="font-mono text-secondary">Asset ID: #{complaint.systemNumber}</span>
          </p>
        </div>

        {/* Right Info: Technician & Photo button */}
        <div className="flex items-center gap-space-md flex-wrap">
          {complaint.imageUrl && (
            <button
              onClick={() => setShowEvidence(true)}
              className="btn-tactile-secondary px-3 py-2 rounded text-body-sm font-semibold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">photo_camera</span>
              View Evidence
            </button>
          )}

          <div className="bg-surface-container-lowest px-4 py-2 rounded-lg shadow-sm border border-outline-variant/30">
            <span className="font-label-sm text-label-sm text-secondary uppercase block">Technician In Charge</span>
            <span className="font-headline-sm text-body-md text-on-surface font-semibold">
              {complaint.mainAdminAction?.technicianAssigned || 'Triage Assigned'}
            </span>
          </div>
        </div>
      </div>

      {/* Rejection Alert Banner (if rejected) */}
      {isRejected && (
        <div className="p-4 bg-error-container/40 border-b border-error/30 text-on-error-container flex items-start gap-3">
          <span className="material-symbols-outlined text-error text-[24px]">cancel</span>
          <div className="space-y-0.5">
            <h4 className="font-bold text-body-md text-error">Grievance Filing Rejected</h4>
            <p className="text-body-sm text-on-surface">
              {complaint.hodVerification?.action === 'REJECTED'
                ? `HOD Remark: ${complaint.hodVerification.remarks}`
                : `Lab Incharge Remark: ${complaint.labInchargeVerification?.remarks || 'Rejected'}`}
            </p>
          </div>
        </div>
      )}

      {/* 7-Node Escalation Lifecycle Pipeline */}
      <div className="p-space-lg">
        <div className="font-label-md text-label-md text-secondary uppercase tracking-wider mb-6 flex items-center justify-between">
          <span>Escalation Lifecycle Pipeline (7 Milestones)</span>
          <span className="text-primary font-mono font-semibold">
            {isRejected ? 'Filing Terminated' : `Active Milestone: ${complaint.status.replace(/_/g, ' ')}`}
          </span>
        </div>

        {/* Stepper Track */}
        <div className="relative grid grid-cols-1 md:grid-cols-7 gap-3">
          {nodes.map((node) => {
            const state = getNodeState(node.num);

            if (state === 'completed') {
              return (
                <div key={node.num} className="flex flex-col relative group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </div>
                    <div className="hidden md:block flex-1 h-1 bg-emerald-600 rounded"></div>
                  </div>
                  <span className="font-headline-sm text-body-sm text-on-surface font-semibold">
                    {node.name}
                  </span>
                  <span className="font-label-sm text-label-sm text-emerald-700 mt-0.5 font-mono">
                    {node.timestamp}
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-1 leading-snug line-clamp-2">
                    {node.meta}
                  </span>
                </div>
              );
            }

            if (state === 'active') {
              return (
                <div key={node.num} className="flex flex-col relative bg-primary/5 p-2 rounded-lg -m-2 shadow-sm border border-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute inline-flex h-8 w-8 rounded-full bg-primary/30 animate-ping"></span>
                      <div className="relative w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs shadow-md">
                        <span className="material-symbols-outlined text-[18px]">
                          {node.num === 5 ? 'engineering' : 'pending'}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:block flex-1 h-1 bg-outline-variant/40 rounded"></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-headline-sm text-body-sm text-primary font-bold">
                      {node.name}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  </div>
                  <span className="font-label-sm text-label-sm text-primary mt-0.5 font-mono font-semibold">
                    Active Stage
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface font-medium mt-1 leading-snug line-clamp-2">
                    {node.meta}
                  </span>
                </div>
              );
            }

            if (state === 'rejected') {
              return (
                <div key={node.num} className="flex flex-col relative bg-error/5 p-2 rounded-lg -m-2 border border-error/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-error text-white flex items-center justify-center font-bold text-xs shadow-sm">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </div>
                    <div className="hidden md:block flex-1 h-1 bg-error rounded"></div>
                  </div>
                  <span className="font-headline-sm text-body-sm text-error font-bold">
                    Rejected
                  </span>
                  <span className="font-label-sm text-label-sm text-error mt-0.5 font-mono">
                    {node.timestamp}
                  </span>
                  <span className="font-body-sm text-[11px] text-on-surface-variant mt-1 leading-snug line-clamp-2">
                    {node.meta}
                  </span>
                </div>
              );
            }

            // Inactive / Pending Node
            return (
              <div key={node.num} className="flex flex-col relative group opacity-60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold text-xs">
                    <span className="font-mono text-label-sm">{node.num}</span>
                  </div>
                  <div className="hidden md:block flex-1 h-1 bg-outline-variant/40 rounded"></div>
                </div>
                <span className="font-headline-sm text-body-sm text-on-surface font-medium">
                  {node.name}
                </span>
                <span className="font-label-sm text-label-sm text-secondary mt-0.5 font-mono">
                  Pending
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant mt-1 leading-snug line-clamp-2">
                  {node.meta}
                </span>
              </div>
            );
          })}
        </div>

        {/* Detailed Timeline Audit Log Feed */}
        {history && history.length > 0 && (
          <div className="mt-8 pt-6 border-t border-outline-variant/30">
            <h4 className="font-headline-sm text-body-md font-bold text-on-surface mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">history</span>
              Verified Audit Trail ({history.length} Events)
            </h4>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={h._id || i}
                  className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-body-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-label-sm text-label-sm font-mono px-2 py-0.5 rounded bg-surface-container-highest text-primary font-bold">
                      {h.status}
                    </span>
                    <span className="text-on-surface font-medium">{h.remarks || 'Status milestone updated'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-secondary text-body-sm shrink-0">
                    <span>by <strong className="text-on-surface">{h.updatedBy?.name || 'Staff'}</strong> ({h.updatedBy?.role || 'System'})</span>
                    <span className="font-mono text-label-sm">{formatDate(h.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showEvidence && complaint.imageUrl && (
        <EvidenceModal
          imageUrl={complaint.imageUrl}
          complaintId={complaint.complaintId}
          labName={complaint.labName}
          onClose={() => setShowEvidence(false)}
        />
      )}
    </section>
  );
}
