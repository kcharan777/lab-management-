const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./src/server');
const { User, Notification } = require('./src/models');
const { generateToken } = require('./src/utils/token');
const { notifyUser } = require('./src/services/notificationService');

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

async function runNotificationTests() {
  console.log('--- Starting Phase 11 Notification Tests ---');
  await connectDB();

  const PORT = 5010;
  const server = app.listen(PORT, async () => {
    console.log(`[Notification Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test users and notifications
      await User.deleteMany({ email: /@notiftest\.edu$/ });
      await Notification.deleteMany({ title: /Test Alert/ });

      // Create test user 1
      const user1 = await User.create({
        name: 'Alert User 1',
        email: 'user1@notiftest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'CSE',
      });

      // Create test user 2
      const user2 = await User.create({
        name: 'Alert User 2',
        email: 'user2@notiftest.edu',
        password: 'Password123!',
        role: 'HOD',
        department: 'CSE',
      });

      const user1Token = generateToken(user1._id, user1.role);
      const user2Token = generateToken(user2._id, user2.role);

      // Create 2 test notifications for User 1 using real service
      await notifyUser({
        recipient: user1._id,
        title: 'Test Alert 1: HOD Verification',
        message: 'Your complaint has been verified by the department HOD.',
        type: 'STATUS_UPDATE',
      });

      await notifyUser({
        recipient: user1._id,
        title: 'Test Alert 2: Repair In Progress',
        message: 'Replacement parts have been allocated by Main Admin.',
        type: 'STATUS_UPDATE',
      });

      // TEST 1: GET /api/notifications
      console.log('\n[Test 1]: Fetch user notifications');
      const getRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/notifications',
        method: 'GET',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      if (getRes.statusCode !== 200 || !getRes.body.success) {
        throw new Error(`Fetch failed: ${JSON.stringify(getRes.body)}`);
      }
      const { notifications, unreadCount, total } = getRes.body.data;
      if (unreadCount !== 2 || total !== 2) {
        throw new Error(`Expected unreadCount=2, total=2, got: ${unreadCount}, ${total}`);
      }
      console.log(`✓ Retrieved ${total} notifications with unreadCount = ${unreadCount}.`);

      const targetNotification = notifications[0];

      // TEST 2: PATCH /api/notifications/:id/read on single notification
      console.log('\n[Test 2]: Mark single notification as read');
      const readRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/notifications/${targetNotification._id}/read`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      if (readRes.statusCode !== 200 || !readRes.body.success || !readRes.body.data.isRead) {
        throw new Error(`Mark read failed: ${JSON.stringify(readRes.body)}`);
      }
      console.log('✓ Successfully marked notification as read.');

      // Check that unreadCount is now 1
      const getRes2 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/notifications',
        method: 'GET',
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      if (getRes2.body.data.unreadCount !== 1) {
        throw new Error(`Expected unreadCount=1, got ${getRes2.body.data.unreadCount}`);
      }
      console.log('✓ Verified unread count decremented to 1.');

      // TEST 3: User 2 attempting to mark User 1 notification as read (Unauthorized)
      console.log('\n[Test 3]: User 2 attempting to mark User 1 notification as read');
      const unauthReadRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: `/api/notifications/${targetNotification._id}/read`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      if (unauthReadRes.statusCode !== 404) {
        throw new Error(`Expected 404 for accessing another user's alert, got: ${unauthReadRes.statusCode}`);
      }
      console.log('✓ Cross-user notification manipulation blocked with 404.');

      // TEST 4: PATCH /api/notifications/read-all
      console.log('\n[Test 4]: Mark all notifications as read');
      const readAllRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/notifications/read-all',
        method: 'PATCH',
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      if (readAllRes.statusCode !== 200 || !readAllRes.body.success) {
        throw new Error(`Read all failed: ${JSON.stringify(readAllRes.body)}`);
      }

      // Verify unread count is now 0
      const getRes3 = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/notifications',
        method: 'GET',
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      if (getRes3.body.data.unreadCount !== 0) {
        throw new Error(`Expected unreadCount=0, got ${getRes3.body.data.unreadCount}`);
      }
      console.log('✓ Verified all notifications marked as read (unreadCount = 0).');

      // TEST 5: Unauthorized request without token -> 401
      console.log('\n[Test 5]: Unauthorized notifications request without token');
      const noTokenRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/notifications',
        method: 'GET',
      });
      if (noTokenRes.statusCode !== 401) {
        throw new Error(`Expected 401, got ${noTokenRes.statusCode}`);
      }
      console.log('✓ Request without token blocked with 401 Unauthorized.');

      // Cleanup
      await User.deleteMany({ email: /@notiftest\.edu$/ });
      await Notification.deleteMany({ title: /Test Alert/ });

      console.log('\n--- ALL PHASE 11 NOTIFICATION TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nNOTIFICATION TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runNotificationTests();
