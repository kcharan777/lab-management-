import api from '../api/axios';

export const hodService = {
  // Get pending complaints awaiting HOD sign-off
  getPendingComplaints: async () => {
    return await api.get('/hod/complaints/pending');
  },

  // Get all departmental complaints with live status and history
  getAllComplaints: async (params = {}) => {
    return await api.get('/hod/complaints/all', { params });
  },

  // Verify complaint and route to Admin
  verifyComplaint: async (id, remarks) => {
    return await api.patch(`/hod/complaints/${id}/verify`, { remarks });
  },

  // Reject complaint with mandatory remarks
  rejectComplaint: async (id, remarks) => {
    return await api.patch(`/hod/complaints/${id}/reject`, { remarks });
  },
};
