import api from '../api/axios';

export const labInchargeService = {
  // Get all new problem requests awaiting Lab Incharge verification
  getPendingComplaints: async () => {
    return await api.get('/lab-incharge/complaints/pending');
  },

  // Get all departmental requests for progress tracking and timeline
  getAllComplaints: async (params = {}) => {
    return await api.get('/lab-incharge/complaints/all', { params });
  },

  // Verify problem and escalate to HOD
  verifyComplaint: async (id, remarks) => {
    return await api.patch(`/lab-incharge/complaints/${id}/verify`, { remarks });
  },

  // Reject complaint with mandatory remarks
  rejectComplaint: async (id, remarks) => {
    return await api.patch(`/lab-incharge/complaints/${id}/reject`, { remarks });
  },
};
