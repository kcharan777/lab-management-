import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { adminService } from '../services/adminService';
import EvidenceModal from '../components/complaints/EvidenceModal';

export default function AdminConsole() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('work-orders'); // 'work-orders' | 'labs' | 'departments' | 'staff' | 'students'
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // --- Work Orders State ---
  const [kanban, setKanban] = useState({ intake: [], assigned: [], inProgress: [], resolved: [] });
  const [telemetry, setTelemetry] = useState({ totalWorkOrders: 0, openCount: 0, resolvedCount: 0, rejectedCount: 0, avgTurnaroundHours: 3.8, equipmentSlaHealth: '98.7%' });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [labFilter, setLabFilter] = useState('ALL');

  // Modals for Work Orders
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('Work order authorized by Admin and dispatched to Repair Assistant.');
  const [progressNote, setProgressNote] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');

  // --- Dynamic Labs State ---
  const [labs, setLabs] = useState([]);
  const [showLabModal, setShowLabModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  const [labFormData, setLabFormData] = useState({
    name: '',
    code: '',
    department: 'Computer Science & Engineering',
    location: '',
    description: '',
    status: 'OPERATIONAL',
    capacity: 30,
    systemsCount: 30,
  });

  // --- Departments State ---
  const [departments, setDepartments] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    description: '',
    specializations: '',
  });

  // --- Staff & Faculty Management State ---
  const [staffUsers, setStaffUsers] = useState([]);
  const [repairAssistants, setRepairAssistants] = useState([]);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffFormData, setStaffFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'HOD', // 'HOD' | 'LAB_INCHARGE' | 'REPAIR_ASSISTANT'
    department: 'Computer Science & Engineering',
    phone: '',
    specialization: '',
  });

  // --- Student Registry State ---
  const [registryStudents, setRegistryStudents] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [studentFormData, setStudentFormData] = useState({
    rollNumber: '',
    name: '',
    department: 'Computer Science & Engineering',
    batch: '2024-2028',
  });
  const [bulkCsvText, setBulkCsvText] = useState('');

  // Fetch all initial data
  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (priorityFilter !== 'ALL') params.priority = priorityFilter;
      if (labFilter !== 'ALL') params.lab = labFilter;

      const res = await adminService.getComplaints(params);
      if (res.success && res.data) {
        setKanban(res.data.kanban || { intake: [], assigned: [], inProgress: [], resolved: [] });
        setTelemetry(res.data.telemetry || telemetry);

        const allList = res.data.complaints || [];
        if (selectedComplaint) {
          const updated = allList.find((c) => c._id === selectedComplaint._id || c.complaintId === selectedComplaint.complaintId);
          setSelectedComplaint(updated || (allList.length > 0 ? allList[0] : null));
        } else if (allList.length > 0) {
          setSelectedComplaint(allList[0]);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to load maintenance matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLabs = async () => {
    try {
      const res = await adminService.getLabs();
      if (res.success) setLabs(res.data || []);
    } catch (err) {
      console.warn('Failed to load labs:', err.message);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await adminService.getDepartments();
      if (res.success) setDepartments(res.data || []);
    } catch (err) {
      console.warn('Failed to load departments:', err.message);
    }
  };

  const fetchStaffAndAssistants = async () => {
    try {
      const [uRes, aRes] = await Promise.all([
        adminService.getUsers(),
        adminService.getRepairAssistants(),
      ]);
      if (uRes.success) setStaffUsers(uRes.data || []);
      if (aRes.success) {
        setRepairAssistants(aRes.data || []);
        if (aRes.data?.length > 0 && !selectedAssistantId) {
          setSelectedAssistantId(aRes.data[0]._id);
        }
      }
    } catch (err) {
      console.warn('Failed to load staff/assistants:', err.message);
    }
  };

  const fetchRegistry = async () => {
    try {
      const res = await adminService.getRegistryStudents();
      if (res.success) setRegistryStudents(res.data || []);
    } catch (err) {
      console.warn('Failed to load student registry:', err.message);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchLabs();
    fetchDepartments();
    fetchStaffAndAssistants();
    fetchRegistry();
  }, [priorityFilter, labFilter]);

  // --- Work Order Actions ---
  const handleAssignWorkOrder = async () => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      const res = await adminService.assignComplaint(selectedComplaint.complaintId, {
        assistantId: selectedAssistantId,
        remarks: assignRemarks,
      });
      if (res.success) {
        addToast(`Work order ${selectedComplaint.complaintId} dispatched to repair assistant!`, 'success');
        setShowAssignModal(false);
        fetchWorkOrders();
        fetchStaffAndAssistants();
      }
    } catch (err) {
      addToast(err.message || 'Failed to dispatch work order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedComplaint || !progressNote.trim()) return;
    try {
      setActionLoading(true);
      const res = await adminService.updateProgress(selectedComplaint.complaintId, progressNote);
      if (res.success) {
        addToast('Progress note logged to work order timeline', 'success');
        setShowProgressModal(false);
        setProgressNote('');
        fetchWorkOrders();
      }
    } catch (err) {
      addToast(err.message || 'Failed to add progress note', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveWorkOrder = async () => {
    if (!selectedComplaint || !resolutionRemarks.trim()) return;
    try {
      setActionLoading(true);
      const res = await adminService.resolveComplaint(selectedComplaint.complaintId, {
        resolutionRemarks,
        closeImmediately: true,
      });
      if (res.success) {
        addToast(`Work order ${selectedComplaint.complaintId} resolved and closed. HOD & Lab In-Charge notified.`, 'success');
        setShowResolveModal(false);
        setResolutionRemarks('');
        fetchWorkOrders();
      }
    } catch (err) {
      addToast(err.message || 'Failed to resolve work order', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Dynamic Lab CRUD Handlers ---
  const handleSaveLab = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (editingLab) {
        await adminService.updateLab(editingLab._id, labFormData);
        addToast(`Laboratory '${labFormData.name}' updated successfully!`, 'success');
      } else {
        await adminService.createLab(labFormData);
        addToast(`Laboratory '${labFormData.name}' created successfully!`, 'success');
      }
      setShowLabModal(false);
      setEditingLab(null);
      fetchLabs();
    } catch (err) {
      addToast(err.message || 'Failed to save laboratory', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteLab = async (labId, labName) => {
    if (!window.confirm(`Decommission laboratory '${labName}'?`)) return;
    try {
      await adminService.deleteLab(labId);
      addToast(`Laboratory '${labName}' decommissioned.`, 'info');
      fetchLabs();
    } catch (err) {
      addToast(err.message || 'Failed to delete laboratory', 'error');
    }
  };

  // --- Department CRUD Handlers ---
  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const specs = deptFormData.specializations.split(',').map((s) => s.trim()).filter(Boolean);
      await adminService.createDepartment({
        ...deptFormData,
        specializations: specs,
      });
      addToast(`Department '${deptFormData.name}' created successfully!`, 'success');
      setShowDeptModal(false);
      setDeptFormData({ name: '', code: '', description: '', specializations: '' });
      fetchDepartments();
    } catch (err) {
      addToast(err.message || 'Failed to create department', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Staff Provisioning Handler ---
  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await adminService.createUser(staffFormData);
      addToast(`${staffFormData.role} account created successfully!`, 'success');
      setShowStaffModal(false);
      setStaffFormData({
        name: '',
        email: '',
        password: '',
        role: 'HOD',
        department: departments[0]?.name || 'Computer Science & Engineering',
        phone: '',
        specialization: '',
      });
      fetchStaffAndAssistants();
    } catch (err) {
      addToast(err.message || 'Staff provisioning failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStaff = async (userId) => {
    try {
      const res = await adminService.toggleUserStatus(userId);
      if (res.success) {
        addToast(`User status updated: ${res.data.isActive ? 'Active' : 'Deactivated'}`, 'info');
        fetchStaffAndAssistants();
      }
    } catch (err) {
      addToast(err.message || 'Failed to update user status', 'error');
    }
  };

  // --- Student Registry Handlers ---
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await adminService.addStudentToRegistry(studentFormData);
      addToast(`Student roll '${studentFormData.rollNumber}' authorized in registry!`, 'success');
      setShowStudentModal(false);
      setStudentFormData({ rollNumber: '', name: '', department: 'Computer Science & Engineering', batch: '2024-2028' });
      fetchRegistry();
    } catch (err) {
      addToast(err.message || 'Failed to authorize student', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      // Parse CSV: rollNumber, name, department, batch
      const lines = bulkCsvText.split('\n').map((l) => l.trim()).filter(Boolean);
      const students = lines.map((line) => {
        const parts = line.split(',').map((p) => p.trim());
        return {
          rollNumber: parts[0] || '',
          name: parts[1] || 'Student',
          department: parts[2] || 'Computer Science & Engineering',
          batch: parts[3] || '2024-2028',
        };
      });

      const res = await adminService.bulkAddStudentsToRegistry(students);
      if (res.success) {
        addToast(`Bulk upload complete! ${res.data?.insertedCount || 0} students authorized.`, 'success');
        setShowBulkModal(false);
        setBulkCsvText('');
        fetchRegistry();
      }
    } catch (err) {
      addToast(err.message || 'Bulk upload failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-space-md lg:px-margin py-space-md space-y-space-lg">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm border-b border-outline-variant/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-label-md font-label-md text-secondary">
            <span>Central Administration</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Step 4: Operations Console</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Campus Operations Management Console
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Centralized orchestration: Step 4 work orders, dynamic laboratories, faculty governance & student verification
          </p>
        </div>

        {/* Console Navigation Tabs */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/40 overflow-x-auto max-w-full">
          {[
            { id: 'work-orders', label: 'Work Orders', icon: 'engineering' },
            { id: 'labs', label: 'Dynamic Labs', icon: 'domain' },
            { id: 'departments', label: 'Departments', icon: 'account_tree' },
            { id: 'staff', label: 'Faculty & Assistants', icon: 'badge' },
            { id: 'students', label: 'Student Registry', icon: 'verified_user' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: WORK ORDERS & KANBAN TRIAGE */}
      {/* ======================================================== */}
      {activeTab === 'work-orders' && (
        <div className="space-y-space-md animate-in fade-in duration-200">
          {/* Telemetry KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm">
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-secondary font-label-sm uppercase font-bold">Total Work Orders</span>
              <div className="font-headline-lg font-bold text-on-surface mt-1">{telemetry.totalWorkOrders}</div>
            </div>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-amber-800 font-label-sm uppercase font-bold">HOD Approved Intake</span>
              <div className="font-headline-lg font-bold text-amber-700 mt-1">{kanban.intake.length}</div>
            </div>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-blue-800 font-label-sm uppercase font-bold">Assigned / In Progress</span>
              <div className="font-headline-lg font-bold text-blue-700 mt-1">{kanban.assigned.length + kanban.inProgress.length}</div>
            </div>
            <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-emerald-800 font-label-sm uppercase font-bold">Resolved & Closed</span>
              <div className="font-headline-lg font-bold text-emerald-700 mt-1">{kanban.resolved.length}</div>
            </div>
          </div>

          {/* Kanban Board Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: Intake (HOD Approved) */}
            <div className="bg-surface-container-low/60 rounded-xl p-3 border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                <span className="font-bold text-on-surface text-body-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Intake (HOD Approved)
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800">{kanban.intake.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                {kanban.intake.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-3 bg-surface-container-lowest rounded-lg border transition-all cursor-pointer ${
                      selectedComplaint?._id === c._id ? 'border-primary ring-1 ring-primary/40 shadow-sm' : 'border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-primary font-bold mb-1">
                      <span>{c.complaintId}</span>
                      <span className="text-amber-800 uppercase">{c.priority}</span>
                    </div>
                    <h5 className="font-semibold text-on-surface text-body-sm line-clamp-1">{c.title}</h5>
                    <p className="text-[12px] text-secondary mt-1">{c.labName} &bull; {c.systemNumber}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Assigned to Technician */}
            <div className="bg-surface-container-low/60 rounded-xl p-3 border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                <span className="font-bold text-on-surface text-body-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  Assigned to Assistant
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800">{kanban.assigned.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                {kanban.assigned.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-3 bg-surface-container-lowest rounded-lg border transition-all cursor-pointer ${
                      selectedComplaint?._id === c._id ? 'border-primary ring-1 ring-primary/40 shadow-sm' : 'border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-primary font-bold mb-1">
                      <span>{c.complaintId}</span>
                      <span className="text-blue-800">{c.adminAction?.assignedAssistantName || 'Assigned'}</span>
                    </div>
                    <h5 className="font-semibold text-on-surface text-body-sm line-clamp-1">{c.title}</h5>
                    <p className="text-[12px] text-secondary mt-1">{c.labName} &bull; {c.systemNumber}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: In Progress */}
            <div className="bg-surface-container-low/60 rounded-xl p-3 border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                <span className="font-bold text-on-surface text-body-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  Repair In Progress
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800">{kanban.inProgress.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                {kanban.inProgress.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-3 bg-surface-container-lowest rounded-lg border transition-all cursor-pointer ${
                      selectedComplaint?._id === c._id ? 'border-primary ring-1 ring-primary/40 shadow-sm' : 'border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-primary font-bold mb-1">
                      <span>{c.complaintId}</span>
                      <span className="text-purple-800">{c.adminAction?.assignedAssistantName || 'Field Tech'}</span>
                    </div>
                    <h5 className="font-semibold text-on-surface text-body-sm line-clamp-1">{c.title}</h5>
                    <p className="text-[12px] text-secondary mt-1">{c.labName} &bull; {c.systemNumber}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Resolved / Closed */}
            <div className="bg-surface-container-low/60 rounded-xl p-3 border border-outline-variant/40 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/40">
                <span className="font-bold text-on-surface text-body-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Resolved / Closed
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">{kanban.resolved.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto">
                {kanban.resolved.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => setSelectedComplaint(c)}
                    className={`p-3 bg-surface-container-lowest rounded-lg border transition-all cursor-pointer ${
                      selectedComplaint?._id === c._id ? 'border-primary ring-1 ring-primary/40 shadow-sm' : 'border-outline-variant/30 hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-primary font-bold mb-1">
                      <span>{c.complaintId}</span>
                      <span className="text-emerald-800">Closed</span>
                    </div>
                    <h5 className="font-semibold text-on-surface text-body-sm line-clamp-1">{c.title}</h5>
                    <p className="text-[12px] text-secondary mt-1">{c.labName} &bull; {c.systemNumber}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Work Order Action Bar */}
          {selectedComplaint && (
            <div className="p-space-md bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
                <div>
                  <span className="font-mono font-bold text-primary text-headline-sm">{selectedComplaint.complaintId}</span>
                  <h3 className="font-headline-md font-bold text-on-surface mt-0.5">{selectedComplaint.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded text-body-sm font-bold bg-primary/10 text-primary">
                    Status: {selectedComplaint.status.replace(/_/g, ' ')}
                  </span>
                  {selectedComplaint.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setShowEvidence(true)}
                      className="btn-tactile-secondary p-2 rounded-lg flex items-center gap-1 text-body-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">image</span>
                      <span>Evidence</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Multi-Level Approval Sign-offs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                  <span className="font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">verified_user</span>
                    Lab In-Charge Verification:
                  </span>
                  <p className="text-[12px] mt-1">{selectedComplaint.labInchargeVerification?.remarks || 'Verified.'}</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900">
                  <span className="font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">gavel</span>
                    HOD Department Sign-off:
                  </span>
                  <p className="text-[12px] mt-1">{selectedComplaint.hodVerification?.remarks || 'Approved.'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {['HOD_APPROVED', 'ASSIGNED_TO_MAIN_ADMIN'].includes(selectedComplaint.status) && (
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="btn-tactile-primary px-6 py-2.5 rounded-lg font-bold flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    <span>Assign Repair Assistant</span>
                  </button>
                )}

                {['ASSIGNED_TO_REPAIR_ASSISTANT', 'IN_PROGRESS', 'ON_HOLD'].includes(selectedComplaint.status) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowProgressModal(true)}
                      className="btn-tactile-secondary px-4 py-2.5 rounded-lg font-semibold flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[18px]">note_add</span>
                      <span>Add Progress Note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResolveModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">task_alt</span>
                      <span>Mark Work Order Resolved</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DYNAMIC LABORATORIES MANAGEMENT (REQUIREMENT 5) */}
      {/* ======================================================== */}
      {activeTab === 'labs' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md font-bold text-on-surface">Campus Dynamic Laboratories</h2>
              <p className="text-body-sm text-secondary">
                Configure facilities, locations, and capacity dynamically without hardcoded values
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingLab(null);
                setLabFormData({
                  name: '',
                  code: '',
                  department: departments[0]?.name || 'Computer Science & Engineering',
                  location: '',
                  description: '',
                  status: 'OPERATIONAL',
                  capacity: 30,
                  systemsCount: 30,
                });
                setShowLabModal(true);
              }}
              className="btn-tactile-primary px-4 py-2.5 rounded-lg font-bold flex items-center gap-1.5 text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Create New Laboratory</span>
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-xs">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low text-secondary font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/40">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Laboratory Name</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Physical Location</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Capacity / Rig Count</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {labs.map((lab) => (
                  <tr key={lab._id} className="hover:bg-surface-container-low/50">
                    <td className="p-3.5 font-mono font-bold text-primary">{lab.code}</td>
                    <td className="p-3.5 font-semibold text-on-surface">{lab.name}</td>
                    <td className="p-3.5 text-secondary">{lab.department}</td>
                    <td className="p-3.5 text-on-surface">{lab.location}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        lab.status === 'OPERATIONAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {lab.status}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-secondary">{lab.systemsCount || 30} systems</td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLab(lab);
                          setLabFormData({
                            name: lab.name,
                            code: lab.code,
                            department: lab.department,
                            location: lab.location,
                            description: lab.description || '',
                            status: lab.status || 'OPERATIONAL',
                            capacity: lab.capacity || 30,
                            systemsCount: lab.systemsCount || 30,
                          });
                          setShowLabModal(true);
                        }}
                        className="text-primary hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLab(lab._id, lab.name)}
                        className="text-error hover:underline font-semibold"
                      >
                        Decommission
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: DEPARTMENTS & SPECIALIZATIONS (REQUIREMENT 11) */}
      {/* ======================================================== */}
      {activeTab === 'departments' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-md font-bold text-on-surface">Campus Departments & Engineering Streams</h2>
              <p className="text-body-sm text-secondary">
                Scalable academic taxonomy: Departments, modern specializations (AI&ML, Data Science, Cyber Security)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeptModal(true)}
              className="btn-tactile-primary px-4 py-2.5 rounded-lg font-bold flex items-center gap-1.5 text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept) => (
              <div key={dept._id || dept.code} className="p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10 text-body-sm">{dept.code}</span>
                  <span className="text-[11px] text-secondary font-mono">B.Tech Regular & Lateral</span>
                </div>
                <h4 className="font-bold text-on-surface text-body-lg">{dept.name}</h4>
                <p className="text-[12px] text-secondary line-clamp-2">{dept.description || 'Engineering & Technical Division'}</p>

                <div className="pt-2 border-t border-outline-variant/30">
                  <span className="text-secondary font-label-sm uppercase font-bold text-[11px] block mb-1.5">Specializations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(dept.specializations || ['General']).map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-[11px] bg-surface-container-low text-on-surface border border-outline-variant/40">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: FACULTY & REPAIR ASSISTANTS (REQUIREMENT 1 & 6) */}
      {/* ======================================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-md font-bold text-on-surface">Faculty, HOD & Repair Assistant Governance</h2>
              <p className="text-body-sm text-secondary">
                Enforces Single Admin and Single HOD per department rules. Provision dynamic Repair Assistants.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowStaffModal(true)}
              className="btn-tactile-primary px-4 py-2.5 rounded-lg font-bold flex items-center gap-1.5 text-body-sm"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Provision Faculty / Assistant</span>
            </button>
          </div>

          {/* Single Admin Protection Banner */}
          <div className="p-3 bg-purple-50 border border-purple-200 text-purple-950 rounded-lg text-body-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-purple-700">shield</span>
            <span>
              <strong>Defense in Depth:</strong> Exactly <strong>ONE Admin</strong> permitted system-wide. Each department is restricted to exactly <strong>ONE HOD</strong> account at the database constraint level.
            </span>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-xs">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low text-secondary font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/40">
                <tr>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">System Role</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Specialization / Phone</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {staffUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-container-low/50">
                    <td className="p-3.5 font-bold text-on-surface">{u.name}</td>
                    <td className="p-3.5 font-mono text-secondary text-[12px]">{u.email}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        u.role === 'MAIN_ADMIN'
                          ? 'bg-purple-100 text-purple-800'
                          : u.role === 'HOD'
                          ? 'bg-blue-100 text-blue-800'
                          : u.role === 'LAB_INCHARGE'
                          ? 'bg-amber-100 text-amber-800'
                          : u.role === 'REPAIR_ASSISTANT'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-secondary">{u.department}</td>
                    <td className="p-3.5 text-secondary text-[12px]">{u.specialization || u.phone || '—'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        u.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.isActive !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {u.role !== 'MAIN_ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStaff(u._id)}
                          className="text-primary hover:underline font-semibold"
                        >
                          {u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: STUDENT VERIFICATION REGISTRY (REQUIREMENT 3) */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-headline-md font-bold text-on-surface">Authorized MLRIT Student Registry</h2>
              <p className="text-body-sm text-secondary">
                Pre-authorized college roll numbers required for legitimate student verification upon registration
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="btn-tactile-secondary px-3.5 py-2.5 rounded-lg font-bold flex items-center gap-1.5 text-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
                <span>Bulk Import</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStudentModal(true)}
                className="btn-tactile-primary px-4 py-2.5 rounded-lg font-bold flex items-center gap-1.5 text-body-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>Authorize Roll Number</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 overflow-hidden shadow-xs">
            <table className="w-full text-left text-body-sm">
              <thead className="bg-surface-container-low text-secondary font-label-md uppercase tracking-wider text-[11px] border-b border-outline-variant/40">
                <tr>
                  <th className="p-3.5">Roll Number</th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Academic Batch</th>
                  <th className="p-3.5">Account Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {registryStudents.map((st) => (
                  <tr key={st._id} className="hover:bg-surface-container-low/50">
                    <td className="p-3.5 font-mono font-bold text-primary">{st.rollNumber}</td>
                    <td className="p-3.5 font-semibold text-on-surface">{st.name}</td>
                    <td className="p-3.5 text-secondary">{st.department}</td>
                    <td className="p-3.5 font-mono text-secondary text-[12px]">{st.batch}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        st.isRegistered ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {st.isRegistered ? 'Registered' : 'Pending Enrollment'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Assign Work Order Modal (With Dynamic Assistants) */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Assign Repair Assistant</h3>
            <p className="text-body-sm text-secondary">
              Select an authorized technical assistant from the dynamic campus maintenance roster:
            </p>

            <div>
              <label className="block font-label-md text-secondary uppercase font-bold text-[11px] mb-1">
                Field Repair Assistant
              </label>
              {repairAssistants.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-body-sm">
                  No repair assistants currently provisioned. You can create one in the Faculty & Assistants tab.
                </div>
              ) : (
                <select
                  value={selectedAssistantId}
                  onChange={(e) => setSelectedAssistantId(e.target.value)}
                  className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant font-medium"
                >
                  {repairAssistants.map((ast) => (
                    <option key={ast._id} value={ast._id}>
                      {ast.name} — {ast.specialization || ast.department} ({ast.activeTasks || 0} active tasks)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block font-label-md text-secondary uppercase font-bold text-[11px] mb-1">
                Admin Dispatch Remarks
              </label>
              <textarea
                rows={3}
                value={assignRemarks}
                onChange={(e) => setAssignRemarks(e.target.value)}
                className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || repairAssistants.length === 0}
                onClick={handleAssignWorkOrder}
                className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
              >
                Dispatch Work Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Create/Edit Lab Modal */}
      {showLabModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">
              {editingLab ? 'Edit Laboratory Facility' : 'Provision Dynamic Laboratory'}
            </h3>

            <form onSubmit={handleSaveLab} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Lab Facility Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Advanced AI & Deep Learning Lab"
                  value={labFormData.name}
                  onChange={(e) => setLabFormData({ ...labFormData, name: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Facility Code</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. LAB-CSM-402"
                    value={labFormData.code}
                    onChange={(e) => setLabFormData({ ...labFormData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Department</label>
                  <select
                    value={labFormData.department}
                    onChange={(e) => setLabFormData({ ...labFormData, department: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                  >
                    {departments.map((d) => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Location Details</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Tech Tower Block B, 4th Floor, Room 402"
                  value={labFormData.location}
                  onChange={(e) => setLabFormData({ ...labFormData, location: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Status</label>
                  <select
                    value={labFormData.status}
                    onChange={(e) => setLabFormData({ ...labFormData, status: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-2 rounded-lg border border-outline-variant text-body-sm"
                  >
                    <option value="OPERATIONAL">OPERATIONAL</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Capacity</label>
                  <input
                    type="number"
                    value={labFormData.capacity}
                    onChange={(e) => setLabFormData({ ...labFormData, capacity: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-2 rounded-lg border border-outline-variant text-body-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Systems Count</label>
                  <input
                    type="number"
                    value={labFormData.systemsCount}
                    onChange={(e) => setLabFormData({ ...labFormData, systemsCount: e.target.value })}
                    className="w-full bg-surface-container-low text-on-surface p-2 rounded-lg border border-outline-variant text-body-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
                >
                  {editingLab ? 'Save Changes' : 'Create Lab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Department Modal */}
      {showDeptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Add Department & Specializations</h3>

            <form onSubmit={handleSaveDept} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Department Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Artificial Intelligence & Machine Learning"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Department Code</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. CSM"
                  value={deptFormData.code}
                  onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Specializations (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Deep Learning, Computer Vision, NLP"
                  value={deptFormData.specializations}
                  onChange={(e) => setDeptFormData({ ...deptFormData, specializations: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDeptModal(false)}
                  className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Staff Provisioning Modal (HOD, Lab Incharge, Repair Assistant) */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Provision Faculty / Staff Account</h3>

            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Role Designation</label>
                <select
                  value={staffFormData.role}
                  onChange={(e) => setStaffFormData({ ...staffFormData, role: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm font-bold"
                >
                  <option value="HOD">HOD (Head of Department — 1 per department)</option>
                  <option value="LAB_INCHARGE">LAB INCHARGE (Faculty Lab Custodian)</option>
                  <option value="REPAIR_ASSISTANT">REPAIR ASSISTANT (Technical Specialist)</option>
                </select>
                <p className="mt-1 text-[11px] text-secondary">
                  Notice: Admins cannot create second Admin accounts. HOD is restricted to 1 per department.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Full Legal Name</label>
                <input
                  required
                  type="text"
                  placeholder="Prof. / Dr. / Specialist Name"
                  value={staffFormData.name}
                  onChange={(e) => setStaffFormData({ ...staffFormData, name: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Institutional Email</label>
                <input
                  required
                  type="email"
                  placeholder="staff@mlrit.ac.in"
                  value={staffFormData.email}
                  onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Department</label>
                <select
                  value={staffFormData.department}
                  onChange={(e) => setStaffFormData({ ...staffFormData, department: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Specialization / Badge (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Hardware Specialist / Badge #ENG-402"
                  value={staffFormData.specialization}
                  onChange={(e) => setStaffFormData({ ...staffFormData, specialization: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Temporary Password</label>
                <input
                  required
                  minLength={6}
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={staffFormData.password}
                  onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Authorize Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Authorize Student in Registry</h3>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">MLRIT Roll Number</label>
                <input
                  required
                  maxLength={10}
                  type="text"
                  placeholder="e.g. 24R21A66J9"
                  value={studentFormData.rollNumber}
                  onChange={(e) => setStudentFormData({ ...studentFormData, rollNumber: e.target.value.toUpperCase().trim() })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Full Legal Name</label>
                <input
                  required
                  type="text"
                  placeholder="Student Name"
                  value={studentFormData.name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Department</label>
                <select
                  value={studentFormData.department}
                  onChange={(e) => setStudentFormData({ ...studentFormData, department: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                >
                  {departments.map((d) => (
                    <option key={d.code} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-secondary uppercase mb-1">Batch</label>
                <input
                  type="text"
                  placeholder="2024-2028"
                  value={studentFormData.batch}
                  onChange={(e) => setStudentFormData({ ...studentFormData, batch: e.target.value })}
                  className="w-full bg-surface-container-low text-on-surface p-2.5 rounded-lg border border-outline-variant text-body-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
                >
                  Authorize Roll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Bulk Import Students Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-lg w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Bulk Import Authorized Students</h3>
            <p className="text-body-sm text-secondary">
              Paste comma-separated student records (one per line):
              <br />
              <code className="text-[11px] font-mono bg-surface-container-low px-1 rounded">RollNumber, Student Name, Department, Batch</code>
            </p>

            <form onSubmit={handleBulkUpload} className="space-y-3">
              <textarea
                rows={6}
                required
                value={bulkCsvText}
                onChange={(e) => setBulkCsvText(e.target.value)}
                placeholder="24R21A66J9, Srujan Reddy, CSE, 2024-2028&#10;24R21A66J8, Priya Sharma, CSE, 2024-2028&#10;24R21A0501, Arjun Verma, CSM, 2024-2028"
                className="w-full bg-surface-container-low text-on-surface font-mono text-[12px] p-3 rounded-lg border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
                >
                  Authorize All Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Progress Note Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Add Work Order Progress Note</h3>
            <textarea
              rows={4}
              value={progressNote}
              onChange={(e) => setProgressNote(e.target.value)}
              placeholder="e.g. Diagnostic inspection concluded: Motherboard capacitors failed. Procuring spare parts."
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
                onClick={handleUpdateProgress}
                className="btn-tactile-primary px-5 py-2 rounded-lg font-bold"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Resolve Work Order Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-headline-sm font-bold text-on-surface">Resolve & Close Work Order</h3>
            <p className="text-body-sm text-secondary">
              Enter formal technical resolution remarks. HOD and Lab In-Charge will be notified.
            </p>
            <textarea
              rows={4}
              value={resolutionRemarks}
              onChange={(e) => setResolutionRemarks(e.target.value)}
              placeholder="e.g. Power supply unit (PSU 450W) replaced and tested under full load. Equipment certified operational."
              className="w-full bg-surface-container-low text-on-surface font-body-md rounded-lg p-3 border border-outline-variant focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="btn-tactile-secondary px-4 py-2 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleResolveWorkOrder}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-lg"
              >
                Confirm Resolution & Close
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
