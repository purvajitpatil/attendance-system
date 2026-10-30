const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Teacher attendance report JSON data with filters
router.get('/', authenticateToken, requireRole('teacher'), reportController.getReports);

// Export attendance report as CSV file
router.get('/csv', authenticateToken, requireRole('teacher'), reportController.exportReportsCsv);

module.exports = router;
