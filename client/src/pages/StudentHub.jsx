import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { complaintService } from "../services/complaintService";

const STATUS_META = {
  SUBMITTED_TO_LAB_INCHARGE:    { label: "Submitted",         color: "bg-amber-100 text-amber-900 border-amber-300",     step: 1 },
  LAB_INCHARGE_VERIFICATION:    { label: "Lab Review",         color: "bg-amber-100 text-amber-900 border-amber-300",     step: 1 },
  SUBMITTED:                    { label: "Submitted",         color: "bg-amber-100 text-amber-900 border-amber-300",     step: 1 },
  LAB_INCHARGE_APPROVED:        { label: "Lab Approved",      color: "bg-blue-100 text-blue-900 border-blue-300",        step: 2 },
  HOD_VERIFICATION:             { label: "HOD Review",        color: "bg-blue-100 text-blue-900 border-blue-300",        step: 2 },
  HOD_APPROVED:                 { label: "HOD Approved",      color: "bg-purple-100 text-purple-900 border-purple-300",  step: 3 },
  ADMIN_REVIEW:                 { label: "Admin Review",      color: "bg-purple-100 text-purple-900 border-purple-300",  step: 3 },
  ASSIGNED_TO_MAIN_ADMIN:       { label: "Admin Review",      color: "bg-purple-100 text-purple-900 border-purple-300",  step: 3 },
  ACCEPTED:                     { label: "Dispatched",        color: "bg-indigo-100 text-indigo-900 border-indigo-300",  step: 4 },
  ASSIGNED_TO_REPAIR_ASSISTANT: { label: "Assigned to Tech",  color: "bg-indigo-100 text-indigo-900 border-indigo-300",  step: 4 },
  IN_PROGRESS:                  { label: "In Progress",       color: "bg-primary/10 text-primary border-primary/30",    step: 4 },
  ON_HOLD:                      { label: "On Hold",           color: "bg-slate-100 text-slate-700 border-slate-300",    step: 4 },
  RESOLVED:                     { label: "Resolved",          color: "bg-emerald-100 text-emerald-900 border-emerald-300", step: 5 },
  CLOSED:                       { label: "Closed",            color: "bg-emerald-100 text-emerald-900 border-emerald-300", step: 5 },
  REJECTED:                     { label: "Rejected",          color: "bg-red-100 text-red-900 border-red-300",          step: -1 },
};

const getStatusMeta = (s) => STATUS_META[s] || { label: s.replace(/_/g, " "), color: "bg-slate-100 text-slate-700 border-slate-300", step: 0 };
const fmt = (d) => d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : null;
const fmtShort = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "�";

