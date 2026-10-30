const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// CORS configuration
// CLIENT_URL accepts a comma-separated list of allowed origins.
// Requests from the same origin (single-domain deployment), Vercel preview
// deployments, and non-browser clients are always allowed.
const parseOriginList = (value) =>
  (value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

const configuredOrigins = parseOriginList(process.env.CLIENT_URL || 'http://localhost:5173');

const isAllowedOrigin = (origin, req) => {
  if (!origin) return true;
  if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) return true;

  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  if (host && origin === `${protocol}://${host}`) return true;

  if (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`) return true;

  return false;
};

app.use((req, res, next) => {
  cors({
    origin: isAllowedOrigin(req.headers.origin, req) ? req.headers.origin || false : false,
    credentials: true,
  })(req, res, next);
});

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler for unmapped routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
