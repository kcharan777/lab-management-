import api from '../api/axios';

export const repairAssistantService = {
  // Get all repair tasks assigned to current technician
  getMyTasks: async (params = {}) => {
    return await api.get('/repair-assistant/tasks', { params });
  },

  // Start work on an assigned repair task
  startRepair: async (id, remarks) => {
    return await api.patch(`/repair-assistant/tasks/${id}/start`, { remarks });
  },

  // Add progress note to the task
  addProgressNote: async (id, note) => {
    return await api.patch(`/main-admin/complaints/${id}/progress`, { note });
  },

  // Complete and resolve the repair task
  completeRepair: async (id, resolutionRemarks) => {
    return await api.patch(`/repair-assistant/tasks/${id}/complete`, { resolutionRemarks });
  },
};