function MiniStepper({ complaint }) {
  const status = complaint.status;
  const isRejected = status === "REJECTED";
  const currentStep = isRejected ? -1 : (getStatusMeta(status).step);
  const steps = [
    { n: 1, label: "Submitted" },
    { n: 2, label: "Lab Incharge" },
    { n: 3, label: "HOD" },
    { n: 4, label: "Admin/Tech" },
    { n: 5, label: "Resolved" },
  ];
  return (
    <div className="flex items-center w-full mt-3 gap-0">
      {steps.map((s, i) => {
        const done = !isRejected && currentStep >= s.n;
        const active = !isRejected && currentStep === s.n;
        return (
          <React.Fragment key={s.n}>
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${done ? "bg-emerald-600 border-emerald-600 text-white" : active ? "bg-primary border-primary text-white" : isRejected ? "bg-surface border-outline-variant text-secondary" : "bg-surface border-outline-variant text-secondary"}`}>
                {done ? "?" : s.n}
              </div>
              <span className={`text-[9px] mt-0.5 font-semibold text-center leading-tight max-w-[44px] ${done ? "text-emerald-700" : active ? "text-primary" : "text-secondary/50"}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-0.5 rounded ${done && currentStep > s.n ? "bg-emerald-500" : "bg-outline-variant/30"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ApprovalStep({ num, title, done, active, rejected, date, by, role, remarks, action }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold border-2 mt-0.5 ${done ? "bg-emerald-600 border-emerald-600 text-white" : rejected ? "bg-red-600 border-red-600 text-white" : active ? "bg-primary border-primary text-white" : "bg-surface border-outline-variant text-secondary"}`}>
        {done ? "?" : rejected ? "?" : num}
      </div>
      <div className={`flex-1 rounded-xl p-3 border text-[12px] ${done ? "bg-emerald-50 border-emerald-200" : rejected ? "bg-red-50 border-red-200" : active ? "bg-primary/5 border-primary/30" : "bg-surface-container-low border-outline-variant/30 opacity-50"}`}>
        <div className="flex items-center justify-between mb-1 gap-2">
          <span className={`font-bold text-[13px] ${done ? "text-emerald-800" : rejected ? "text-red-800" : active ? "text-primary" : "text-secondary"}`}>{title}</span>
          {date && <span className="font-mono text-[11px] text-secondary shrink-0">{date}</span>}
        </div>
        {by && <p className={`text-[11px] mb-0.5 ${done ? "text-emerald-700" : "text-secondary"}`}>By: <span className="font-semibold">{by}</span> ({role.replace(/_/g, " ")})</p>}
        {action && <p className="font-semibold text-on-surface mt-0.5">{action}</p>}
        {remarks && <p className={`mt-0.5 italic ${done ? "text-emerald-700" : rejected ? "text-red-700" : "text-secondary"}`}>"{remarks}"</p>}
        {!done && !rejected && !date && <p className="text-secondary italic">{active ? "Currently under review..." : "Waiting for previous step"}</p>}
      </div>
    </div>
  );
}

function ComplaintDetailPanel({ complaint, history, onClose }) {
  if (!complaint) return null;
  const meta = getStatusMeta(complaint.status);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/30 sticky top-0 bg-surface-container-lowest z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-primary">{complaint.complaintId}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${meta.color}`}>{meta.label}</span>
            </div>
            <h2 className="font-bold text-on-surface">{complaint.title || `${complaint.issueCategory} � ${complaint.labName}`}</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center text-secondary cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-body-sm bg-surface-container-low rounded-xl p-4 border border-outline-variant/30">
            <div><span className="text-secondary text-[11px] font-bold uppercase block">Lab Facility</span><p className="font-semibold text-on-surface mt-0.5">{complaint.labName}</p></div>
            <div><span className="text-secondary text-[11px] font-bold uppercase block">Equipment / System</span><p className="font-mono font-bold text-primary mt-0.5">{complaint.systemNumber}</p></div>
            <div><span className="text-secondary text-[11px] font-bold uppercase block">Category</span><p className="font-semibold text-on-surface mt-0.5">{complaint.issueCategory}</p></div>
            <div><span className="text-secondary text-[11px] font-bold uppercase block">Priority</span><p className="font-semibold text-on-surface mt-0.5">{complaint.priority}</p></div>
            <div className="col-span-2"><span className="text-secondary text-[11px] font-bold uppercase block">Description</span><p className="text-on-surface mt-0.5">{complaint.description}</p></div>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-3">Approval Progress</h3>
            <div className="space-y-3">
              <ApprovalStep num={1} title="Problem Reported" done={true}
                date={fmt(complaint.createdAt)}
                by={complaint.reporter?.name || complaint.studentId?.name || "Student"}
                role="STUDENT" remarks={complaint.description} />

              <ApprovalStep num={2} title="Lab In-Charge Verification"
                done={!!complaint.labInchargeVerification?.verifiedAt}
                active={["SUBMITTED_TO_LAB_INCHARGE","LAB_INCHARGE_VERIFICATION","SUBMITTED"].includes(complaint.status)}
                rejected={complaint.labInchargeVerification?.action === "REJECTED"}
                date={fmt(complaint.labInchargeVerification?.verifiedAt)}
                by={complaint.labInchargeVerification?.verifiedBy?.name || null}
                role="LAB_INCHARGE"
                remarks={complaint.labInchargeVerification?.remarks}
                action={complaint.labInchargeVerification?.action} />

              <ApprovalStep num={3} title="HOD Department Approval"
                done={!!complaint.hodVerification?.verifiedAt}
                active={["LAB_INCHARGE_APPROVED","HOD_VERIFICATION"].includes(complaint.status)}
                rejected={complaint.hodVerification?.action === "REJECTED"}
                date={fmt(complaint.hodVerification?.verifiedAt)}
                by={complaint.hodVerification?.verifiedBy?.name || null}
                role="HOD"
                remarks={complaint.hodVerification?.remarks}
                action={complaint.hodVerification?.action} />

              <ApprovalStep num={4} title="Admin Dispatch & Repair"
                done={["ASSIGNED_TO_REPAIR_ASSISTANT","IN_PROGRESS","RESOLVED","CLOSED","ACCEPTED"].includes(complaint.status)}
                active={["HOD_APPROVED","ADMIN_REVIEW","ASSIGNED_TO_MAIN_ADMIN"].includes(complaint.status)}
                date={fmt(complaint.adminAction?.assignedAt)}
                by={complaint.adminAction?.reviewedBy?.name || null}
                role="MAIN_ADMIN"
                remarks={complaint.adminAction?.remarks}
                action={complaint.adminAction?.assignedAssistantName ? `Assigned to: ${complaint.adminAction.assignedAssistantName}` : null} />

              {complaint.adminAction?.progressNotes?.length > 0 && (
                <div className="ml-7 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block">Technician Progress Notes</span>
                  {complaint.adminAction.progressNotes.map((n, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[12px]">
                      <p className="text-blue-900 font-medium">{n.note}</p>
                      <p className="text-blue-600 font-mono text-[11px] mt-1">{fmt(n.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {(complaint.status === "RESOLVED" || complaint.status === "CLOSED") && (
                <div className="ml-7 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">task_alt</span>
                    <span className="font-bold text-emerald-800">Issue {complaint.status === "CLOSED" ? "Closed" : "Resolved"}</span>
                    <span className="text-emerald-600 font-mono text-[11px] ml-auto">{fmt(complaint.resolvedAt || complaint.closedAt)}</span>
                  </div>
                  {complaint.resolutionRemarks && <p className="text-emerald-800 text-[12px]">{complaint.resolutionRemarks}</p>}
                </div>
              )}

              {complaint.status === "REJECTED" && (
                <div className="ml-7 bg-red-50 border border-red-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-red-600 text-[18px]">cancel</span>
                    <span className="font-bold text-red-800">Request Rejected</span>
                  </div>
                  <p className="text-red-800 text-[12px]">{complaint.rejectionReason || "Could not be verified by faculty review."}</p>
                </div>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-3">Audit Trail ({history.length} events)</h3>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {history.map((h, i) => (
                  <div key={h._id || i} className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-2.5 text-[12px]">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-bold text-primary font-mono">{h.action || h.newStatus}</span>
                      <span className="text-secondary font-mono text-[11px]">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-on-surface">{h.remarks || (h.newStatus || "").replace(/_/g, " ")}</p>
                    <p className="text-secondary text-[11px] mt-0.5">By: {h.userName || h.user?.name || "Staff"} ({h.userRole || h.user?.role || "�"})</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {complaint.imageUrl && (
            <div className="border-t border-outline-variant/30 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-secondary mb-2">Photographic Evidence</p>
              <img src={complaint.imageUrl} alt="Evidence" className="rounded-lg border border-outline-variant/30 max-h-48 object-cover" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentHub() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintHistory, setComplaintHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const res = await complaintService.getMyComplaints({
        category: filterCategory !== "ALL" ? filterCategory : undefined,
        search: searchQuery || undefined,
      });
      if (res.success && res.data) {
        const fetched = res.data.complaints || [];
        setComplaints(fetched);
        const t = res.data.telemetry || res.data.kpis || {};
        setKpis({
          total: t.total || fetched.length,
          pending: t.pending || 0,
          inProgress: t.inProgress || 0,
          resolved: t.resolved || 0,
        });
      }
    } catch (err) {
      console.error("Failed to load student hub data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openComplaint = async (complaintId) => {
    try {
      const res = await complaintService.getComplaintById(complaintId);
      if (res.success && res.data) {
        setSelectedComplaint(res.data.complaint);
        setComplaintHistory(res.data.timeline || res.data.history || []);
        setShowPanel(true);
      }
    } catch (err) {
      console.error("Failed to load complaint details:", err);
    }
  };

  useEffect(() => { fetchStudentData(); }, [filterCategory]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-secondary mb-1">
            <span>Student Portal</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">My Complaints & Progress</span>
          </div>
          <h1 className="font-bold text-2xl text-on-surface tracking-tight">Student Hub & Issue Tracking</h1>
          <p className="text-secondary text-body-sm mt-1">Track every stage of your lab grievance � from submission to resolution.</p>
        </div>
        <Link to="/raise-issue" className="btn-tactile-primary px-4 py-2.5 rounded-lg font-bold text-body-sm flex items-center gap-2 self-start cursor-pointer">
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          <span>Raise New Issue</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Filed",       value: kpis.total,      icon: "receipt_long", color: "text-on-surface",  bg: "bg-surface-container-high" },
          { label: "Awaiting Approval", value: kpis.pending,    icon: "hourglass_top", color: "text-amber-700",  bg: "bg-amber-50" },
          { label: "Under Repair",      value: kpis.inProgress, icon: "build_circle",  color: "text-primary",    bg: "bg-primary/10" },
          { label: "Resolved",          value: kpis.resolved,   icon: "task_alt",      color: "text-emerald-700",bg: "bg-emerald-50" },
        ].map(k => (
          <div key={k.label} className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-4 flex items-center gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-[22px] ${k.color}`}>{k.icon}</span>
            </div>
            <div>
              <p className={`font-bold text-2xl leading-none ${k.color}`}>{loading ? "�" : k.value}</p>
              <p className="text-secondary text-[12px] font-medium mt-0.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-outline-variant/30">
          <div>
            <h2 className="font-bold text-on-surface">Grievance Ledger</h2>
            <p className="text-secondary text-[12px]">Click any complaint to see the full approval progress & status details.</p>
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={e => { e.preventDefault(); fetchStudentData(); }} className="relative">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search complaint�"
                className="bg-surface-container-low text-on-surface text-body-sm rounded-lg p-2 pl-8 border border-outline-variant/50 focus:outline-none focus:ring-1 focus:ring-primary w-44" />
              <span className="material-symbols-outlined absolute left-2 top-2.5 text-secondary text-[16px]">search</span>
            </form>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="bg-surface-container-low text-on-surface text-body-sm rounded-lg p-2 border border-outline-variant/50 cursor-pointer font-medium focus:outline-none">
              <option value="ALL">All Categories</option>
              <option value="HARDWARE">Hardware</option>
              <option value="SOFTWARE">Software</option>
              <option value="NETWORK">Network</option>
              <option value="POWER_ELECTRICAL">Power</option>
              <option value="PERIPHERAL">Peripheral</option>
              <option value="OTHER">Other</option>
            </select>
            <button onClick={fetchStudentData} className="p-2 rounded-lg border border-outline-variant/50 hover:bg-surface-container-low cursor-pointer" title="Refresh">
              <span className="material-symbols-outlined text-secondary text-[18px]">refresh</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-secondary">
            <span className="material-symbols-outlined text-[40px]">progress_activity</span>
            <p className="mt-2 text-body-sm">Loading your complaints�</p>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <span className="material-symbols-outlined text-secondary text-[48px]">inbox</span>
            <h3 className="font-bold text-on-surface">No complaints found</h3>
            <p className="text-secondary text-body-sm">You have not raised any issues yet, or none match your filter.</p>
            <Link to="/raise-issue" className="inline-flex btn-tactile-primary px-4 py-2 rounded-lg text-body-sm font-bold mt-2">Raise Laboratory Grievance</Link>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {complaints.map(c => {
              const meta = getStatusMeta(c.status);
              return (
                <div key={c._id} onClick={() => openComplaint(c.complaintId)} className="p-4 hover:bg-surface-container-low/60 transition-colors cursor-pointer group">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-primary text-[13px]">{c.complaintId}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${meta.color}`}>{meta.label}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-surface-container text-secondary font-medium">{c.issueCategory}</span>
                        <span className="text-[11px] text-secondary font-mono">{fmtShort(c.createdAt)}</span>
                      </div>
                      <p className="font-semibold text-on-surface text-body-sm truncate">{c.title || `${c.issueCategory} � ${c.labName}`}</p>
                      <p className="text-secondary text-[12px] mt-0.5">
                        <span className="material-symbols-outlined text-[13px] align-text-bottom mr-0.5">science</span>
                        {c.labName}
                        <span className="mx-1.5 text-outline-variant">�</span>
                        <span className="font-mono">{c.systemNumber}</span>
                      </p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); openComplaint(c.complaintId); }}
                      className="btn-tactile-secondary px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1 self-start cursor-pointer shrink-0">
                      <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      View Progress
                    </button>
                  </div>
                  <MiniStepper complaint={c} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showPanel && selectedComplaint && (
        <ComplaintDetailPanel complaint={selectedComplaint} history={complaintHistory} onClose={() => setShowPanel(false)} />
      )}
    </div>
  );
}
