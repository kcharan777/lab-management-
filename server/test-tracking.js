const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./src/server');
const {
  User,
  Complaint,
  StatusHistory,
} = require('./src/models');
const { generateToken } = require('./src/utils/token');

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            rawBody: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runTrackingTests() {
  console.log('--- Starting Phase 10 Student Tracking Tests ---');
  await connectDB();

  const PORT = 5009;
  const server = app.listen(PORT, async () => {
    console.log(`[Tracking Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test records
      await User.deleteMany({ email: /@tracktest\.edu$/ });
      await Complaint.deleteMany({ $or: [{ complaintId: 'CMP-2026-0849' }, { labName: 'Robotics Control Lab' }] });

      // Create Student
      const student = await User.create({
        name: 'Divya Krishnan',
        email: 'divya@tracktest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'ECE',
      });

      // Create HOD
      const hod = await User.create({
        name: 'Dr. ECE HOD',
        email: 'hod@tracktest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'ECE',
      });

      // Create Incharge
      const incharge = await User.create({
        name: 'Prof. Incharge',
        email: 'incharge@tracktest.edu',
        password: 'Password123!',
        role: 'LAB_INCHARGE',
        department: 'ECE',
      });

      // Create Admin
      const admin = await User.create({
        name: 'Lead Eng. Rajesh M.',
        email: 'admin@tracktest.edu',
        password: 'Password123!',
        role: 'MAIN_ADMIN',
        department: 'Hardware Cell',
      });

      const studentToken = generateToken(student._id, student.role);

      // Create complaint and simulate 7 milestones
      const complaint = await Complaint.create({
        complaintId: 'CMP-2026-0849',
        studentId: student._id,
        labName: 'Advanced AI & Machine Learning Lab • Room 402, Block B',
        systemNumber: 'ML-WS-14',
        issueCategory: 'HARDWARE',
        priority: 'HIGH',
        description: 'Dell Precision Workstation 3650 — GPU Failure & Display Artifacts during training.',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.png',
        status: 'IN_PROGRESS',
        hodVerification: {
          verifiedBy: hod._id,
          verifiedAt: new Date(Date.now() - 3600000 * 4),
          action: 'VERIFIED',
          remarks: 'Dr. ECE HOD approved (Capstone critical)',
        },
        labInchargeVerification: {
          verifiedBy: incharge._id,
          verifiedAt: new Date(Date.now() - 3600000 * 3),
          action: 'VERIFIED',
          remarks: 'Prof. Incharge verified hardware fault',
        },
        mainAdminAction: {
          acceptedBy: admin._id,
          acceptedAt: new Date(Date.now() - 3600000 * 2),
          technicianAssigned: 'Rajesh M. (Hardware Cell)',
          progressNotes: [
            {
              note: 'Replacement RTX 4070 Ti card dispatched & being seated',
              updatedBy: admin._id,
              updatedAt: new Date(),
            },
          ],
        },
      });

      // Insert matching StatusHistory audit trail
      await StatusHistory.create([
        {
          complaintId: complaint._id,
          status: 'SUBMITTED',
          updatedBy: student._id,
          remarks: 'Logged by Student via Mobile Console',
        },
        {
          complaintId: complaint._id,
          status: 'HOD_VERIFICATION',
          updatedBy: student._id,
          remarks: 'Escalated to HOD',
        },
        {
          complaintId: complaint._id,
          status: 'LAB_INCHARGE_VERIFICATION',
          updatedBy: hod._id,
          remarks: 'Dr. ECE HOD approved (Capstone critical)',
        },
        {
          complaintId: complaint._id,
          status: 'ASSIGNED_TO_MAIN_ADMIN',
          updatedBy: incharge._id,
          remarks: 'Prof. Incharge verified hardware fault',
        },
        {
          complaintId: complaint._id,
          status: 'ACCEPTED',
          updatedBy: admin._id,
          remarks: 'Lead Eng. Rajesh M. generated Work Order #782',
        },
        {
          complaintId: complaint._id,
          status: 'IN_PROGRESS',
          updatedBy: admin._id,
          remarks: 'Replacement RTX 4070 Ti card dispatched & being seated',
        },
      ]);

      // TEST: Fetch tracking details
      console.log('\n[Test]: Fetching tracking payload for CMP-2026-0849');
      const res = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${complaint.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      });

      if (res.statusCode !== 200 || !res.body.success) {
        throw new Error(`Tracking fetch failed: ${JSON.stringify(res.body)}`);
      }

      const { complaint: fetchedComplaint, history } = res.body.data;
      if (fetchedComplaint.complaintId !== 'CMP-2026-0849') {
        throw new Error(`Expected CMP-2026-0849, got ${fetchedComplaint.complaintId}`);
      }
      if (history.length !== 6) {
        throw new Error(`Expected 6 audit history events, got ${history.length}`);
      }
      if (!fetchedComplaint.hodVerification.verifiedBy?.name) {
        throw new Error('HOD verifiedBy name not populated');
      }
      if (!fetchedComplaint.mainAdminAction.technicianAssigned) {
        throw new Error('Technician assigned missing');
      }

      console.log(`✓ Complaint ID: ${fetchedComplaint.complaintId}`);
      console.log(`✓ Active Status: ${fetchedComplaint.status}`);
      console.log(`✓ Technician: ${fetchedComplaint.mainAdminAction.technicianAssigned}`);
      console.log(`✓ Verified HOD: ${fetchedComplaint.hodVerification.verifiedBy.name}`);
      console.log(`✓ Audit History Trail: ${history.length} milestone events verified.`);

      // Cleanup
      await User.deleteMany({ email: /@tracktest\.edu$/ });
      await Complaint.deleteMany({ labName: 'Robotics Control Lab' });
      await StatusHistory.deleteMany({ complaintId: complaint._id });

      console.log('\n--- ALL PHASE 10 STUDENT TRACKING TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nTRACKING TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTrackingTests();
