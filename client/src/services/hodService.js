import api from '../api/axios';

export const hodService = {
  // Get all pending complaints awaiting HOD sign-off
  getPendingComplaints: async () => {
    return await api.get('/hod/complaints/pending');
  },

  // Verify complaint and route to Lab Incharge
  verifyComplaint: async (id, remarks) => {
    return await api.patch(`/hod/complaints/${id}/verify`, { remarks });
  },

  // Reject complaint with mandatory remarks
  rejectComplaint: async (id, remarks) => {
    return await api.patch(`/hod/complaints/${id}/reject`, { remarks });
  },
};
