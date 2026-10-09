const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
    },
    previousStatus: {
      type: String,
      trim: true,
      default: null,
    },
    newStatus: {
      type: String,
      required: [true, 'New status is required'],
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who performed action is required'],
    },
    userName: {
      type: String,
      trim: true,
      default: 'Authorized User',
    },
    userRole: {
      type: String,
      trim: true,
      default: 'STUDENT',
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },
    assignmentChanges: {
      type: String,
      trim: true,
      default: null,
    },
    resolutionDetails: {
      type: String,
      trim: true,
      default: null,
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

statusHistorySchema.index({ complaintId: 1, createdAt: 1 });

module.exports = {
  StatusHistory: mongoose.model('StatusHistory', statusHistorySchema),
};
