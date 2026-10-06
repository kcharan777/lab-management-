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

function makeRequest(options, postData = null) {
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

async function runEndToEndTests() {
  console.log('===============================================================');
  console.log('--- Starting Phase 14 Complete End-to-End Lifecycle Tests ---');
  console.log('===============================================================\n');

  await connectDB();

  const PORT = 5012;
  const server = app.listen(PORT, async () => {
    console.log(`[E2E Test Server] Running on port ${PORT}`);

    try {
      // 0. Clean up previous test artifacts
      await User.deleteMany({ email: /@e2etest\.edu$/ });
      await Complaint.deleteMany({ labName: /E2E/ });

      // ==============================================================
      // STEP 1: User Onboarding Across All 4 Roles
      // ==============================================================
      console.log('\n[Step 1]: Registering and authenticating all 4 roles...');

      // 1a. Student
      const studentRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Vikram Malhotra',
          email: 'vikram@e2etest.edu',
          password: 'Password123!',
          role: 'STUDENT',
          department: 'CSE',
        }
      );
      if (studentRes.statusCode !== 201) throw new Error(`Student registration failed: ${studentRes.statusCode}`);
      const studentToken = studentRes.body.data.token;
      const studentUser = studentRes.body.data.user;
      console.log(`✓ Student registered: ${studentUser.name} (${studentUser.email})`);

      // 1b. HOD
      const hodRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Dr. C. V. Raman',
          email: 'hod@e2etest.edu',
          password: 'Password123!',
          role: 'HOD',
          department: 'CSE',
        }
      );
      if (hodRes.statusCode !== 201) throw new Error(`HOD registration failed: ${hodRes.statusCode}`);
      const hodToken = hodRes.body.data.token;
      const hodUser = hodRes.body.data.user;
      console.log(`✓ HOD registered: ${hodUser.name} (${hodUser.department})`);

      // 1c. Lab Incharge
      const inchargeRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Prof. Ananya Sen',
          email: 'incharge@e2etest.edu',
          password: 'Password123!',
          role: 'LAB_INCHARGE',
          department: 'CSE',
        }
      );
      if (inchargeRes.statusCode !== 201) throw new Error(`Incharge registration failed: ${inchargeRes.statusCode}`);
      const inchargeToken = inchargeRes.body.data.token;
      const inchargeUser = inchargeRes.body.data.user;
      console.log(`✓ Lab Incharge registered: ${inchargeUser.name}`);

      // 1d. Main Admin
      const adminRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: '/api/auth/register',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          name: 'Chief Admin Rajesh M.',
          email: 'admin@e2etest.edu',
          password: 'Password123!',
          role: 'MAIN_ADMIN',
          department: 'Hardware Operations Cell',
        }
      );
      if (adminRes.statusCode !== 201) throw new Error(`Admin registration failed: ${adminRes.statusCode}`);
      const adminToken = adminRes.body.data.token;
      const adminUser = adminRes.body.data.user;
      console.log(`✓ Main Admin registered: ${adminUser.name}`);

      // ==============================================================
      // STEP 2: Student Raises Complaint with Image Evidence
      // ==============================================================
      console.log('\n[Step 2]: Student submits complaint with hardware fault details...');
      const createComplaintRes = await makeRequest(
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
          labName: 'E2E Advanced AI & Supercomputing Lab',
          systemNumber: 'NODE-E2E-07',
          issueCategory: 'HARDWARE',
          priority: 'CRITICAL',
          description: 'NVIDIA RTX 4090 GPU thermal throttling and severe VRAM artifacting during deep learning benchmark.',
          imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.png',
        }
      );

      if (createComplaintRes.statusCode !== 201) {
        throw new Error(`Failed to submit complaint: ${createComplaintRes.statusCode}`);
      }
      const complaint1 = createComplaintRes.body.data;
      console.log(`✓ Complaint successfully created: ${complaint1.complaintId}`);
      console.log(`  Initial Status: ${complaint1.status}`);

      // Verify Initial StatusHistory
      const initialHistory = await StatusHistory.find({ complaintId: complaint1._id });
      if (initialHistory.length === 0) throw new Error('Initial StatusHistory not recorded');
      console.log(`✓ Audit History record verified: ${initialHistory[0].status}`);

      // ==============================================================
      // STEP 3: HOD Verification Queue & Approval
      // ==============================================================
      console.log('\n[Step 3]: HOD checks queue and verifies grievance...');

      // 3a. HOD fetches pending queue
      const hodQueueRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/hod/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${hodToken}` },
      });
      if (hodQueueRes.statusCode !== 200) throw new Error('HOD queue fetch failed');
      const pendingList = hodQueueRes.body.data.complaints;
      const foundInHod = pendingList.find(c => c.complaintId === complaint1.complaintId);
      if (!foundInHod) throw new Error('Complaint not visible in HOD pending queue');
      console.log(`✓ Complaint ${complaint1.complaintId} visible in HOD queue (${pendingList.length} items total)`);

      // 3b. HOD approves complaint
      const hodVerifyRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/hod/complaints/${complaint1.complaintId}/verify`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hodToken}`,
          },
        },
        {
          remarks: 'Tier 2 Faculty Approval: Workstation verified for critical Capstone thesis project.',
        }
      );
      if (hodVerifyRes.statusCode !== 200) throw new Error(`HOD verification failed: ${hodVerifyRes.statusCode}`);
      console.log(`✓ HOD verified complaint. New Status: ${hodVerifyRes.body.data.status}`);
      if (hodVerifyRes.body.data.status !== 'LAB_INCHARGE_VERIFICATION') {
        throw new Error(`Expected LAB_INCHARGE_VERIFICATION, got ${hodVerifyRes.body.data.status}`);
      }

      // ==============================================================
      // STEP 4: Lab Incharge Technical Verification & Admin Escalation
      // ==============================================================
      console.log('\n[Step 4]: Lab Incharge diagnoses hardware and approves for Admin triage...');

      // 4a. Incharge fetches pending queue
      const inchargeQueueRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/lab-incharge/complaints/pending',
        method: 'GET',
        headers: { Authorization: `Bearer ${inchargeToken}` },
      });
      if (inchargeQueueRes.statusCode !== 200) throw new Error('Incharge queue fetch failed');
      const inchargeList = inchargeQueueRes.body.data.complaints;
      const foundInIncharge = inchargeList.find(c => c.complaintId === complaint1.complaintId);
      if (!foundInIncharge) throw new Error('Complaint not visible in Incharge queue');
      console.log(`✓ Complaint ${complaint1.complaintId} visible in Incharge queue`);

      // 4b. Incharge verifies and escalates
      const inchargeVerifyRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/lab-incharge/complaints/${complaint1.complaintId}/verify`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${inchargeToken}`,
          },
        },
        {
          remarks: 'Tier 3 Diagnostics confirmed: GPU thermal sensor damaged. Requisition replacement to Main Admin.',
        }
      );
      if (inchargeVerifyRes.statusCode !== 200) throw new Error(`Incharge verification failed: ${inchargeVerifyRes.statusCode}`);
      console.log(`✓ Incharge verified. Escalated to: ${inchargeVerifyRes.body.data.status}`);
      if (inchargeVerifyRes.body.data.status !== 'ASSIGNED_TO_MAIN_ADMIN') {
        throw new Error(`Expected ASSIGNED_TO_MAIN_ADMIN, got ${inchargeVerifyRes.body.data.status}`);
      }

      // ==============================================================
      // STEP 5: Main Admin Operations: Accept, Progress, Resolve
      // ==============================================================
      console.log('\n[Step 5]: Main Admin triage matrix, work order dispatch, diagnostic log, & resolution...');

      // 5a. Admin gets Kanban
      const adminKanbanRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/main-admin/complaints',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (adminKanbanRes.statusCode !== 200) throw new Error('Admin Kanban fetch failed');
      const intakeList = adminKanbanRes.body.data.kanban.intake;
      const foundInIntake = intakeList.find(c => c.complaintId === complaint1.complaintId);
      if (!foundInIntake) throw new Error('Complaint not in Admin intake Kanban');
      console.log(`✓ Complaint present in Admin Kanban Intake column`);

      // 5b. Admin accepts & assigns technician
      const acceptRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/main-admin/complaints/${complaint1.complaintId}/accept`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          technicianAssigned: 'Rajesh M. - Senior Hardware Specialist (Badge #ENG-402)',
          remarks: 'Dispatched spare RTX 4090 card from Central Store Bin B-14.',
        }
      );
      if (acceptRes.statusCode !== 200) throw new Error(`Admin accept failed: ${acceptRes.statusCode}`);
      console.log(`✓ Admin accepted work order. Status: ${acceptRes.body.data.status}`);
      if (acceptRes.body.data.status !== 'ACCEPTED') {
        throw new Error(`Expected ACCEPTED, got ${acceptRes.body.data.status}`);
      }

      // 5c. Admin records diagnostic progress
      const progressRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/main-admin/complaints/${complaint1.complaintId}/progress`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          note: 'Swapped GPU with spare module. Clean FurMark stress test @ 65°C for 30 minutes.',
        }
      );
      if (progressRes.statusCode !== 200) throw new Error(`Admin progress update failed: ${progressRes.statusCode}`);
      console.log(`✓ Diagnostic progress logged. Status: ${progressRes.body.data.status}`);
      if (progressRes.body.data.status !== 'IN_PROGRESS') {
        throw new Error(`Expected IN_PROGRESS, got ${progressRes.body.data.status}`);
      }

      // 5d. Admin resolves & archives work order
      const resolveRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/main-admin/complaints/${complaint1.complaintId}/resolve`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
        },
        {
          resolutionRemarks: 'Hardware replacement certified 100%. Node returned to active cluster service.',
          closeImmediately: true,
        }
      );
      if (resolveRes.statusCode !== 200) throw new Error(`Admin resolve failed: ${resolveRes.statusCode}`);
      console.log(`✓ Work order certified & resolved. Final Status: ${resolveRes.body.data.status}`);
      if (resolveRes.body.data.status !== 'CLOSED') {
        throw new Error(`Expected CLOSED, got ${resolveRes.body.data.status}`);
      }

      // ==============================================================
      // STEP 6: Student Timeline & Notification Verification
      // ==============================================================
      console.log('\n[Step 6]: Verifying Student timeline telemetry and push notifications...');

      // 6a. Student checks complaint tracking
      const studentTrackRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/complaints/${complaint1.complaintId}`,
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (studentTrackRes.statusCode !== 200) throw new Error('Student complaint fetch failed');
      const finalComplaint = studentTrackRes.body.data.complaint;
      const history = studentTrackRes.body.data.history;

      console.log(`✓ Student accessed finalized complaint record:`);
      console.log(`  - Status: ${finalComplaint.status}`);
      console.log(`  - Assigned Technician: ${finalComplaint.mainAdminAction?.technicianAssigned}`);
      console.log(`  - Resolution Remarks: ${finalComplaint.resolutionRemarks}`);
      console.log(`  - Total Audit Milestones Recorded: ${history.length}`);
      if (history.length < 5) throw new Error('Expected at least 5 audit history milestones');

      // 6b. Student checks notifications
      const notifRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/notifications',
        method: 'GET',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (notifRes.statusCode !== 200) throw new Error('Student notification fetch failed');
      const notifications = notifRes.body.data.notifications;
      console.log(`✓ Student received ${notifications.length} automated push notifications during lifecycle:`);
      notifications.forEach((n, idx) => {
        console.log(`    ${idx + 1}. [${n.type}] ${n.title} - ${n.message}`);
      });
      if (notifications.length < 4) throw new Error('Expected at least 4 notifications throughout lifecycle');

      // ==============================================================
      // STEP 7: Alternative Rejection Lifecycle Branch
      // ==============================================================
      console.log('\n[Step 7]: Testing alternative rejection lifecycle (HOD Rejection Branch)...');

      // 7a. Student submits second complaint
      const rejectComplaintRes = await makeRequest(
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
          labName: 'E2E Robotics Lab',
          systemNumber: 'ROBOT-01',
          issueCategory: 'SOFTWARE',
          priority: 'LOW',
          description: 'Minor desktop icon layout issue on Ubuntu desktop.',
        }
      );
      const complaint2 = rejectComplaintRes.body.data;
      console.log(`✓ Second complaint submitted: ${complaint2.complaintId}`);

      // 7b. HOD rejects it with mandatory reason
      const hodRejectRes = await makeRequest(
        {
          hostname: 'localhost',
          port: PORT,
          path: `/api/hod/complaints/${complaint2.complaintId}/reject`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${hodToken}`,
          },
        },
        {
          remarks: 'Non-technical grievance. Desktop customization is configurable directly by student.',
        }
      );
      if (hodRejectRes.statusCode !== 200) throw new Error(`HOD rejection failed: ${hodRejectRes.statusCode}`);
      console.log(`✓ Complaint successfully rejected. Status: ${hodRejectRes.body.data.status}`);
      if (hodRejectRes.body.data.status !== 'REJECTED') {
        throw new Error(`Expected REJECTED, got ${hodRejectRes.body.data.status}`);
      }

      console.log('\n===============================================================');
      console.log('--- ALL PHASE 14 END-TO-END LIFECYCLE TESTS PASSED 100%! ---');
      console.log('===============================================================\n');

      server.close();
      process.exit(0);
    } catch (err) {
      console.error('\nE2E TEST FAILED:', err);
      server.close();
      process.exit(1);
    }
  });
}

runEndToEndTests();
