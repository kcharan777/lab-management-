const mongoose = require('mongoose');

const COMPLAINT_STATUSES = [
  'SUBMITTED',
  'HOD_VERIFICATION',
  'LAB_INCHARGE_VERIFICATION',
  'ASSIGNED_TO_MAIN_ADMIN',
  'ACCEPTED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
];

const ISSUE_CATEGORIES = [
  'HARDWARE',
  'SOFTWARE',
  'NETWORK',
  'POWER_ELECTRICAL',
  'PERIPHERAL',
  'OTHER',
];

const PRIORITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: [true, 'Complaint ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID reference is required'],
      index: true,
    },
    labName: {
      type: String,
      required: [true, 'Lab name is required'],
      trim: true,
    },
    systemNumber: {
      type: String,
      required: [true, 'System or equipment number is required'],
      trim: true,
    },
    issueCategory: {
      type: String,
      required: [true, 'Issue category is required'],
      enum: {
        values: ISSUE_CATEGORIES,
        message: '{VALUE} is not a valid issue category',
      },
      default: 'HARDWARE',
    },
    priority: {
      type: String,
      enum: {
        values: PRIORITY_LEVELS,
        message: '{VALUE} is not a valid priority',
      },
      default: 'MEDIUM',
    },
    description: {
      type: String,
      required: [true, 'Issue description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    imageUrl: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: COMPLAINT_STATUSES,
        message: '{VALUE} is not a valid complaint status',
      },
      default: 'SUBMITTED',
      index: true,
    },
    hodVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      action: {
        type: String,
        enum: ['VERIFIED', 'REJECTED'],
      },
      remarks: {
        type: String,
        trim: true,
      },
    },
    labInchargeVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      action: {
        type: String,
        enum: ['VERIFIED', 'REJECTED'],
      },
      remarks: {
        type: String,
        trim: true,
      },
    },
    mainAdminAction: {
      acceptedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      acceptedAt: Date,
      technicianAssigned: {
        type: String,
        trim: true,
      },
      progressNotes: [
        {
          note: {
            type: String,
            required: true,
            trim: true,
          },
          updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
          },
          updatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    resolutionRemarks: {
      type: String,
      trim: true,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful compound indexes
complaintSchema.index({ studentId: 1, status: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = {
  Complaint: mongoose.model('Complaint', complaintSchema),
  COMPLAINT_STATUSES,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
};
