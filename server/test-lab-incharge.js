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

async function runLabInchargeTests() {
  console.log('--- Starting Phase 8 Lab Incharge Verification Tests ---');
  await connectDB();

  const PORT = 5007;
  const server = app.listen(PORT, async () => {
    console.log(`[Lab Incharge Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test users and complaints
      await User.deleteMany({ email: /@inchargetest\.edu$/ });
      await Complaint.deleteMany({ labName: 'Cyber Physical Systems Lab' });

      // Create Student
      const student = await User.create({
        name: 'Vivek Joshi',
        email: 'vivek@inchargetest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'CSE',
      });

      // Create HOD
      const hod = await User.create({
        name: 'Dr. Meenakshi',
        email: 'meenakshi@inchargetest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'CSE',
      });

      // Create Lab Incharge
      const incharge = await User.create({
        name: 'Prof. Harish Nair',
        email: 'harish@inchargetest.edu',
        password: 'Password123!',
        role: 'LAB_INCHARGE',
        department: 'CSE',
      });

      // Create Main Admin
      const mainAdmin = await User.create({
        name: 'Main Campus Admin',
        email: 'admin@inchargetest.edu',
        password: 'Password123!',
        role: 'MAIN_ADMIN',
        department: 'IT Infrastructure',
      });

      const studentToken = generateToken(student._id, student.role);
      const hodToken = generateToken(hod._id, hod.role);
      const inchargeToken = generateToken(incharge._id, incharge.role);

      // Create a complaint still in HOD_VERIFICATION
      const unverifiedComplaint = await Complaint.create({
        complaintId: 'CMP-2026-8001',
        studentId: student._id,
        labName: 'Cyber Physical Systems Lab',
        systemNumber: 'CPS-NODE-01',
        issueCategory: 'HARDWARE',
        description: 'Ethernet RJ45 port physically damaged on network bench 01.',
        status: 'HOD_VERIFICATION',
      });

      // TEST 1: Lab Incharge attempts to verify BEFORE HOD verification
      console.log('\n[Test 1]: Lab Incharge attempts to verify complaint before HOD sign-off');
      const prematureRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/lab-incharge/complaints/${unverifiedComplaint.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${inchargeToken}`,
        },
      }, { remarks: 'Premature verify' });

      if (prematureRes.statusCode !== 400 || prematureRes.body.success) {
        throw new Error(`Expected 400 for premature verification, got: ${prematureRes.statusCode}`);
      }
      console.log('✓ Premature verification correctly blocked with 400 Bad Request.');

      // Now simulate HOD verification so it enters LAB_INCHARGE_VERIFICATION
      unverifiedComplaint.status = 'LAB_INCHARGE_VERIFICATION';
      unverifiedComplaint.hodVerification = {
        verifiedBy: hod._id,
        verifiedAt: new Date(),
        action: 'VERIFIED',
        remarks: 'HOD confirmed issue.',
      };
      await unverifiedComplaint.save();

      // TEST 2: Lab Incharge fetches pending complaints
      console.log('\n[Test 2]: Lab Incharge fetches pending verification queue');
      const pendingRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/lab-incharge/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${inchargeToken}` },
      });

      if (pendingRes.statusCode !== 200 || !pendingRes.body.success) {
        throw new Error(`Pending fetch failed: ${JSON.stringify(pendingRes.body)}`);
      }
      if (pendingRes.body.data.total < 1) {
        throw new Error(`Expected at least 1 complaint, got ${pendingRes.body.data.total}`);
      }
      console.log(`✓ Lab Incharge queue retrieved ${pendingRes.body.data.total} pending item(s).`);

      // TEST 3: Student attempts to verify -> 403 Forbidden
      console.log('\n[Test 3]: Student attempts to verify as Lab Incharge');
      const studentAttemptRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/lab-incharge/complaints/${unverifiedComplaint.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`,
        },
      }, { remarks: 'Hacked' });

      if (studentAttemptRes.statusCode !== 403) {
        throw new Error(`Expected 403, got: ${studentAttemptRes.statusCode}`);
      }
      console.log('✓ Student verification attempt blocked with 403 Forbidden.');

      // TEST 4: Lab Incharge verifies complaint
      console.log('\n[Test 4]: Lab Incharge verifies complaint and escalates to Main Admin');
      const verifyRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/lab-incharge/complaints/${unverifiedComplaint.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${inchargeToken}`,
        },
      }, {
        remarks: 'Confirmed broken RJ45 pins. Switch port link down. Main Admin team dispatch requested.',
      });

      if (verifyRes.statusCode !== 200 || !verifyRes.body.success) {
        throw new Error(`Verify failed: ${JSON.stringify(verifyRes.body)}`);
      }
      const verified = verifyRes.body.data;
      if (verified.status !== 'ASSIGNED_TO_MAIN_ADMIN') {
        throw new Error(`Expected ASSIGNED_TO_MAIN_ADMIN, got: ${verified.status}`);
      }
      if (verified.labInchargeVerification.action !== 'VERIFIED') {
        throw new Error('labInchargeVerification.action was not VERIFIED');
      }
      console.log(`✓ Complaint transitioned to: ${verified.status}`);

      // Check StatusHistory
      const inchargeHistory = await StatusHistory.findOne({
        complaintId: unverifiedComplaint._id,
        status: 'ASSIGNED_TO_MAIN_ADMIN',
      });
      if (!inchargeHistory) {
        throw new Error('StatusHistory for ASSIGNED_TO_MAIN_ADMIN not found!');
      }
      console.log('✓ StatusHistory recorded for Lab Incharge verification.');

      // Check Notifications
      const studentNotif = await Notification.findOne({
        recipient: student._id,
        complaintId: unverifiedComplaint._id,
        type: 'STATUS_UPDATE',
      });
      if (!studentNotif) {
        throw new Error('Student Notification not found!');
      }
      console.log(`✓ Student notified: "${studentNotif.title}".`);

      const adminNotif = await Notification.findOne({
        recipient: mainAdmin._id,
        complaintId: unverifiedComplaint._id,
        type: 'ASSIGNMENT',
      });
      if (!adminNotif) {
        throw new Error('Main Admin Notification not found!');
      }
      console.log(`✓ Main Admin notified: "${adminNotif.title}".`);

      // TEST 5: Duplicate verification attempt
      console.log('\n[Test 5]: Duplicate verification attempt');
      const dupRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/lab-incharge/complaints/${unverifiedComplaint.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${inchargeToken}`,
        },
      }, { remarks: 'Repeat' });

      if (dupRes.statusCode !== 400 || dupRes.body.success) {
        throw new Error(`Expected 400 for duplicate verify, got: ${dupRes.statusCode}`);
      }
      console.log('✓ Duplicate verification correctly rejected with 400 Bad Request.');

      // TEST 6: Lab Incharge rejects a complaint with remarks
      console.log('\n[Test 6]: Lab Incharge rejects an equipment complaint');
      const rejectTarget = await Complaint.create({
        complaintId: 'CMP-2026-8002',
        studentId: student._id,
        labName: 'Cyber Physical Systems Lab',
        systemNumber: 'CPS-NODE-03',
        issueCategory: 'NETWORK',
        description: 'Wi-Fi disconnects intermittently during simulation.',
        status: 'LAB_INCHARGE_VERIFICATION',
      });

      const rejectRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/lab-incharge/complaints/${rejectTarget.complaintId}/reject`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${inchargeToken}`,
        },
      }, {
        remarks: 'WLAN access point is fully nominal. Issue was resolved by resetting client Wi-Fi driver.',
      });

      if (rejectRes.statusCode !== 200 || !rejectRes.body.success) {
        throw new Error(`Rejection failed: ${JSON.stringify(rejectRes.body)}`);
      }
      if (rejectRes.body.data.status !== 'REJECTED') {
        throw new Error(`Expected status REJECTED, got: ${rejectRes.body.data.status}`);
      }
      console.log('✓ Complaint rejected by Lab Incharge and recorded with 200 OK.');

      // Cleanup
      await User.deleteMany({ email: /@inchargetest\.edu$/ });
      await Complaint.deleteMany({ labName: 'Cyber Physical Systems Lab' });
      await StatusHistory.deleteMany({ complaintId: { $in: [unverifiedComplaint._id, rejectTarget._id] } });
      await Notification.deleteMany({ complaintId: { $in: [unverifiedComplaint._id, rejectTarget._id] } });

      console.log('\n--- ALL PHASE 8 LAB INCHARGE VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nLAB INCHARGE TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runLabInchargeTests();
