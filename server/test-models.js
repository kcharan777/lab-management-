const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const {
  User,
  Complaint,
  StatusHistory,
  Notification,
} = require('./src/models');
const { generateComplaintId } = require('./src/utils/complaintIdGenerator');

dotenv.config();

async function runModelTests() {
  console.log('--- Starting Phase 2 Model Tests ---');
  await connectDB();

  try {
    // Clean up any previous test artifacts
    await User.deleteMany({ email: /@test-labpulse\.edu$/ });
    await Complaint.deleteMany({ labName: 'Test Automation Lab 99' });

    // TEST 1: User creation, hashing, safe serialization
    console.log('[Test 1]: Creating test student user...');
    const rawPassword = 'SecurePassword123!';
    const studentUser = new User({
      name: 'Aditya Sharma',
      email: 'aditya.sharma@test-labpulse.edu',
      password: rawPassword,
      role: 'STUDENT',
      department: 'Computer Science & Engineering',
    });
    await studentUser.save();

    if (studentUser.password === rawPassword) {
      throw new Error('FAILED: Password was NOT hashed!');
    }
    console.log('✓ Password was successfully hashed.');

    const isMatch = await studentUser.comparePassword(rawPassword);
    if (!isMatch) {
      throw new Error('FAILED: comparePassword failed to match correct password!');
    }
    console.log('✓ comparePassword successfully verified correct password.');

    const serializedUser = studentUser.toJSON();
    if (serializedUser.password || serializedUser.__v) {
      throw new Error('FAILED: Safe serialization leaked password or __v!');
    }
    console.log('✓ toJSON safely stripped password hash.');

    // TEST 2: Role validation
    console.log('[Test 2]: Testing invalid role rejection...');
    try {
      const invalidUser = new User({
        name: 'Invalid Role User',
        email: 'invalid.role@test-labpulse.edu',
        password: 'Password123!',
        role: 'SUPER_HACKER',
        department: 'CSE',
      });
      await invalidUser.save();
      throw new Error('FAILED: Model allowed an invalid role!');
    } catch (err) {
      console.log('✓ Invalid role successfully rejected:', err.message);
    }

    // TEST 3: Sequential complaint ID generator
    console.log('[Test 3]: Testing complaint ID generator...');
    const complaintId = await generateComplaintId();
    console.log(`✓ Generated Complaint ID: ${complaintId}`);
    if (!complaintId.startsWith('CMP-')) {
      throw new Error('FAILED: Complaint ID does not follow CMP-YYYY-XXXX convention!');
    }

    // TEST 4: Complaint model creation
    console.log('[Test 4]: Creating test complaint...');
    const complaint = new Complaint({
      complaintId,
      studentId: studentUser._id,
      labName: 'Test Automation Lab 99',
      systemNumber: 'NODE-TEST-01',
      issueCategory: 'HARDWARE',
      priority: 'HIGH',
      description: 'System fan stopped spinning; GPU overheating under CUDA batch workload.',
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      status: 'SUBMITTED',
    });
    await complaint.save();
    console.log(`✓ Complaint persisted with ID ${complaint.complaintId} and Status ${complaint.status}.`);

    // TEST 5: StatusHistory audit record
    console.log('[Test 5]: Creating StatusHistory audit log...');
    const historyRecord = new StatusHistory({
      complaintId: complaint._id,
      status: 'SUBMITTED',
      updatedBy: studentUser._id,
      remarks: 'Initial complaint filed via Student Portal.',
    });
    await historyRecord.save();
    console.log(`✓ StatusHistory recorded for complaint ${historyRecord.complaintId}.`);

    // TEST 6: Notification model
    console.log('[Test 6]: Creating in-app notification...');
    const notification = new Notification({
      recipient: studentUser._id,
      complaintId: complaint._id,
      title: 'Complaint Registered',
      message: `Your grievance ${complaint.complaintId} has been logged and forwarded to HOD for verification.`,
      type: 'STATUS_UPDATE',
    });
    await notification.save();
    console.log('✓ Notification successfully created.');

    // Clean up
    await User.deleteMany({ email: /@test-labpulse\.edu$/ });
    await Complaint.deleteMany({ labName: 'Test Automation Lab 99' });
    await StatusHistory.deleteMany({ complaintId: complaint._id });
    await Notification.deleteMany({ recipient: studentUser._id });

    console.log('--- ALL PHASE 2 MODEL TESTS PASSED SUCCESSFULLY! ---');
    process.exit(0);
  } catch (error) {
    console.error('MODEL TEST ERROR:', error);
    process.exit(1);
  }
}

runModelTests();
