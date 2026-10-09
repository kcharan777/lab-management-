const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      default: null,
      index: true,
    },
    complaintCustomId: {
      type: String,
      trim: true,
      default: null,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: [
        'SUBMITTED_TO_LAB_INCHARGE',
        'LAB_INCHARGE_APPROVED',
        'HOD_APPROVED',
        'ASSIGNED_TO_REPAIR_ASSISTANT',
        'IN_PROGRESS',
        'RESOLVED',
        'CLOSED',
        'REJECTED',
        'STATUS_UPDATE',
        'VERIFICATION_REQUIRED',
        'ASSIGNMENT',
        'RESOLUTION',
        'REJECTION',
      ],
      default: 'STATUS_UPDATE',
    },
    link: {
      type: String,
      trim: true,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
};
