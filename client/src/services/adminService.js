import api from '../api/axios';

export const adminService = {
  // --- Repair Requests & Kanban Matrix ---
  getComplaints: async (params = {}) => {
    return await api.get('/main-admin/complaints', { params });
  },

  assignComplaint: async (id, data) => {
    return await api.patch(`/main-admin/complaints/${id}/assign`, data);
  },

  acceptComplaint: async (id, data) => {
    return await api.patch(`/main-admin/complaints/${id}/assign`, data);
  },

  updateComplaintStatus: async (id, status, note) => {
    return await api.patch(`/main-admin/complaints/${id}/status`, { status, note });
  },

  updateProgress: async (id, note) => {
    return await api.patch(`/main-admin/complaints/${id}/progress`, { note });
  },

  resolveComplaint: async (id, data) => {
    return await api.patch(`/main-admin/complaints/${id}/resolve`, data);
  },

  // --- Dynamic Laboratories ---
  getLabs: async (params = {}) => {
    return await api.get('/labs', { params });
  },

  createLab: async (data) => {
    return await api.post('/labs', data);
  },

  updateLab: async (id, data) => {
    return await api.put(`/labs/${id}`, data);
  },

  deleteLab: async (id) => {
    return await api.delete(`/labs/${id}`);
  },

  // --- Departments & Specializations ---
  getDepartments: async () => {
    return await api.get('/departments');
  },

  createDepartment: async (data) => {
    return await api.post('/departments', data);
  },

  updateDepartment: async (id, data) => {
    return await api.put(`/departments/${id}`, data);
  },

  deleteDepartment: async (id) => {
    return await api.delete(`/departments/${id}`);
  },

  // --- User & Faculty Management (HOD, Lab Incharge, Repair Assistant) ---
  getUsers: async (params = {}) => {
    return await api.get('/users', { params });
  },

  createUser: async (data) => {
    return await api.post('/users', data);
  },

  updateUser: async (id, data) => {
    return await api.put(`/users/${id}`, data);
  },

  toggleUserStatus: async (id) => {
    return await api.patch(`/users/${id}/toggle-status`);
  },

  getRepairAssistants: async () => {
    return await api.get('/users/repair-assistants');
  },

  // --- Authorized Student Registry ---
  getRegistryStudents: async (params = {}) => {
    return await api.get('/student-registry', { params });
  },

  addStudentToRegistry: async (data) => {
    return await api.post('/student-registry', data);
  },

  bulkAddStudentsToRegistry: async (students) => {
    return await api.post('/student-registry/bulk', { students });
  },

  removeStudentFromRegistry: async (id) => {
    return await api.delete(`/student-registry/${id}`);
  },
};
