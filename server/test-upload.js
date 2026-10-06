const http = require('http');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = require('./src/config/db');
const app = require('./src/server');
const { User } = require('./src/models');
const { generateToken } = require('./src/utils/token');

// Helper to construct multipart/form-data payload
function createMultipartPayload(boundary, fieldName, filename, mimeType, fileBuffer) {
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([head, fileBuffer, tail]);
}

function sendMultipartRequest(options, payload) {
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
    req.write(payload);
    req.end();
  });
}

async function runUploadTests() {
  console.log('--- Starting Phase 6 Image Upload Tests ---');
  await connectDB();

  const PORT = 5005;
  const server = app.listen(PORT, async () => {
    console.log(`[Upload Test Server] Running on port ${PORT}`);

    try {
      // Create test user
      await User.deleteMany({ email: /@uploadtest\.edu$/ });
      const testUser = await User.create({
        name: 'Upload Tester',
        email: 'tester@uploadtest.edu',
        password: 'Password123!',
        role: 'STUDENT',
        department: 'CSE',
      });
      const token = generateToken(testUser._id, testUser.role);

      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';

      // TEST 1: Valid PNG image upload
      console.log('\n[Test 1]: Valid PNG image upload');
      // 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
      );
      const validPayload = createMultipartPayload(
        boundary,
        'image',
        'defect_evidence.png',
        'image/png',
        pngBuffer
      );

      const res1 = await sendMultipartRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${token}`,
          'Content-Length': validPayload.length,
        },
      }, validPayload);

      console.log(`Status: ${res1.statusCode}`);
      if (res1.statusCode !== 200 || !res1.body.success || !res1.body.data.imageUrl) {
        throw new Error(`Upload failed: ${JSON.stringify(res1.body)}`);
      }
      console.log(`✓ Valid image upload succeeded. Image URL: ${res1.body.data.imageUrl}`);

      // TEST 2: Invalid file type (.txt file)
      console.log('\n[Test 2]: Invalid file type upload (.txt document)');
      const textBuffer = Buffer.from('This is a text document, not an image.');
      const invalidPayload = createMultipartPayload(
        boundary,
        'image',
        'report.txt',
        'text/plain',
        textBuffer
      );

      const res2 = await sendMultipartRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${token}`,
          'Content-Length': invalidPayload.length,
        },
      }, invalidPayload);

      console.log(`Status: ${res2.statusCode}`);
      if (res2.statusCode !== 400 || res2.body.success) {
        throw new Error(`Expected 400 for invalid file type, got: ${res2.statusCode}`);
      }
      console.log('✓ Invalid file type successfully rejected with 400 Bad Request.');

      // TEST 3: Oversized file (> 5MB)
      console.log('\n[Test 3]: Oversized file upload (> 5MB limit)');
      // 5.5 MB dummy buffer
      const oversizedBuffer = Buffer.alloc(5.5 * 1024 * 1024);
      const oversizedPayload = createMultipartPayload(
        boundary,
        'image',
        'huge_scan.png',
        'image/png',
        oversizedBuffer
      );

      const res3 = await sendMultipartRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Authorization': `Bearer ${token}`,
          'Content-Length': oversizedPayload.length,
        },
      }, oversizedPayload);

      console.log(`Status: ${res3.statusCode}`);
      if (res3.statusCode !== 400 || res3.body.success) {
        throw new Error(`Expected 400 for oversized file, got: ${res3.statusCode}`);
      }
      console.log('✓ Oversized file (>5MB) rejected with 400 Bad Request.');

      // TEST 4: Unauthorized upload (No token)
      console.log('\n[Test 4]: Unauthorized upload without token');
      const res4 = await sendMultipartRequest({
        hostname: 'localhost',
        port: PORT,
        path: '/api/upload',
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': validPayload.length,
        },
      }, validPayload);

      console.log(`Status: ${res4.statusCode}`);
      if (res4.statusCode !== 401 || res4.body.success) {
        throw new Error(`Expected 401 for unauthorized upload, got: ${res4.statusCode}`);
      }
      console.log('✓ Unauthorized upload blocked with 401.');

      // Cleanup
      await User.deleteMany({ email: /@uploadtest\.edu$/ });

      console.log('\n--- ALL PHASE 6 IMAGE UPLOAD TESTS PASSED SUCCESSFULLY! ---');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\nUPLOAD TEST ERROR:', err);
      server.close(() => process.exit(1));
    }
  });
}

runUploadTests();
