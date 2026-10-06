const http = require('http');
const connectDB = require('./src/config/db');
const app = require('./src/server');

async function testHealth() {
  console.log('[Test] Connecting to Database...');
  await connectDB();

  const server = app.listen(5001, () => {
    console.log('[Test] Server listening on port 5001 for health check');

    http.get('http://localhost:5001/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[Test Response Status]: ${res.statusCode}`);
        console.log(`[Test Response Body]: ${data}`);
        const parsed = JSON.parse(data);
        if (parsed.success && parsed.data.status === 'ONLINE') {
          console.log('[Test Result]: SUCCESS! Health check passed.');
          server.close(() => process.exit(0));
        } else {
          console.error('[Test Result]: FAILED! Unexpected payload.');
          server.close(() => process.exit(1));
        }
      });
    }).on('error', (err) => {
      console.error('[Test Error]:', err);
      server.close(() => process.exit(1));
    });
  });
}

testHealth();
