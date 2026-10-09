const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const USER_ROLES = ['STUDENT', 'HOD', 'LAB_INCHARGE', 'REPAIR_ASSISTANT', 'MAIN_ADMIN'];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: USER_ROLES,
        message: '{VALUE} is not a supported role',
      },
      default: 'STUDENT',
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    specialization: {
      type: String,
      trim: true,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// DATABASE CONSTRAINTS:
// 1. Exactly ONE MAIN_ADMIN in the entire database
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'MAIN_ADMIN' },
    name: 'unique_single_main_admin',
  }
);

// 2. Exactly ONE HOD account per department
userSchema.index(
  { department: 1, role: 1 },
  {
    unique: true,
    partialFilterExpression: { role: 'HOD' },
    name: 'unique_hod_per_department',
  }
);

// 3. Unique roll number per student
userSchema.index(
  { rollNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { rollNumber: { $type: 'string' } },
    name: 'unique_student_roll_number',
  }
);

// Pre-save validation for Single Admin & Single HOD per department
userSchema.pre('validate', async function (next) {
  try {
    // Validate Single Admin Rule
    if (this.role === 'MAIN_ADMIN' && (this.isNew || this.isModified('role'))) {
      const existingAdmin = await this.constructor.findOne({
        role: 'MAIN_ADMIN',
        _id: { $ne: this._id },
      });
      if (existingAdmin) {
        return next(
          new Error(
            'Security violation: Exactly ONE Admin account is permitted in the entire system.'
          )
        );
      }
    }

    // Validate Single HOD per Department Rule
    if (this.role === 'HOD' && (this.isNew || this.isModified('role') || this.isModified('department'))) {
      const existingHOD = await this.constructor.findOne({
        role: 'HOD',
        department: this.department,
        _id: { $ne: this._id },
      });
      if (existingHOD) {
        return next(
          new Error(
            `Security violation: Department '${this.department}' already has a designated HOD. Only ONE HOD account is allowed per department.`
          )
        );
      }
    }

    // Validate Student Roll Number Requirement
    if (this.role === 'STUDENT' && !this.rollNumber) {
      return next(new Error('Roll number is required for student accounts.'));
    }

    next();
  } catch (err) {
    next(err);
  }
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = {
  User: mongoose.model('User', userSchema),
  USER_ROLES,
};
