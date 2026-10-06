const http = require('http');
const connectDB = require('./src/config/db');
const app = require('./src/server');
const { User } = require('./src/models');

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

async function runAuthTests() {
  console.log('--- Starting Phase 3 Authentication Tests ---');
  await connectDB();

  const PORT = 5002;
  const server = app.listen(PORT, async () => {
    console.log(`[Test Server] Running on port ${PORT}`);

    try {
      // Clean up previous test users
      await User.deleteMany({ email: /@authtest\.edu$/ });

      const testUser = {
        name: 'Priya Nambiar',
        email: 'priya.nambiar@authtest.edu',
        password: 'ValidPassword123!',
        role: 'STUDENT',
        department: 'Electronics & Communication',
      };

      // TEST 1: Register valid user
      console.log('\n[Test 1]: POST /api/auth/register (Valid user)');
      const regRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, testUser);

      console.log(`Status: ${regRes.statusCode}`);
      if (regRes.statusCode !== 201 || !regRes.body.success || !regRes.body.data.token) {
        throw new Error(`Register failed: ${JSON.stringify(regRes.body)}`);
      }
      if (regRes.body.data.user.password) {
        throw new Error('Security Violation: Password leaked in registration response!');
      }
      console.log('✓ Successfully registered. Token received. Password omitted from response.');
      const receivedToken = regRes.body.data.token;

      // TEST 2: Duplicate registration
      console.log('\n[Test 2]: POST /api/auth/register (Duplicate email)');
      const dupRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, testUser);

      console.log(`Status: ${dupRes.statusCode}`);
      if (dupRes.statusCode !== 409 || dupRes.body.success) {
        throw new Error(`Expected 409 for duplicate registration, got: ${dupRes.statusCode}`);
      }
      console.log('✓ Duplicate registration correctly rejected with 409 Conflict.');

      // TEST 3: Short password
      console.log('\n[Test 3]: POST /api/auth/register (Short password)');
      const shortPassRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, {
        ...testUser,
        email: 'shortpass@authtest.edu',
        password: '123',
      });

      console.log(`Status: ${shortPassRes.statusCode}`);
      if (shortPassRes.statusCode !== 400 || shortPassRes.body.success) {
        throw new Error(`Expected 400 for short password, got: ${shortPassRes.statusCode}`);
      }
      console.log('✓ Short password rejected with 400.');

      // TEST 4: Login with valid credentials
      console.log('\n[Test 4]: POST /api/auth/login (Valid credentials)');
      const loginRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, {
        email: testUser.email,
        password: testUser.password,
      });

      console.log(`Status: ${loginRes.statusCode}`);
      if (loginRes.statusCode !== 200 || !loginRes.body.success || !loginRes.body.data.token) {
        throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
      }
      if (loginRes.body.data.user.password) {
        throw new Error('Security Violation: Password leaked in login response!');
      }
      console.log('✓ Login succeeded. Auth token issued.');

      // TEST 5: Login with wrong password
      console.log('\n[Test 5]: POST /api/auth/login (Invalid password)');
      const wrongPassRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, {
        email: testUser.email,
        password: 'IncorrectPassword999!',
      });

      console.log(`Status: ${wrongPassRes.statusCode}`);
      if (wrongPassRes.statusCode !== 401 || wrongPassRes.body.success) {
        throw new Error(`Expected 401 for wrong password, got: ${wrongPassRes.statusCode}`);
      }
      console.log('✓ Wrong password rejected with 401 Unauthorized.');

      // TEST 6: GET /api/auth/me with valid Bearer token
      console.log('\n[Test 6]: GET /api/auth/me (Valid token)');
      const meRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${receivedToken}`,
        },
      });

      console.log(`Status: ${meRes.statusCode}`);
      if (meRes.statusCode !== 200 || !meRes.body.success || meRes.body.data.email !== testUser.email) {
        throw new Error(`GET /me failed: ${JSON.stringify(meRes.body)}`);
      }
      console.log(`✓ GET /me succeeded for user ${meRes.body.data.name} (${meRes.body.data.role}).`);

      // TEST 7: GET /api/auth/me with invalid token
      console.log('\n[Test 7]: GET /api/auth/me (Invalid token)');
      const badTokenRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer totally.invalid.token.here',
        },
      });

      console.log(`Status: ${badTokenRes.statusCode}`);
      if (badTokenRes.statusCode !== 401 || badTokenRes.body.success) {
        throw new Error(`Expected 401 for invalid token, got: ${badTokenRes.statusCode}`);
      }
      console.log('✓ Invalid token rejected with 401 Unauthorized.');

      // TEST 8: GET /api/auth/me with no token
      console.log('\n[Test 8]: GET /api/auth/me (No token)');
      const noTokenRes = await makeRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/me',
        method: 'GET',
      });

      console.log(`Status: ${noTokenRes.statusCode}`);
      if (noTokenRes.statusCode !== 401 || noTokenRes.body.success) {
        throw new Error(`Expected 401 for missing token, got: ${noTokenRes.statusCode}`);
      }
      console.log('✓ Missing token rejected with 401 Unauthorized.');

      // Cleanup
      await User.deleteMany({ email: /@authtest\.edu$/ });

      console.log('\n--- ALL PHASE 3 AUTHENTICATION TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nAUTH TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runAuthTests();
