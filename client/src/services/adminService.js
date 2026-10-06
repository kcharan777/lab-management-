import api from '../api/axios';

export const adminService = {
  // Get all campus complaints partitioned for Kanban matrix & telemetry
  getComplaints: async (params = {}) => {
    return await api.get('/main-admin/complaints', { params });
  },

  // Accept work order and assign technician
  acceptComplaint: async (id, data) => {
    return await api.patch(`/main-admin/complaints/${id}/accept`, data);
  },

  // Record repair progress note
  updateProgress: async (id, note) => {
    return await api.patch(`/main-admin/complaints/${id}/progress`, { note });
  },

  // Mark complaint as resolved
  resolveComplaint: async (id, data) => {
    return await api.patch(`/main-admin/complaints/${id}/resolve`, data);
  },
};
