const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Student scans QR code and marks attendance
router.post('/scan', authenticateToken, requireRole('student'), attendanceController.scanAttendance);

// Student views their own attendance history
router.get('/my', authenticateToken, requireRole('student'), attendanceController.getMyAttendance);

// Dashboard summary statistics for teacher or student
router.get('/summary', authenticateToken, attendanceController.getAttendanceSummary);

module.exports = router;
