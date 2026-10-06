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

async function runComplaintTests() {
  console.log('--- Starting Phase 5 Student Complaint Tests ---');
  await connectDB();

  const PORT = 5004;
  const server = app.listen(PORT, async () => {
    console.log(`[Complaint Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test records
      await User.deleteMany({ email: /@cmptest\.edu$/ });
      await Complaint.deleteMany({ labName: 'Test AI & Robotics Lab' });

      // Create users
      const student1 = await User.create({
        name: 'Arjun Das',
        email: 'arjun@cmptest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'Computer Science & Engineering',
      });

      const student2 = await User.create({
        name: 'Kavita Menon',
        email: 'kavita@cmptest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'Electronics & Communication',
      });

      const hod = await User.create({
        name: 'Dr. C. V. Raman',
        email: 'hod@cmptest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'Computer Science & Engineering',
      });

      const student1Token = generateToken(student1._id, student1.role);
      const student2Token = generateToken(student2._id, student2.role);
      const hodToken = generateToken(hod._id, hod.role);

      // TEST 1: POST /api/complaints with validation error (description too short)
      console.log('\n[Test 1]: POST /api/complaints with short description');
      const badRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/complaints',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${student1Token}`,
        },
      }, {
        labName: 'Test AI & Robotics Lab',
        systemNumber: 'SYS-101',
        description: 'bad',
      });

      if (badRes.statusCode !== 400 || badRes.body.success) {
        throw new Error(`Expected 400 for short description, got: ${badRes.statusCode}`);
      }
      console.log('✓ Validation error correctly caught with 400 Bad Request.');

      // TEST 2: POST /api/complaints with valid data
      console.log('\n[Test 2]: POST /api/complaints with valid data');
      const validPayload = {
        labName: 'Test AI & Robotics Lab',
        systemNumber: 'WS-AI-07',
        issueCategory: 'HARDWARE',
        priority: 'HIGH',
        description: 'RTX 4090 GPU throwing error 43 and crashing OS during PyTorch training.',
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/v12345/gpu_error.png',
        remarks: 'Happened during lab exam slot.',
      };

      const createRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/complaints',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${student1Token}`,
        },
      }, validPayload);

      console.log(`Status: ${createRes.statusCode}`);
      if (createRes.statusCode !== 201 || !createRes.body.success) {
        throw new Error(`Create complaint failed: ${JSON.stringify(createRes.body)}`);
      }

      const createdComplaint = createRes.body.data;
      console.log(`✓ Complaint created with ID: ${createdComplaint.complaintId}, Status: ${createdComplaint.status}`);

      if (!createdComplaint.complaintId.startsWith('CMP-')) {
        throw new Error('Complaint ID did not follow CMP-YYYY-XXXX format');
      }

      // Check StatusHistory
      const historyEntries = await StatusHistory.find({ complaintId: createdComplaint._id }).sort({ createdAt: 1 });
      if (historyEntries.length < 2) {
        throw new Error('Expected StatusHistory to contain SUBMITTED and HOD_VERIFICATION transitions');
      }
      console.log(`✓ StatusHistory verified with ${historyEntries.length} chronological audit entries.`);

      // Check Notification for HOD
      const hodNotif = await Notification.findOne({ recipient: hod._id, complaintId: createdComplaint._id });
      if (!hodNotif) {
        throw new Error('HOD Notification was not created!');
      }
      console.log(`✓ HOD in-app notification verified: "${hodNotif.title}".`);

      // TEST 3: GET /api/complaints/my
      console.log('\n[Test 3]: GET /api/complaints/my');
      const myRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/complaints/my',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });

      if (myRes.statusCode !== 200 || !myRes.body.success) {
        throw new Error(`GET /my failed: ${JSON.stringify(myRes.body)}`);
      }

      const { complaints, kpis } = myRes.body.data;
      if (complaints.length !== 1 || complaints[0].complaintId !== createdComplaint.complaintId) {
        throw new Error('GET /my did not return the student complaint');
      }
      if (kpis.total !== 1 || kpis.awaitingVerification !== 1) {
        throw new Error(`KPI mismatch: ${JSON.stringify(kpis)}`);
      }
      console.log(`✓ GET /my succeeded. Total: ${kpis.total}, Awaiting Verification: ${kpis.awaitingVerification}`);

      // TEST 4: GET /api/complaints/:id by Complaint ID
      console.log('\n[Test 4]: GET /api/complaints/:id using CMP-2026-XXXX');
      const getByIdRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${createdComplaint.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });

      if (getByIdRes.statusCode !== 200 || !getByIdRes.body.success) {
        throw new Error(`GET /:id failed: ${JSON.stringify(getByIdRes.body)}`);
      }
      if (!getByIdRes.body.data.complaint || !getByIdRes.body.data.history) {
        throw new Error('Complaint detail or history missing in response');
      }
      console.log(`✓ GET /:id succeeded with populated history (${getByIdRes.body.data.history.length} entries).`);

      // TEST 5: IDOR Protection - Student 2 accessing Student 1's complaint
      console.log('\n[Test 5]: Student 2 attempting to access Student 1 complaint');
      const idorRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${createdComplaint.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${student2Token}` },
      });

      if (idorRes.statusCode !== 403 || idorRes.body.success) {
        throw new Error(`Expected 403 Forbidden for cross-student access, got: ${idorRes.statusCode}`);
      }
      console.log('✓ IDOR access blocked: Student 2 received 403 Forbidden.');

      // TEST 6: HOD accessing Student 1's complaint
      console.log('\n[Test 6]: HOD inspecting Student 1 complaint');
      const hodInspectRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${createdComplaint.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });

      if (hodInspectRes.statusCode !== 200) {
        throw new Error(`Expected 200 for HOD access, got: ${hodInspectRes.statusCode}`);
      }
      console.log('✓ HOD successfully authorized to inspect student complaint.');

      // Cleanup
      await User.deleteMany({ email: /@cmptest\.edu$/ });
      await Complaint.deleteMany({ labName: 'Test AI & Robotics Lab' });
      await StatusHistory.deleteMany({ complaintId: createdComplaint._id });
      await Notification.deleteMany({ complaintId: createdComplaint._id });

      console.log('\n--- ALL PHASE 5 STUDENT COMPLAINT TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nCOMPLAINT TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runComplaintTests();
