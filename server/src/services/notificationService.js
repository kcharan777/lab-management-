const { Notification } = require('../models/Notification');

/**
 * Creates an in-app notification for a single recipient
 */
async function notifyUser({ recipient, complaintId = null, title, message, type = 'STATUS_UPDATE' }) {
  if (!recipient || !title || !message) return null;
  return await Notification.create({
    recipient,
    complaintId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date(),
  });
}

/**
 * Creates in-app notifications for multiple recipients in batch
 */
async function notifyMultipleUsers(recipients = [], { complaintId = null, title, message, type = 'STATUS_UPDATE' }) {
  if (!recipients.length || !title || !message) return [];
  const notifications = recipients.map((recipient) => ({
    recipient,
    complaintId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date(),
  }));
  return await Notification.insertMany(notifications);
}

module.exports = {
  notifyUser,
  notifyMultipleUsers,
};
