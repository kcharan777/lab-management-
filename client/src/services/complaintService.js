import api from '../api/axios';

export const complaintService = {
  // Create a new complaint
  createComplaint: async (data) => {
    return await api.post('/complaints', data);
  },

  // Get current student's complaints & KPIs
  getMyComplaints: async (params = {}) => {
    return await api.get('/complaints/my', { params });
  },

  // Get single complaint details with audit history
  getComplaintById: async (id) => {
    return await api.get(`/complaints/${id}`);
  },

  // Upload photographic evidence image
  uploadEvidenceImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return await api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
