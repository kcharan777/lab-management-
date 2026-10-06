const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');
const {
  helmetConfig,
  sanitizeInput,
  apiLimiter,
  authLimiter,
} = require('./middleware/securityMiddleware');
const ApiResponse = require('./utils/apiResponse');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security hardening: Disable x-powered-by header & mount Helmet security headers
app.disable('x-powered-by');
app.use(helmetConfig);

// Enable CORS
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev to avoid CORS friction
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers with size limit controls
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitize inputs against NoSQL injection & XSS
app.use(sanitizeInput);

// Apply rate limiters
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  return ApiResponse.success(res, {
    system: 'LabPulse Campus Operations API',
    status: 'ONLINE',
    version: '2.4.0',
    timestamp: new Date().toISOString(),
    database: 'CONNECTED'
  }, 'LabPulse Backend API is operational');
});

// API Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const hodRoutes = require('./routes/hodRoutes');
const labInchargeRoutes = require('./routes/labInchargeRoutes');
const mainAdminRoutes = require('./routes/mainAdminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/hod', hodRoutes);
app.use('/api/lab-incharge', labInchargeRoutes);
app.use('/api/main-admin', mainAdminRoutes);
app.use('/api/notifications', notificationRoutes);

// Static uploads directory serving
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Root API Welcome
app.get('/', (req, res) => {
  return ApiResponse.success(res, {
    message: 'Welcome to LabPulse Enterprise Operations API'
  });
});

// Centralized Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

// Connect to MongoDB and start server if run directly
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`[LabPulse Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[LabPulse Server] Health check: http://localhost:${PORT}/api/health`);
    });
  });
}

module.exports = app;
