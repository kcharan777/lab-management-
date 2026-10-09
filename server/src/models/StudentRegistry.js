const mongoose = require('mongoose');

const studentRegistrySchema = new mongoose.Schema(
  {
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    batch: {
      type: String,
      trim: true,
      default: '2024-2028',
    },
    isRegistered: {
      type: Boolean,
      default: false,
    },
    registeredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

studentRegistrySchema.index({ rollNumber: 1, isRegistered: 1 });

module.exports = {
  StudentRegistry: mongoose.model('StudentRegistry', studentRegistrySchema),
};
