/**
 * Vercel serverless entry point for the whole API.
 *
 * Vercel Functions have no catch-all routes outside Next.js, so `vercel.json`
 * rewrites every /api/:path* request to /api/index/:path* and this wrapper
 * strips that prefix again, letting the Express app see its normal paths.
 */
const app = require('../src/app');
const connectDB = require('../src/config/db');

const REWRITE_PREFIX = '/api/index';

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

const restoreOriginalUrl = (req) => {
  const url = req.url || '/';
  if (url === REWRITE_PREFIX || url.startsWith(`${REWRITE_PREFIX}?`)) {
    req.url = '/api' + url.slice(REWRITE_PREFIX.length);
  } else if (url.startsWith(`${REWRITE_PREFIX}/`)) {
    req.url = '/api' + url.slice(REWRITE_PREFIX.length);
  }
};

module.exports = async (req, res) => {
  restoreOriginalUrl(req);

  // Health checks must answer even when the database is unreachable.
  const isHealthCheck = req.url.split('?')[0] === '/api/health';

  if (!isHealthCheck) {
    if (!process.env.MONGODB_URI) {
      res.status(503).json({
        success: false,
        message: 'Server is not configured: the MONGODB_URI environment variable is missing.',
      });
      return;
    }

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

module.exports.restoreOriginalUrl = restoreOriginalUrl;
