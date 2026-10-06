const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Complaint reference is required'],
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who updated the status is required'],
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
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
