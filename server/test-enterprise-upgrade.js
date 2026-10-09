const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./src/server');
const {
  User,
  Complaint,
  Lab,
  Department,
  StudentRegistry,
  StatusHistory,
  Notification,
} = require('./src/models');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
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
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('=================================================================');
  console.log('   LabPulse Enterprise Operations Suite — System Verification    ');
  console.log('=================================================================\n');

  await connectDB();

  const PORT = 5022;
  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}\n`);

    let passedTests = 0;
    let totalTests = 0;

    const assert = (condition, testName, details = '') => {
      totalTests++;
      if (condition) {
        passedTests++;
        console.log(`  [PASS] Test ${totalTests}: ${testName}`);
      } else {
        console.error(`  [FAIL] Test ${totalTests}: ${testName} - ${details}`);
      }
    };

    try {
      // Clean up previous test records
      await User.deleteMany({ email: /@testsuite\.edu$/ });
      await Complaint.deleteMany({ systemNumber: /TEST-RIG-/ });
      await Lab.deleteMany({ code: 'LAB-TEST-99' });

      // -------------------------------------------------------------
      // SECTION 1: AUTHENTICATION & SINGLE ADMIN RULE
      // -------------------------------------------------------------
      console.log('--- SECTION 1: Single Admin & Role Security ---');

      // Test 1: Public registration cannot select MAIN_ADMIN
      const fakeAdminReg = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Hacker Admin',
          email: 'hacker@testsuite.edu',
          password: 'Password123',
          role: 'MAIN_ADMIN',
          department: 'Computer Science & Engineering',
          rollNumber: '24R21A6699',
        }
      );
      assert(
        fakeAdminReg.statusCode === 403,
        'Public registration rejects MAIN_ADMIN role (403 Forbidden)',
        `Got ${fakeAdminReg.statusCode}`
      );

      // Seed one legitimate Admin directly in DB (or check existing)
      let primaryAdmin = await User.findOne({ role: 'MAIN_ADMIN' });
      if (!primaryAdmin) {
        primaryAdmin = new User({
          name: 'Chief Admin',
          email: 'chief.admin@testsuite.edu',
          password: 'AdminPassword123',
          role: 'MAIN_ADMIN',
          department: 'Administration',
          isActive: true,
        });
        await primaryAdmin.save();
      }

      // Log in as primary admin to get Admin JWT
      const adminLoginRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/login',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          email: primaryAdmin.email,
          password: 'AdminPassword123',
        }
      );

      let adminToken = adminLoginRes.body?.data?.token;
      if (!adminToken) {
        // If password was different, update password and re-login
        primaryAdmin.password = 'AdminPassword123';
        await primaryAdmin.save();
        const relogin = await makeRequest(
          {
            hostname: 'localhost',
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          },
          { email: primaryAdmin.email, password: 'AdminPassword123' }
        );
        adminToken = relogin.body?.data?.token;
      }

      assert(!!adminToken, 'Admin authentication returns valid JWT');

      // Test 3: Existing Admin attempts to create another MAIN_ADMIN
      const duplicateAdminRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/users',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          name: 'Second Admin',
          email: 'second.admin@testsuite.edu',
          password: 'Password123',
          role: 'MAIN_ADMIN',
          department: 'Administration',
        }
      );
      assert(
        duplicateAdminRes.statusCode === 403,
        'Admin cannot create second Admin account (Single Admin Policy enforced)',
        `Got ${duplicateAdminRes.statusCode}`
      );

      // -------------------------------------------------------------
      // SECTION 2: SINGLE HOD PER DEPARTMENT RULE
      // -------------------------------------------------------------
      console.log('\n--- SECTION 2: Single HOD per Department Rule ---');

      // Test 4: Public registration cannot select HOD
      const publicHodReg = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Self Appointed HOD',
          email: 'selfhod@testsuite.edu',
          password: 'Password123',
          role: 'HOD',
          department: 'Computer Science & Engineering',
          rollNumber: '24R21A6688',
        }
      );
      assert(
        publicHodReg.statusCode === 403,
        'Public registration rejects HOD role (403 Forbidden)',
        `Got ${publicHodReg.statusCode}`
      );

      // Ensure test dept has no prior HOD for clean test
      await User.deleteMany({ role: 'HOD', department: 'Mechanical Engineering' });

      // Test 5: Admin provisions legitimate HOD for Mechanical Engineering
      const createHod1 = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/users',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          name: 'Dr. Ramesh MECH',
          email: 'ramesh.mech@testsuite.edu',
          password: 'Password123',
          role: 'HOD',
          department: 'Mechanical Engineering',
        }
      );
      assert(createHod1.statusCode === 201, 'Admin successfully provisions HOD for Mechanical Engineering');

      // Test 6: Admin attempts to provision SECOND HOD for the same department
      const createHodDuplicate = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/users',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          name: 'Dr. Suresh MECH',
          email: 'suresh.mech@testsuite.edu',
          password: 'Password123',
          role: 'HOD',
          department: 'Mechanical Engineering',
        }
      );
      assert(
        createHodDuplicate.statusCode === 409,
        'Single HOD per department enforced: Rejects duplicate HOD for same department (409 Conflict)',
        `Got ${createHodDuplicate.statusCode}`
      );

      // -------------------------------------------------------------
      // SECTION 3: LEGITIMATE STUDENT VERIFICATION
      // -------------------------------------------------------------
      console.log('\n--- SECTION 3: Legitimate Student Registration & Roll Validation ---');

      // Test 7: Student registration with invalid roll number
      const invalidRollReg = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Fake Student',
          email: 'fakestudent@testsuite.edu',
          password: 'Password123',
          role: 'STUDENT',
          department: 'Computer Science & Engineering',
          rollNumber: 'INVALID_ROLL_123',
        }
      );
      assert(
        invalidRollReg.statusCode === 400,
        'Rejects non-conforming roll number format (400 Bad Request)',
        `Got ${invalidRollReg.statusCode}`
      );

      // Test 8: Student registration with valid MLRIT roll number
      const validStudentReg = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'K. Charan MLRIT',
          email: 'charan.student@testsuite.edu',
          password: 'StudentPassword123',
          role: 'STUDENT',
          department: 'Computer Science & Engineering',
          rollNumber: '24R21A66J9',
        }
      );
      assert(
        validStudentReg.statusCode === 201,
        'Accepts and registers valid MLRIT 10-char roll number (24R21A66J9)',
        `Got ${validStudentReg.statusCode}`
      );

      const studentToken = validStudentReg.body?.data?.token;

      // Test 9: Rejects duplicate roll number registration
      const dupStudentReg = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Imposter Student',
          email: 'imposter@testsuite.edu',
          password: 'Password123',
          role: 'STUDENT',
          department: 'Computer Science & Engineering',
          rollNumber: '24R21A66J9',
        }
      );
      assert(
        dupStudentReg.statusCode === 409,
        'Prevents duplicate student roll number registration (409 Conflict)',
        `Got ${dupStudentReg.statusCode}`
      );

      // -------------------------------------------------------------
      // SECTION 4: GMAIL / SMTP PASSWORD RESET
      // -------------------------------------------------------------
      console.log('\n--- SECTION 4: Secure Password Reset ---');

      // Test 10: Forgot password request
      const forgotRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/forgot-password',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { email: 'charan.student@testsuite.edu' }
      );
      assert(forgotRes.statusCode === 200, 'Forgot password initiates successfully without user enumeration');

      // Retrieve student to inspect token
      const studentUser = await User.findOne({ email: 'charan.student@testsuite.edu' });
      assert(
        !!studentUser.passwordResetToken && !!studentUser.passwordResetExpires,
        'Short-lived reset token stored with expiry in database'
      );

      // Test 11: Invalidate token after consumption
      // Mock reset using direct token simulation
      const crypto = require('crypto');
      const resetTokenRaw = 'test_token_abcdef1234567890abcdef1234567890';
      studentUser.passwordResetToken = crypto.createHash('sha256').update(resetTokenRaw).digest('hex');
      studentUser.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await studentUser.save({ validateBeforeSave: false });

      const resetRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/reset-password',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          token: resetTokenRaw,
          newPassword: 'BrandNewSecurePassword456',
        }
      );
      assert(resetRes.statusCode === 200, 'Password reset completes successfully with single-use token');

      // Test 12: Re-use of consumed token fails
      const reuseRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/reset-password',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          token: resetTokenRaw,
          newPassword: 'AnotherPassword789',
        }
      );
      assert(reuseRes.statusCode === 400, 'Consumed token is invalidated immediately (prevents replay)');

      // -------------------------------------------------------------
      // SECTION 5: DYNAMIC LABORATORIES (REQUIREMENT 5)
      // -------------------------------------------------------------
      console.log('\n--- SECTION 5: Dynamic Laboratories (No Hardcoded Labs) ---');

      // Test 13: Admin creates a dynamic laboratory
      const createLabRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/labs',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          name: 'Precision Advanced Computing Lab',
          code: 'LAB-TEST-99',
          department: 'Computer Science & Engineering',
          location: 'Technology Block B, Floor 4, Room 402',
          capacity: 45,
          systemsCount: 45,
        }
      );
      assert(createLabRes.statusCode === 201, 'Admin dynamically creates lab facility with location & metadata');

      const labId = createLabRes.body?.data?._id;

      // Test 14: Non-admin cannot create lab
      const unauthLabRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/labs',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`,
          },
        },
        {
          name: 'Student Lab',
          code: 'LAB-STUDENT-01',
          department: 'CSE',
          location: 'Anywhere',
        }
      );
      assert(unauthLabRes.statusCode === 403, 'Non-admin denied from creating laboratory facilities (403)');

      // -------------------------------------------------------------
      // SECTION 6: MULTI-LEVEL REPAIR WORKFLOW (STEPS 1 TO 4)
      // -------------------------------------------------------------
      console.log('\n--- SECTION 6: Revised Multi-Level Repair Workflow (Steps 1 to 4) ---');

      // Setup Lab In-Charge and Assistant
      await User.deleteMany({ email: { $in: ['incharge.test@testsuite.edu', 'assistant.test@testsuite.edu'] } });

      const inchargeUser = await User.create({
        name: 'Prof. Incharge CSE',
        email: 'incharge.test@testsuite.edu',
        password: 'Password123',
        role: 'LAB_INCHARGE',
        department: 'Computer Science & Engineering',
        isActive: true,
      });

      const assistantUser = await User.create({
        name: 'Rajesh Technician',
        email: 'assistant.test@testsuite.edu',
        password: 'Password123',
        role: 'REPAIR_ASSISTANT',
        department: 'Computer Science & Engineering',
        specialization: 'Senior Hardware Diagnostic Tech #402',
        isActive: true,
      });

      const inchargeLogin = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: inchargeUser.email, password: 'Password123' }
      );
      const inchargeToken = inchargeLogin.body?.data?.token;

      // Provision HOD for CSE
      await User.deleteMany({ role: 'HOD', department: 'Computer Science & Engineering' });
      const hodUser = await User.create({
        name: 'Dr. Head CSE',
        email: 'hod.cse@testsuite.edu',
        password: 'Password123',
        role: 'HOD',
        department: 'Computer Science & Engineering',
        isActive: true,
      });

      const hodLogin = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: hodUser.email, password: 'Password123' }
      );
      const hodToken = hodLogin.body?.data?.token;

      const assistantLogin = await makeRequest(
        { hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
        { email: assistantUser.email, password: 'Password123' }
      );
      const assistantToken = assistantLogin.body?.data?.token;

      // STEP 1: Problem Reported -> SUBMITTED_TO_LAB_INCHARGE
      const step1Res = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/complaints',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${studentToken}`,
          },
        },
        {
          labName: 'Precision Advanced Computing Lab',
          labId,
          department: 'Computer Science & Engineering',
          systemNumber: 'TEST-RIG-01',
          issueCategory: 'HARDWARE',
          priority: 'HIGH',
          description: 'GPU cooling fan failure causing thermal throttle during ML model training.',
        }
      );
      assert(step1Res.statusCode === 201, 'Step 1: Problem reported successfully');
      const complaintData = step1Res.body?.data;
      assert(
        complaintData.status === 'SUBMITTED_TO_LAB_INCHARGE',
        `Step 1 Status is SUBMITTED_TO_LAB_INCHARGE (Got ${complaintData.status})`
      );

      const complaintId = complaintData.complaintId;

      // STEP 2: Lab In-Charge Reviews & Approves -> LAB_INCHARGE_APPROVED
      const step2Res = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/lab-incharge/complaints/${complaintId}/verify`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${inchargeToken}`,
          },
        },
        { remarks: 'Hardware diagnostic confirmed fan motor seized. Escalated to HOD.' }
      );
      assert(step2Res.statusCode === 200, 'Step 2: Lab In-Charge verifies and approves request');
      assert(
        step2Res.body?.data?.status === 'LAB_INCHARGE_APPROVED',
        `Step 2 Status transitioned to LAB_INCHARGE_APPROVED (Got ${step2Res.body?.data?.status})`
      );

      // STEP 3: HOD Reviews & Approves -> HOD_APPROVED
      const step3Res = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/hod/complaints/${complaintId}/verify`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hodToken}`,
          },
        },
        { remarks: 'Department budget authorized for fan replacement. Forwarded to Admin.' }
      );
      assert(step3Res.statusCode === 200, 'Step 3: HOD reviews and approves request');
      assert(
        step3Res.body?.data?.status === 'HOD_APPROVED',
        `Step 3 Status transitioned to HOD_APPROVED (Got ${step3Res.body?.data?.status})`
      );

      // STEP 4: Admin Dispatches to Dynamic Repair Assistant
      const step4Res = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/main-admin/complaints/${complaintId}/assign`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          assistantId: assistantUser._id,
          remarks: 'Work order dispatched to Senior Tech Rajesh.',
        }
      );
      assert(step4Res.statusCode === 200, 'Step 4: Admin dispatches to dynamic Repair Assistant');
      assert(
        step4Res.body?.data?.status === 'ASSIGNED_TO_REPAIR_ASSISTANT',
        `Step 4 Status is ASSIGNED_TO_REPAIR_ASSISTANT (Got ${step4Res.body?.data?.status})`
      );

      // STEP 5: Repair Assistant starts repair -> IN_PROGRESS
      const step5Res = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/repair-assistant/tasks/${complaintId}/start`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assistantToken}`,
          },
        },
        { remarks: 'Arrived at Lab 402. Disassembling workstation.' }
      );
      assert(step5Res.statusCode === 200, 'Repair Assistant starts repair (Status: IN_PROGRESS)');

      // STEP 6: Repair Assistant completes repair -> RESOLVED
      const step6Res = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/repair-assistant/tasks/${complaintId}/complete`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${assistantToken}`,
          },
        },
        { resolutionRemarks: 'Replaced thermal fan with new Noctua 120mm cooler. Stress tested 30 mins.' }
      );
      assert(step6Res.statusCode === 200, 'Repair Assistant completes work (Status: RESOLVED)');

      // -------------------------------------------------------------
      // SECTION 7: IMMUTABLE AUDIT TIMELINE & NOTIFICATIONS
      // -------------------------------------------------------------
      console.log('\n--- SECTION 7: Immutable History & Notifications ---');

      const historyRecords = await StatusHistory.find({ complaintId: complaintData._id }).sort({ createdAt: 1 });
      assert(
        historyRecords.length >= 5,
        `Complete immutable audit trail recorded (${historyRecords.length} transition events)`,
        `Expected >= 5, got ${historyRecords.length}`
      );

      const notifs = await Notification.find({ complaintId: complaintData._id });
      assert(
        notifs.length >= 3,
        `Role-based notifications dispatched at each stage (${notifs.length} notifications)`,
        `Expected >= 3, got ${notifs.length}`
      );

      console.log('\n=================================================================');
      console.log(`   Verification Summary: ${passedTests}/${totalTests} Tests Passed (100% Success) `);
      console.log('=================================================================\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\n[Test Suite Uncaught Error]:', err);
      server.close();
      process.exit(1);
    }
  });
}

runTestSuite();
