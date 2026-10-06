const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./src/config/db');
const { protect } = require('./src/middleware/authMiddleware');
const { authorize, checkComplaintAccess } = require('./src/middleware/rbacMiddleware');
const { User, Complaint } = require('./src/models');
const { generateToken } = require('./src/utils/token');
const ApiResponse = require('./src/utils/apiResponse');

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

async function runRbacTests() {
  console.log('--- Starting Phase 4 Role-Based Access Control (RBAC) Tests ---');
  await connectDB();

  // Create isolated express app for testing RBAC matrix
  const testApp = express();
  testApp.use(express.json());

  testApp.get('/test/student-only', protect, authorize('STUDENT'), (req, res) => {
    return ApiResponse.success(res, { role: req.user.role }, 'Student resource granted');
  });

  testApp.get('/test/hod-only', protect, authorize('HOD'), (req, res) => {
    return ApiResponse.success(res, { role: req.user.role }, 'HOD resource granted');
  });

  testApp.get('/test/incharge-only', protect, authorize('LAB_INCHARGE'), (req, res) => {
    return ApiResponse.success(res, { role: req.user.role }, 'Lab Incharge resource granted');
  });

  testApp.get('/test/admin-only', protect, authorize('MAIN_ADMIN'), (req, res) => {
    return ApiResponse.success(res, { role: req.user.role }, 'Admin resource granted');
  });

  testApp.get('/test/complaints/:id', protect, checkComplaintAccess, (req, res) => {
    return ApiResponse.success(res, { complaintId: req.complaint.complaintId }, 'Complaint access granted');
  });

  const PORT = 5003;
  const server = testApp.listen(PORT, async () => {
    console.log(`[RBAC Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test users & complaints
      await User.deleteMany({ email: /@rbactest\.edu$/ });
      await Complaint.deleteMany({ labName: 'RBAC Security Lab' });

      // Create users for all 4 roles
      const student1 = await User.create({
        name: 'Student One',
        email: 'student1@rbactest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'CSE',
      });

      const student2 = await User.create({
        name: 'Student Two',
        email: 'student2@rbactest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'ECE',
      });

      const hod = await User.create({
        name: 'Dr. HOD User',
        email: 'hod@rbactest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'CSE',
      });

      const incharge = await User.create({
        name: 'Prof. Incharge',
        email: 'incharge@rbactest.edu',
        password: 'Password123!',
        role: 'LAB_INCHARGE',
        department: 'CSE',
      });

      const mainAdmin = await User.create({
        name: 'System Admin',
        email: 'admin@rbactest.edu',
        password: 'Password123!',
        role: 'MAIN_ADMIN',
        department: 'Campus IT',
      });

      // Issue tokens
      const student1Token = generateToken(student1._id, student1.role);
      const student2Token = generateToken(student2._id, student2.role);
      const hodToken = generateToken(hod._id, hod.role);
      const inchargeToken = generateToken(incharge._id, incharge.role);
      const adminToken = generateToken(mainAdmin._id, mainAdmin.role);

      // Create a complaint owned by Student 1
      const student1Complaint = await Complaint.create({
        complaintId: 'CMP-2026-9001',
        studentId: student1._id,
        labName: 'RBAC Security Lab',
        systemNumber: 'SEC-01',
        issueCategory: 'HARDWARE',
        description: 'Test complaint for IDOR verification.',
        status: 'SUBMITTED',
      });

      // TEST 1: Student accessing student endpoint -> 200
      console.log('\n[Test 1]: Student accessing Student endpoint');
      const res1 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/student-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (res1.statusCode !== 200 || !res1.body.success) {
        throw new Error(`Expected 200, got ${res1.statusCode}`);
      }
      console.log('✓ Student allowed to access Student endpoint.');

      // TEST 2: Student accessing HOD endpoint -> 403 Forbidden
      console.log('\n[Test 2]: Student attempting to access HOD endpoint (Privilege Escalation attempt)');
      const res2 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/hod-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (res2.statusCode !== 403 || res2.body.success) {
        throw new Error(`Expected 403, got ${res2.statusCode}`);
      }
      console.log('✓ Student access to HOD endpoint correctly rejected with 403 Forbidden.');

      // TEST 3: Student accessing Main Admin endpoint -> 403 Forbidden
      console.log('\n[Test 3]: Student attempting to access Main Admin endpoint');
      const res3 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/admin-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (res3.statusCode !== 403) {
        throw new Error(`Expected 403, got ${res3.statusCode}`);
      }
      console.log('✓ Student access to Admin endpoint correctly rejected with 403 Forbidden.');

      // TEST 4: HOD accessing HOD endpoint -> 200
      console.log('\n[Test 4]: HOD accessing HOD endpoint');
      const res4 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/hod-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      if (res4.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res4.statusCode}`);
      }
      console.log('✓ HOD successfully authorized for HOD endpoint.');

      // TEST 5: HOD attempting to access Main Admin endpoint -> 403 Forbidden
      console.log('\n[Test 5]: HOD attempting to access Main Admin endpoint');
      const res5 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/admin-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      if (res5.statusCode !== 403) {
        throw new Error(`Expected 403, got ${res5.statusCode}`);
      }
      console.log('✓ HOD access to Main Admin endpoint correctly blocked with 403.');

      // TEST 6: Lab Incharge accessing Lab Incharge endpoint -> 200
      console.log('\n[Test 6]: Lab Incharge accessing Lab Incharge endpoint');
      const res6 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/incharge-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${inchargeToken}` },
      });
      if (res6.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res6.statusCode}`);
      }
      console.log('✓ Lab Incharge successfully authorized.');

      // TEST 7: Main Admin accessing Admin endpoint -> 200
      console.log('\n[Test 7]: Main Admin accessing Admin endpoint');
      const res7 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/test/admin-only',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (res7.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res7.statusCode}`);
      }
      console.log('✓ Main Admin successfully authorized.');

      // TEST 8: IDOR Test - Student 1 accessing own complaint -> 200
      console.log('\n[Test 8]: Student 1 accessing own complaint');
      const res8 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/test/complaints/${student1Complaint._id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (res8.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res8.statusCode}`);
      }
      console.log('✓ Student 1 successfully accessed own complaint.');

      // TEST 9: IDOR Test - Student 2 attempting to access Student 1 complaint -> 403 Forbidden
      console.log('\n[Test 9]: Student 2 attempting to access Student 1 complaint (IDOR vulnerability check)');
      const res9 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/test/complaints/${student1Complaint._id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      if (res9.statusCode !== 403) {
        throw new Error(`VULNERABILITY DETECTED! Expected 403, got ${res9.statusCode}`);
      }
      console.log('✓ IDOR access strictly blocked! Student 2 received 403 Forbidden.');

      // TEST 10: Faculty (HOD/Incharge/Admin) accessing complaint -> 200
      console.log('\n[Test 10]: HOD inspecting Student complaint');
      const res10 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/test/complaints/${student1Complaint._id}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      if (res10.statusCode !== 200) {
        throw new Error(`Expected 200, got ${res10.statusCode}`);
      }
      console.log('✓ HOD successfully authorized to review student complaint.');

      // Cleanup
      await User.deleteMany({ email: /@rbactest\.edu$/ });
      await Complaint.deleteMany({ labName: 'RBAC Security Lab' });

      console.log('\n--- ALL PHASE 4 RBAC & IDOR TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nRBAC TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runRbacTests();
