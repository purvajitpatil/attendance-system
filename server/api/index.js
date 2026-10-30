/**
 * Vercel serverless entry point.
 *
 * Vercel invokes this function for every request under /api/*.
 * The Express app already mounts its routes under /api/..., so it can be
 * handed the raw request (Vercel keeps the original URL).
 */
const app = require('../src/app');
const connectDB = require('../src/config/db');

let connectionPromise = null;

const ensureConnection = () => {
  if (!connectionPromise) {
    connectionPromise = connectDB().catch((error) => {
      // Allow the next request to retry instead of caching a rejected promise.
      connectionPromise = null;
      throw error;
    });
  }
  return connectionPromise;
};

module.exports = async (req, res) => {
  // Health checks must answer even when the database is unreachable.
  const isHealthCheck = req.url.split('?')[0] === '/api/health';

  if (!isHealthCheck) {
    try {
      await ensureConnection();
    } catch (error) {
      res.status(503).json({
        success: false,
        message: 'Database unavailable. Please try again shortly.',
        detail: error.message,
      });
      return;
    }
  }

  return app(req, res);
};
