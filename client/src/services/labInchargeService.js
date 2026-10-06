import api from '../api/axios';

export const labInchargeService = {
  // Get all HOD-verified complaints awaiting Lab Incharge review
  getPendingComplaints: async () => {
    return await api.get('/lab-incharge/complaints/pending');
  },

  // Verify equipment diagnostics and escalate to Main Admin
  verifyComplaint: async (id, remarks) => {
    return await api.patch(`/lab-incharge/complaints/${id}/verify`, { remarks });
  },

  // Reject complaint with mandatory remarks
  rejectComplaint: async (id, remarks) => {
    return await api.patch(`/lab-incharge/complaints/${id}/reject`, { remarks });
  },
};
