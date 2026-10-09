const mongoose = require('mongoose');

const LAB_STATUSES = ['OPERATIONAL', 'MAINTENANCE', 'OFFLINE'];

const labSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Lab name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Lab code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Lab location is required (e.g. Block, Floor, Room)'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: LAB_STATUSES,
        message: '{VALUE} is not a valid lab status',
      },
      default: 'OPERATIONAL',
      index: true,
    },
    capacity: {
      type: Number,
      default: 30,
      min: [1, 'Capacity must be at least 1'],
    },
    systemsCount: {
      type: Number,
      default: 30,
      min: [0, 'Systems count cannot be negative'],
    },
    incharge: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    history: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: { type: String, default: 'Admin' },
        details: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

labSchema.index({ department: 1, status: 1 });

module.exports = {
  Lab: mongoose.model('Lab', labSchema),
  LAB_STATUSES,
};
