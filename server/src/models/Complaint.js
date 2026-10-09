const mongoose = require('mongoose');

const COMPLAINT_STATUSES = [
  'SUBMITTED_TO_LAB_INCHARGE',
  'LAB_INCHARGE_APPROVED',
  'HOD_APPROVED',
  'ADMIN_REVIEW',
  'ASSIGNED_TO_REPAIR_ASSISTANT',
  'IN_PROGRESS',
  'ON_HOLD',
  'RESOLVED',
  'CLOSED',
  'REJECTED',
  // Legacy status support
  'SUBMITTED',
  'HOD_VERIFICATION',
  'LAB_INCHARGE_VERIFICATION',
  'ASSIGNED_TO_MAIN_ADMIN',
  'ACCEPTED',
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
    title: {
      type: String,
      trim: true,
      default: function () {
        return `${this.issueCategory || 'Equipment'} issue at ${this.labName || 'Lab'} - ${this.systemNumber || 'Unit'}`;
      },
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reporter reference is required'],
      index: true,
    },
    reporterRole: {
      type: String,
      default: 'STUDENT',
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    labId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lab',
      default: null,
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
      default: 'SUBMITTED_TO_LAB_INCHARGE',
      index: true,
    },
    labInchargeVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      action: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'VERIFIED'],
      },
      remarks: {
        type: String,
        trim: true,
      },
    },
    hodVerification: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      action: {
        type: String,
        enum: ['APPROVED', 'REJECTED', 'VERIFIED'],
      },
      remarks: {
        type: String,
        trim: true,
      },
    },
    adminAction: {
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reviewedAt: Date,
      assignedAssistant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      assignedAssistantName: {
        type: String,
        trim: true,
      },
      assignedAt: Date,
      remarks: {
        type: String,
        trim: true,
      },
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
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
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

// Compound indexes for fast multi-role querying & department scoping
complaintSchema.index({ department: 1, status: 1 });
complaintSchema.index({ reporter: 1, status: 1 });
complaintSchema.index({ studentId: 1, status: 1 });
complaintSchema.index({ 'adminAction.assignedAssistant': 1, status: 1 });
complaintSchema.index({ status: 1, createdAt: -1 });

module.exports = {
  Complaint: mongoose.model('Complaint', complaintSchema),
  COMPLAINT_STATUSES,
  ISSUE_CATEGORIES,
  PRIORITY_LEVELS,
};
