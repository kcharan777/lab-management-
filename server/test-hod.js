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

async function runHodTests() {
  console.log('--- Starting Phase 7 HOD Verification Tests ---');
  await connectDB();

  const PORT = 5006;
  const server = app.listen(PORT, async () => {
    console.log(`[HOD Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test users and complaints
      await User.deleteMany({ email: /@hodtest\.edu$/ });
      await Complaint.deleteMany({ labName: 'VLSI CAD Lab 301' });

      // Create Student
      const student = await User.create({
        name: 'Rohan Deshmukh',
        email: 'rohan@hodtest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'ECE',
      });

      // Create HOD
      const hod = await User.create({
        name: 'Dr. Anita Sen',
        email: 'anita.hod@hodtest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'ECE',
      });

      // Create Lab Incharge
      const incharge = await User.create({
        name: 'Prof. Ramesh K',
        email: 'ramesh.incharge@hodtest.edu',
        password: 'Password123!',
        role: 'LAB_INCHARGE',
        department: 'ECE',
      });

      const studentToken = generateToken(student._id, student.role);
      const hodToken = generateToken(hod._id, hod.role);

      // Create 2 test complaints
      const c1 = await Complaint.create({
        complaintId: 'CMP-2026-7001',
        studentId: student._id,
        labName: 'VLSI CAD Lab 301',
        systemNumber: 'CAD-WS-02',
        issueCategory: 'SOFTWARE',
        description: 'Cadence Virtuoso license server unreachable from station 02.',
        status: 'HOD_VERIFICATION',
      });

      const c2 = await Complaint.create({
        complaintId: 'CMP-2026-7002',
        studentId: student._id,
        labName: 'VLSI CAD Lab 301',
        systemNumber: 'CAD-WS-05',
        issueCategory: 'HARDWARE',
        description: 'Keyboard missing space bar keycap.',
        status: 'HOD_VERIFICATION',
      });

      // TEST 1: Student attempting to access HOD pending queue -> 403 Forbidden
      console.log('\n[Test 1]: Student attempting to access HOD pending queue');
      const res1 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/hod/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (res1.statusCode !== 403) {
        throw new Error(`Expected 403, got ${res1.statusCode}`);
      }
      console.log('✓ Student correctly blocked with 403 Forbidden.');

      // TEST 2: HOD fetching pending complaints -> 200 OK
      console.log('\n[Test 2]: HOD fetching pending complaints queue');
      const res2 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/hod/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      if (res2.statusCode !== 200 || !res2.body.success) {
        throw new Error(`Expected 200, got ${res2.statusCode}`);
      }
      console.log(`✓ HOD received ${res2.body.data.total} pending complaints.`);
      if (res2.body.data.total < 2) {
        throw new Error(`Expected at least 2 complaints, got ${res2.body.data.total}`);
      }

      // TEST 3: HOD verifies Complaint 1
      console.log('\n[Test 3]: HOD verifies Complaint 1');
      const res3 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/hod/complaints/${c1.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hodToken}`,
        },
      }, {
        remarks: 'Technical issue verified. Critical for lab exams. Escalate to Incharge.',
      });

      if (res3.statusCode !== 200 || !res3.body.success) {
        throw new Error(`Verification failed: ${JSON.stringify(res3.body)}`);
      }
      const verifiedC1 = res3.body.data;
      if (verifiedC1.status !== 'LAB_INCHARGE_VERIFICATION') {
        throw new Error(`Expected LAB_INCHARGE_VERIFICATION, got ${verifiedC1.status}`);
      }
      if (verifiedC1.hodVerification.action !== 'VERIFIED') {
        throw new Error('hodVerification.action was not set to VERIFIED');
      }
      console.log(`✓ Complaint 1 verified and transitioned to: ${verifiedC1.status}`);

      // Check StatusHistory for C1
      const c1History = await StatusHistory.find({ complaintId: c1._id, status: 'LAB_INCHARGE_VERIFICATION' });
      if (c1History.length === 0) {
        throw new Error('StatusHistory for LAB_INCHARGE_VERIFICATION not found!');
      }
      console.log('✓ StatusHistory recorded for HOD verification.');

      // Check Notifications created
      const studentNotif = await Notification.findOne({
        recipient: student._id,
        complaintId: c1._id,
        type: 'STATUS_UPDATE',
      });
      if (!studentNotif) {
        throw new Error('Notification for student not found!');
      }
      console.log(`✓ Student notified: "${studentNotif.title}".`);

      const inchargeNotif = await Notification.findOne({
        recipient: incharge._id,
        complaintId: c1._id,
      });
      if (!inchargeNotif) {
        throw new Error('Notification for Lab Incharge not found!');
      }
      console.log(`✓ Lab Incharge notified: "${inchargeNotif.title}".`);

      // TEST 4: Attempting to verify C1 again (duplicate/invalid transition)
      console.log('\n[Test 4]: Attempting to verify already-verified Complaint 1');
      const res4 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/hod/complaints/${c1.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hodToken}`,
        },
      }, { remarks: 'Repeat verify' });

      if (res4.statusCode !== 400 || res4.body.success) {
        throw new Error(`Expected 400 for duplicate transition, got: ${res4.statusCode}`);
      }
      console.log('✓ Duplicate verification correctly rejected with 400 Bad Request.');

      // TEST 5: HOD rejects C2 without remarks (mandatory field validation)
      console.log('\n[Test 5]: HOD rejects Complaint 2 with missing remarks');
      const res5 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/hod/complaints/${c2.complaintId}/reject`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hodToken}`,
        },
      }, { remarks: '' });

      if (res5.statusCode !== 400 || res5.body.success) {
        throw new Error(`Expected 400 for missing remarks, got: ${res5.statusCode}`);
      }
      console.log('✓ Missing rejection remarks correctly caught with 400 Bad Request.');

      // TEST 6: HOD rejects C2 with valid remarks
      console.log('\n[Test 6]: HOD rejects Complaint 2 with valid remarks');
      const res6 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/hod/complaints/${c2.complaintId}/reject`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${hodToken}`,
        },
      }, {
        remarks: 'Non-critical peripheral defect. Spares available directly at lab counter.',
      });

      if (res6.statusCode !== 200 || !res6.body.success) {
        throw new Error(`Rejection failed: ${JSON.stringify(res6.body)}`);
      }
      const rejectedC2 = res6.body.data;
      if (rejectedC2.status !== 'REJECTED' || rejectedC2.hodVerification.action !== 'REJECTED') {
        throw new Error(`Expected status REJECTED, got ${rejectedC2.status}`);
      }
      console.log(`✓ Complaint 2 rejected. Status: ${rejectedC2.status}`);

      // Check StatusHistory for C2
      const c2History = await StatusHistory.findOne({ complaintId: c2._id, status: 'REJECTED' });
      if (!c2History) {
        throw new Error('StatusHistory for REJECTED not found!');
      }
      console.log('✓ StatusHistory recorded for rejection audit.');

      // TEST 7: Student attempting to verify a complaint
      console.log('\n[Test 7]: Student attempting to verify a complaint');
      const res7 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/hod/complaints/${c2.complaintId}/verify`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${studentToken}`,
        },
      }, { remarks: 'Hacked' });

      if (res7.statusCode !== 403) {
        throw new Error(`Expected 403, got ${res7.statusCode}`);
      }
      console.log('✓ Student verification attempt blocked with 403 Forbidden.');

      // Cleanup
      await User.deleteMany({ email: /@hodtest\.edu$/ });
      await Complaint.deleteMany({ labName: 'VLSI CAD Lab 301' });
      await StatusHistory.deleteMany({ complaintId: { $in: [c1._id, c2._id] } });
      await Notification.deleteMany({ complaintId: { $in: [c1._id, c2._id] } });

      console.log('\n--- ALL PHASE 7 HOD VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nHOD TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runHodTests();
