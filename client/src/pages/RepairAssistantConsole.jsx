import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { repairAssistantService } from '../services/repairAssistantService';
import { complaintService } from '../services/complaintService';
import EvidenceModal from '../components/complaints/EvidenceModal';

export default function RepairAssistantConsole() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ totalAssigned: 0, pending: 0, inProgress: 0, completed: 0 });
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & search
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & form fields
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [proofUploading, setProofUploading] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState({ isOpen: false, imageUrl: '', title: '' });

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await repairAssistantService.getMyTasks(params);
      if (res.success && res.data) {
        setTasks(res.data.tasks || []);
        setStats(res.data.stats || { totalAssigned: 0, pending: 0, inProgress: 0, completed: 0 });
        if (res.data.tasks?.length > 0 && !selectedTask) {
          setSelectedTask(res.data.tasks[0]);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to load assigned repair tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const handleStartRepair = async (task) => {
    try {
      setActionLoading(true);
      const res = await repairAssistantService.startRepair(task.complaintId, 'Technician arrived on site. Hardware diagnostics initiated.');
      if (res.success) {
        addToast(`Repair task ${task.complaintId} initiated! Status updated to IN_PROGRESS.`, 'success');
        fetchTasks();
      }
    } catch (err) {
      addToast(err.message || 'Failed to start repair', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddProgress = async () => {
    if (!selectedTask) return;
    if (!progressNote.trim()) {
      addToast('Please enter a progress note', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const res = await repairAssistantService.addProgressNote(selectedTask.complaintId, progressNote);
      if (res.success) {
        addToast('Progress note logged to work order timeline', 'success');
        setShowProgressModal(false);
        setProgressNote('');
        fetchTasks();
      }
    } catch (err) {
      addToast(err.message || 'Failed to add progress note', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadProofImage = async (file) => {
    if (!file) return;
    try {
      setProofUploading(true);
      const res = await complaintService.uploadEvidenceImage(file);
      const uploadedUrl = res?.data?.imageUrl || res?.imageUrl;
      if (uploadedUrl) {
        setProofImageUrl(uploadedUrl);
        addToast('Completion proof photo uploaded successfully!', 'success');
      } else {
        throw new Error('Image uploaded, but server did not return a valid URL.');
      }
    } catch (err) {
      addToast(err.message || 'Failed to upload proof photo', 'error');
    } finally {
      setProofUploading(false);
    }
  };

  const handleCompleteRepair = async () => {
    if (!selectedTask) return;
    if (!resolutionRemarks.trim() || resolutionRemarks.trim().length < 5) {
      addToast('Resolution remarks are required (minimum 5 characters)', 'warning');
      return;
    }
    try {
      setActionLoading(true);
      const payload = {
        resolutionRemarks: resolutionRemarks.trim(),
        completionProofImageUrl: proofImageUrl.trim() || undefined,
      };
      const res = await repairAssistantService.completeRepair(selectedTask.complaintId, payload);
      if (res.success) {
        addToast(`Repair task ${selectedTask.complaintId} completed! HOD and Lab In-Charge notified.`, 'success');
        setShowResolveModal(false);
        setResolutionRemarks('');
        setProofImageUrl('');
        fetchTasks();
      }
    } catch (err) {
      addToast(err.message || 'Failed to complete repair', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span>Maintenance & Repair Division</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Field Assistant Work Orders</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Repair Assistant Task Console
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Assigned laboratory hardware defects and work order diagnostics
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant/40">
          {['ALL', 'ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded text-label-md font-semibold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {st === 'ALL'
                ? 'All Tasks'
                : st === 'ASSIGNED_TO_REPAIR_ASSISTANT'
                ? 'Assigned'
                : st === 'IN_PROGRESS'
                ? 'In Progress'
                : 'Resolved'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <span className="text-secondary font-label-sm uppercase font-bold">Assigned Tasks</span>
          <div className="font-headline-lg font-bold text-on-surface mt-1">{stats.totalAssigned}</div>
        </div>
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <span className="text-amber-800 font-label-sm uppercase font-bold">Awaiting Action</span>
          <div className="font-headline-lg font-bold text-amber-700 mt-1">{stats.pending}</div>
        </div>
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <span className="text-blue-800 font-label-sm uppercase font-bold">Active Repairs</span>
          <div className="font-headline-lg font-bold text-blue-700 mt-1">{stats.inProgress}</div>
        </div>
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
          <span className="text-emerald-800 font-label-sm uppercase font-bold">Completed</span>
          <div className="font-headline-lg font-bold text-emerald-700 mt-1">{stats.completed}</div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Task List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="font-headline-sm text-on-surface font-bold flex items-center justify-between">
            <span>Work Order Queue</span>
            <span className="text-body-sm text-secondary font-normal font-mono">{tasks.length} tasks</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-secondary flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Loading assignments...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-secondary">
              <span className="material-symbols-outlined text-[36px] text-secondary mb-2 block">task_alt</span>
              <p className="font-semibold text-on-surface">No repair tasks in this queue</p>
              <p className="text-body-sm mt-1">You are all caught up on your assigned work orders!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedTask?._id === task._id
                      ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary/30'
                      : 'bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-primary text-body-sm">{task.complaintId}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      task.status === 'RESOLVED' || task.status === 'CLOSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : task.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h4 className="font-semibold text-on-surface text-body-md line-clamp-1">
                    {task.title || `${task.issueCategory} at ${task.labName}`}
                  </h4>

                  <div className="flex items-center gap-3 text-secondary text-[12px] mt-2">
                    <span className="flex items-center gap-1 font-mono font-medium">
                      <span className="material-symbols-outlined text-[15px]">desktop_windows</span>
                      {task.systemNumber}
                    </span>
                    <span>&bull;</span>
                    <span className="line-clamp-1">{task.labName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Details & Action Panel (7 Cols) */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-space-md space-y-space-md shadow-xs sticky top-20">
              <div className="flex items-start justify-between border-b border-outline-variant/30 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-primary text-headline-sm">{selectedTask.complaintId}</span>
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-primary/10 text-primary uppercase">
                      {selectedTask.priority} Priority
                    </span>
                  </div>
                  <h3 className="font-headline-md font-bold text-on-surface">{selectedTask.title}</h3>
                </div>

                {/* Status indicator */}
                <span className={`px-3 py-1 rounded-full text-label-md font-bold ${
                  selectedTask.status === 'RESOLVED' || selectedTask.status === 'CLOSED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedTask.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedTask.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Facility & Equipment Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/40 text-body-sm">
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Location</span>
                  <p className="font-bold text-on-surface mt-0.5">{selectedTask.labName}</p>
                  <p className="text-secondary text-[12px]">{selectedTask.labId?.location}</p>
                </div>
                <div>
                  <span className="text-secondary font-label-sm uppercase font-bold block">Rig / Bench ID</span>
                  <p className="font-mono font-bold text-primary mt-0.5 text-body-md">{selectedTask.systemNumber}</p>
                  <p className="text-secondary text-[12px]">Dept: {selectedTask.department}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-secondary font-label-sm uppercase font-bold block mb-1">Reported Defect</span>
                <p className="text-on-surface text-body-md leading-relaxed whitespace-pre-line bg-surface-container-low p-3 rounded-lg border border-outline-variant/30">
                  {selectedTask.description}
                </p>
              </div>

              {/* Evidence Photographs */}
              <div className="flex flex-wrap gap-4">
                {selectedTask.imageUrl && (
                  <div>
                    <span className="text-secondary font-label-sm uppercase font-bold block mb-1">Reported Fault Evidence</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceModal({ isOpen: true, imageUrl: selectedTask.imageUrl, title: 'Equipment Fault Photographic Evidence' })}
                      className="p-2 bg-surface-container-low border border-outline-variant rounded-lg flex items-center gap-2 text-primary font-semibold text-body-sm hover:bg-surface-container cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px]">image</span>
                      <span>View Fault Evidence</span>
                    </button>
                  </div>
                )}
                {selectedTask.completionProofImageUrl && (
                  <div>
                    <span className="text-emerald-700 font-label-sm uppercase font-bold block mb-1">Work Completion Proof</span>
                    <button
                      type="button"
                      onClick={() => setEvidenceModal({ isOpen: true, imageUrl: selectedTask.completionProofImageUrl, title: 'Work Completion Photographic Proof' })}
                      className="p-2 bg-emerald-50 border border-emerald-300 rounded-lg flex items-center gap-2 text-emerald-800 font-semibold text-body-sm hover:bg-emerald-100 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] text-emerald-600">verified</span>
                      <span>View Completion Photo</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-outline-variant/30 flex flex-wrap gap-2.5">
                {selectedTask.status === 'ASSIGNED_TO_REPAIR_ASSISTANT' && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleStartRepair(selectedTask)}
                    className="btn-tactile-primary px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">build</span>
                    <span>Start Repair & Diagnostics</span>
                  </button>
                )}

                {selectedTask.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowProgressModal(true)}
                      className="btn-tactile-secondary px-4 py-2.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      <span>Add Progress Note</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResolveModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Mark Repair as Completed</span>
                    </button>
                  </>
                )}

                {(selectedTask.status === 'RESOLVED' || selectedTask.status === 'CLOSED') && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-body-sm flex items-center gap-2 border border-emerald-200 w-full">
                    <span className="material-symbols-outlined text-[20px]">verified</span>
                    <span>Work order resolved. Resolution remarks: {selectedTask.resolutionRemarks || 'Repaired.'}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-surface-container-lowest rounded-xl border border-outline-variant/30 text-secondary">
              Select a work order from the queue to review details and begin repairs.
            </div>
          )}
        </div>
      </div>

      {/* Progress Note Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Log Repair Progress Note</h3>
            <textarea
              rows={4}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="e.g. Disassembled heatsink, replaced thermal paste, running memory diagnostics..."
              className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowProgressModal(false)}
                className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleAddProgress}
                className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Work Order Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[24px]">task_alt</span>
              <h3 className="font-headline-sm font-bold text-on-surface">Complete & Resolve Work Order</h3>
            </div>
            <p className="text-body-sm text-secondary">
              Describe the technical fix applied. The HOD, Lab In-Charge, and student will be notified immediately.
            </p>
            <textarea
              rows={4}
              value={resolutionRemarks}
              onChange={(e) => setResolutionRemarks(e.target.value)}
              placeholder="e.g. Replaced faulty RAM module (Kingston 8GB DDR4), booted into Ubuntu Linux successfully, stress tested for 30 minutes without error."
              className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />

            {/* Optional proof image upload */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-secondary block">Work Completion Proof (Optional)</label>
              {proofImageUrl ? (
                <div className="relative">
                  <img src={proofImageUrl} alt="Proof preview" className="w-full h-32 object-cover rounded-lg border border-emerald-300" />
                  <button
                    type="button"
                    onClick={() => setProofImageUrl('')}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-[12px] hover:bg-red-600 cursor-pointer"
                  >×</button>
                  <div className="mt-1.5 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Proof image attached
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer?.files?.[0]) {
                      handleUploadProofImage(e.dataTransfer.files[0]);
                    }
                  }}
                  className="flex items-center gap-2 p-3 bg-surface-container-low border border-dashed border-outline-variant rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors"
                >
                  {proofUploading ? (
                    <><div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" /><span className="text-body-sm text-secondary">Uploading...</span></>
                  ) : (
                    <><span className="material-symbols-outlined text-[20px] text-secondary">add_photo_alternate</span><span className="text-body-sm text-secondary">Click to attach repair proof photo</span></>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUploadProofImage(e.target.files[0]);
                      }
                      e.target.value = '';
                    }}
                    disabled={proofUploading}
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowResolveModal(false); setProofImageUrl(''); }}
                className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || proofUploading}
                onClick={handleCompleteRepair}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Confirm Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evidence Modal */}
      {evidenceModal.isOpen && selectedTask && (
        <EvidenceModal
          imageUrl={evidenceModal.imageUrl}
          title={evidenceModal.title}
          complaintId={selectedTask.complaintId}
          labName={selectedTask.labName}
          onClose={() => setEvidenceModal({ isOpen: false, imageUrl: '', title: '' })}
        />
      )}
    </div>
  );
}
