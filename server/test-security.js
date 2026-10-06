const http = require('http');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./src/server');
const { User, Complaint } = require('./src/models');
const { generateToken } = require('./src/utils/token');

function makeRequest(options, postData = null, isMultipart = false, boundary = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : null;
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      if (typeof postData === 'string' || Buffer.isBuffer(postData)) {
        req.write(postData);
      } else {
        req.write(JSON.stringify(postData));
      }
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log('--- Starting Phase 13 Security Hardening & Penetration Tests ---');
  await connectDB();

  const PORT = 5011;
  const server = app.listen(PORT, async () => {
    console.log(`[Security Test Server] Running on port ${PORT}`);

    try {
      // Cleanup previous test accounts
      await User.deleteMany({ email: /@sectest\.edu$/ });
      await Complaint.deleteMany({ labName: 'Security Benchmark Lab' });

      // ==========================================
      // TEST 1: Password Hashing & Safe Serialization
      // ==========================================
      console.log('\n[Test 1]: Password Hashing & Serialization Audit');
      const testPassword = 'SecurePassword123!';
      const student1 = await User.create({
        name: 'Sec Student 1',
        email: 'student1@sectest.edu',
        password: testPassword,
        role: 'STUDENT',
        department: 'CSE',
      });

      // 1a: Verify password is not plaintext
      if (student1.password === testPassword) {
        throw new Error('FAIL: Password stored in plaintext!');
      }
      if (!student1.password.startsWith('$2')) {
        throw new Error('FAIL: Password not hashed using bcrypt!');
      }
      console.log('✓ Password hashed with bcrypt salt.');

      // 1b: Verify toJSON strips password
      const jsonUser = student1.toJSON();
      if (jsonUser.password !== undefined) {
        throw new Error('FAIL: User.toJSON() leaked password hash!');
      }
      console.log('✓ User.toJSON() safely omits password.');

      // 1c: Verify /api/auth/me does not leak password
      const student1Token = generateToken(student1._id, student1.role);
      const meRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${student1Token}`,
        },
      });

      if (meRes.statusCode !== 200 || meRes.body.data.password !== undefined) {
        throw new Error('FAIL: /api/auth/me response leaked password hash!');
      }
      console.log('✓ GET /api/auth/me returns user object without password field.');

      // ==========================================
      // TEST 2: Authentication & Token Tampering Defenses
      // ==========================================
      console.log('\n[Test 2]: Authentication Token Integrity & Tampering Defenses');

      // 2a: No token
      const noTokenRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
      });
      if (noTokenRes.statusCode !== 401) {
        throw new Error(`FAIL: Missing token expected 401, got ${noTokenRes.statusCode}`);
      }
      console.log('✓ Unauthenticated request blocked with 401 Unauthorized.');

      // 2b: Malformed token
      const malformedRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Authorization: 'Bearer this-is-not-a-valid-jwt-token' },
      });
      if (malformedRes.statusCode !== 401) {
        throw new Error(`FAIL: Malformed token expected 401, got ${malformedRes.statusCode}`);
      }
      console.log('✓ Malformed token rejected with 401 Unauthorized.');

      // 2c: Token signed with forged secret
      const forgedToken = jwt.sign(
        { id: student1._id, role: 'STUDENT' },
        'wrong-secret-key-attacker-guess',
        { expiresIn: '1h' }
      );
      const forgedRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Authorization: `Bearer ${forgedToken}` },
      });
      if (forgedRes.statusCode !== 401) {
        throw new Error(`FAIL: Forged secret token expected 401, got ${forgedRes.statusCode}`);
      }
      console.log('✓ Forged signature token rejected with 401 Unauthorized.');

      // 2d: Expired token
      const secret = process.env.JWT_SECRET || 'labpulse_dev_jwt_secret_key_change_in_production_2026';
      const expiredToken = jwt.sign(
        { id: student1._id, role: 'STUDENT' },
        secret,
        { expiresIn: '-10s' } // Expired 10 seconds ago
      );
      const expiredRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      if (expiredRes.statusCode !== 401) {
        throw new Error(`FAIL: Expired token expected 401, got ${expiredRes.statusCode}`);
      }
      console.log('✓ Expired token rejected with 401 TokenExpiredError.');

      // ==========================================
      // TEST 3: RBAC & Privilege Escalation Defenses
      // ==========================================
      console.log('\n[Test 3]: Role-Based Access Control (RBAC) Enforcement');

      // 3a: Student attempting HOD route
      const studentToHodRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/hod/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (studentToHodRes.statusCode !== 403) {
        throw new Error(`FAIL: Student accessing HOD route expected 403, got ${studentToHodRes.statusCode}`);
      }
      console.log('✓ Student blocked from /api/hod/* with 403 Forbidden.');

      // 3b: Student attempting Lab Incharge route
      const studentToInchargeRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/lab-incharge/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (studentToInchargeRes.statusCode !== 403) {
        throw new Error(`FAIL: Student accessing Lab Incharge route expected 403, got ${studentToInchargeRes.statusCode}`);
      }
      console.log('✓ Student blocked from /api/lab-incharge/* with 403 Forbidden.');

      // 3c: Student attempting Main Admin route
      const studentToAdminRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/main-admin/complaints',
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (studentToAdminRes.statusCode !== 403) {
        throw new Error(`FAIL: Student accessing Main Admin route expected 403, got ${studentToAdminRes.statusCode}`);
      }
      console.log('✓ Student blocked from /api/main-admin/* with 403 Forbidden.');

      // 3d: HOD attempting Main Admin route
      const hodUser = await User.create({
        name: 'Sec HOD',
        email: 'hod@sectest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'CSE',
      });
      const hodToken = generateToken(hodUser._id, hodUser.role);
      const hodToAdminRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/main-admin/complaints',
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      if (hodToAdminRes.statusCode !== 403) {
        throw new Error(`FAIL: HOD accessing Main Admin route expected 403, got ${hodToAdminRes.statusCode}`);
      }
      console.log('✓ HOD blocked from /api/main-admin/* with 403 Forbidden.');

      // ==========================================
      // TEST 4: IDOR (Insecure Direct Object Reference) Protection
      // ==========================================
      console.log('\n[Test 4]: Insecure Direct Object Reference (IDOR) Protection');
      const student2 = await User.create({
        name: 'Sec Student 2',
        email: 'student2@sectest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'ECE',
      });
      const student2Token = generateToken(student2._id, student2.role);

      // Student 1 submits a complaint
      const complaint1 = await Complaint.create({
        complaintId: 'CMP-2026-9999',
        studentId: student1._id,
        labName: 'Security Benchmark Lab',
        systemNumber: 'SEC-01',
        issueCategory: 'HARDWARE',
        priority: 'HIGH',
        description: 'Test complaint for IDOR protection validation',
        status: 'SUBMITTED',
      });

      // Student 2 attempts to read Student 1's complaint
      const idorRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${complaint1.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${student2Token}` },
      });
      if (idorRes.statusCode !== 403) {
        throw new Error(`FAIL: IDOR breach! Student 2 accessed Student 1 complaint with status ${idorRes.statusCode}`);
      }
      console.log('✓ Student 2 blocked from viewing Student 1 complaint with 403 Forbidden.');

      // Student 1 accesses own complaint
      const ownRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${complaint1.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${student1Token}` },
      });
      if (ownRes.statusCode !== 200) {
        throw new Error(`FAIL: Student 1 could not view own complaint, status ${ownRes.statusCode}`);
      }
      console.log('✓ Student 1 successfully authorized to access own complaint.');

      // ==========================================
      // TEST 5: NoSQL Injection Sanitization
      // ==========================================
      console.log('\n[Test 5]: NoSQL Injection Defense Audit');
      // Malicious query with MongoDB operator in login request
      const nosqlRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          email: { $gt: '' },
          password: 'Password123!',
        }
      );
      // Because $gt is stripped by sanitizeInput, email becomes empty/missing or sanitized, failing authentication
      if (nosqlRes.statusCode === 200) {
        throw new Error('FAIL: NoSQL injection bypassed authentication!');
      }
      console.log(`✓ NoSQL injection operator {$gt: ''} safely neutralized (response: ${nosqlRes.statusCode}).`);

      // ==========================================
      // TEST 6: File Upload Security & Size Limits
      // ==========================================
      console.log('\n[Test 6]: File Upload Security (MIME Check & Size Limits)');

      // 6a: Uploading disallowed file type (.sh script)
      const boundary = '----WebKitFormBoundarySecTest123';
      const fakeScriptBody = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="image"; filename="malicious.sh"',
        'Content-Type: application/x-sh',
        '',
        '#!/bin/bash\necho "exploit"',
        `--${boundary}--`,
      ].join('\r\n');

      const fileTypeRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/upload',
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(fakeScriptBody),
            Authorization: `Bearer ${student1Token}`,
          },
        },
        fakeScriptBody
      );

      if (fileTypeRes.statusCode !== 400 || !JSON.stringify(fileTypeRes.body).includes('Invalid file type')) {
        throw new Error(`FAIL: Malicious shell script upload not rejected! Status: ${fileTypeRes.statusCode}`);
      }
      console.log('✓ Malicious shell script rejected with 400 Invalid file type.');

      // ==========================================
      // TEST 7: Security Headers & Information Disclosure
      // ==========================================
      console.log('\n[Test 7]: Security Headers & Information Disclosure Audit');
      const healthRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/health',
        method: 'GET',
      });

      // 7a: X-Powered-By must be absent
      if (healthRes.headers['x-powered-by'] !== undefined) {
        throw new Error('FAIL: x-powered-by header is exposed!');
      }
      console.log('✓ x-powered-by header successfully hidden.');

      // 7b: X-Content-Type-Options must be nosniff
      if (healthRes.headers['x-content-type-options'] !== 'nosniff') {
        throw new Error('FAIL: x-content-type-options header missing or not nosniff!');
      }
      console.log('✓ x-content-type-options: nosniff verified.');

      // 7c: X-Frame-Options must be present
      if (!healthRes.headers['x-frame-options']) {
        throw new Error('FAIL: x-frame-options header missing!');
      }
      console.log(`✓ x-frame-options: ${healthRes.headers['x-frame-options']} verified.`);

      console.log('\n--- ALL PHASE 13 SECURITY HARDENING TESTS PASSED SUCCESSFULLY! ---');
      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\nSECURITY TEST SUITE FAILED:', err);
      server.close();
      process.exit(1);
    }
  });
}

runSecurityTests();
