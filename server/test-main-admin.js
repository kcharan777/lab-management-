const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./src/server');
const {
  User,
  Complaint,
  StatusHistory,
  Notification,
} = require('./src/models');
const { generateToken } = require('./src/utils/token');

function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            rawBody: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runMainAdminTests() {
  console.log('--- Starting Phase 9 Main Admin Operations Tests ---');
  await connectDB();

  const PORT = 5008;
  const server = app.listen(PORT, async () => {
    console.log(`[Admin Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test users and complaints
      await User.deleteMany({ email: /@admintest\.edu$/ });
      await Complaint.deleteMany({ labName: 'High Performance Computing Lab' });

      // Create Student
      const student = await User.create({
        name: 'Siddharth Verma',
        email: 'siddharth@admintest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'CSE',
      });

      // Create HOD
      const hod = await User.create({
        name: 'Dr. Ramanujan',
        email: 'hod@admintest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'CSE',
      });

      // Create Main Admin
      const mainAdmin = await User.create({
        name: 'Chief Systems Engineer',
        email: 'lead.admin@admintest.edu',
        password: 'Password123!',
        role: 'MAIN_ADMIN',
        department: 'Campus Infrastructure',
      });

      const studentToken = generateToken(student._id, student.role);
      const hodToken = generateToken(hod._id, hod.role);
      const adminToken = generateToken(mainAdmin._id, mainAdmin.role);

      // Create verified complaint ready for Main Admin intake
      const complaint = await Complaint.create({
        complaintId: 'CMP-2026-9001',
        studentId: student._id,
        labName: 'High Performance Computing Lab',
        systemNumber: 'HPC-NODE-14',
        issueCategory: 'HARDWARE',
        priority: 'CRITICAL',
        description: 'Dual RTX 4090 GPU thermal throttling and VRAM bus failure.',
        status: 'ASSIGNED_TO_MAIN_ADMIN',
        hodVerification: {
          verifiedBy: hod._id,
          verifiedAt: new Date(),
          action: 'VERIFIED',
          remarks: 'HOD verified hardware fault.',
        },
        labInchargeVerification: {
          verifiedBy: hod._id,
          verifiedAt: new Date(),
          action: 'VERIFIED',
          remarks: 'Lab Incharge diagnostic confirmed thermal shutdown.',
        },
      });

      // TEST 1: Student attempting to access Admin Console -> 403 Forbidden
      console.log('\n[Test 1]: Student attempting to access Main Admin matrix');
      const res1 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/main-admin/complaints',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (res1.statusCode !== 403) {
        throw new Error(`Expected 403, got ${res1.statusCode}`);
      }
      console.log('✓ Student correctly blocked with 403 Forbidden.');

      // TEST 2: Main Admin fetching Kanban matrix
      console.log('\n[Test 2]: Main Admin fetching maintenance Kanban matrix');
      const res2 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/main-admin/complaints',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      if (res2.statusCode !== 200 || !res2.body.success) {
        throw new Error(`Admin fetch failed: ${JSON.stringify(res2.body)}`);
      }
      const { kanban, telemetry } = res2.body.data;
      if (!kanban || !kanban.intake || kanban.intake.length < 1) {
        throw new Error('Complaint was not found in kanban.intake column');
      }
      console.log(`✓ Kanban matrix retrieved: Intake (${kanban.intake.length}), Open (${telemetry.openCount}), SLA Health (${telemetry.equipmentSlaHealth}).`);

      // TEST 3: Main Admin accepts complaint
      console.log('\n[Test 3]: Main Admin accepts work order');
      const res3 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/main-admin/complaints/${complaint.complaintId}/accept`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      }, {
        technicianAssigned: 'Senior Hardware Specialist Rajesh M.',
        remarks: 'Work order accepted. Replacement GPU allocated from Central Stores.',
      });

      if (res3.statusCode !== 200 || !res3.body.success) {
        throw new Error(`Accept failed: ${JSON.stringify(res3.body)}`);
      }
      const acceptedData = res3.body.data;
      if (acceptedData.status !== 'ACCEPTED') {
        throw new Error(`Expected ACCEPTED, got ${acceptedData.status}`);
      }
      console.log(`✓ Complaint transitioned to: ${acceptedData.status}, Technician: ${acceptedData.mainAdminAction.technicianAssigned}`);

      // Check StatusHistory for ACCEPTED
      const acceptHistory = await StatusHistory.findOne({
        complaintId: complaint._id,
        status: 'ACCEPTED',
      });
      if (!acceptHistory) {
        throw new Error('StatusHistory for ACCEPTED not found!');
      }
      console.log('✓ StatusHistory recorded for Admin Acceptance.');

      // TEST 4: Main Admin updates progress
      console.log('\n[Test 4]: Main Admin records repair progress note');
      const res4 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/main-admin/complaints/${complaint.complaintId}/progress`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      }, {
        note: 'New RTX 4090 GPU seated and thermal paste reapplied. Running 30-min stress test.',
      });

      if (res4.statusCode !== 200 || !res4.body.success) {
        throw new Error(`Progress update failed: ${JSON.stringify(res4.body)}`);
      }
      const inProgressData = res4.body.data;
      if (inProgressData.status !== 'IN_PROGRESS') {
        throw new Error(`Expected IN_PROGRESS, got ${inProgressData.status}`);
      }
      console.log(`✓ Complaint transitioned to: ${inProgressData.status}, Notes count: ${inProgressData.mainAdminAction.progressNotes.length}`);

      // Check StatusHistory for IN_PROGRESS
      const progHistory = await StatusHistory.findOne({
        complaintId: complaint._id,
        status: 'IN_PROGRESS',
      });
      if (!progHistory) {
        throw new Error('StatusHistory for IN_PROGRESS not found!');
      }
      console.log('✓ StatusHistory recorded for Progress update.');

      // TEST 5: Main Admin resolves complaint with short remarks -> 400 Bad Request
      console.log('\n[Test 5]: Main Admin attempts resolution with invalid remarks');
      const badResolveRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/main-admin/complaints/${complaint.complaintId}/resolve`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      }, { resolutionRemarks: 'ok' });

      if (badResolveRes.statusCode !== 400 || badResolveRes.body.success) {
        throw new Error(`Expected 400 for short resolution remarks, got: ${badResolveRes.statusCode}`);
      }
      console.log('✓ Short resolution remarks correctly rejected with 400 Bad Request.');

      // TEST 6: Main Admin resolves complaint with valid remarks
      console.log('\n[Test 6]: Main Admin resolves work order');
      const res6 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/main-admin/complaints/${complaint.complaintId}/resolve`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
      }, {
        resolutionRemarks: 'Hardware replacement completed. Passed FurMark thermal benchmark at 65C. Workstation fully operational.',
        closeImmediately: true,
      });

      if (res6.statusCode !== 200 || !res6.body.success) {
        throw new Error(`Resolve failed: ${JSON.stringify(res6.body)}`);
      }
      const resolvedData = res6.body.data;
      if (!['RESOLVED', 'CLOSED'].includes(resolvedData.status)) {
        throw new Error(`Expected RESOLVED or CLOSED, got ${resolvedData.status}`);
      }
      if (!resolvedData.resolvedAt || !resolvedData.resolutionRemarks) {
        throw new Error('resolvedAt or resolutionRemarks missing!');
      }
      console.log(`✓ Complaint successfully resolved. Status: ${resolvedData.status}, ResolvedAt: ${resolvedData.resolvedAt}`);

      // Check StatusHistory for RESOLVED
      const resolveHistory = await StatusHistory.findOne({
        complaintId: complaint._id,
        status: 'RESOLVED',
      });
      if (!resolveHistory) {
        throw new Error('StatusHistory for RESOLVED not found!');
      }
      console.log('✓ StatusHistory recorded for Resolution.');

      // Check Student Notification
      const studentNotif = await Notification.findOne({
        recipient: student._id,
        complaintId: complaint._id,
        type: 'RESOLUTION',
      });
      if (!studentNotif) {
        throw new Error('Student resolution notification not found!');
      }
      console.log(`✓ Student notified of resolution: "${studentNotif.title}".`);

      // Cleanup
      await User.deleteMany({ email: /@admintest\.edu$/ });
      await Complaint.deleteMany({ labName: 'High Performance Computing Lab' });
      await StatusHistory.deleteMany({ complaintId: complaint._id });
      await Notification.deleteMany({ complaintId: complaint._id });

      console.log('\n--- ALL PHASE 9 MAIN ADMIN OPERATIONS TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nMAIN ADMIN TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runMainAdminTests();
