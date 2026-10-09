const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    programs: [
      {
        name: { type: String, required: true },
        code: { type: String, required: true, uppercase: true },
      },
    ],
    specializations: [
      {
        type: String,
        trim: true,
      },
    ],
    hod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

departmentSchema.index({ code: 1, isActive: 1 });

module.exports = {
  Department: mongoose.model('Department', departmentSchema),
};
