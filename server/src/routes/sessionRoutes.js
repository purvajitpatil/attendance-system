const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Create attendance session (Teacher only)
router.post('/', authenticateToken, requireRole('teacher'), sessionController.createSession);

// List sessions accessible to current user
router.get('/', authenticateToken, sessionController.getSessions);

// Get single session details
router.get('/:id', authenticateToken, sessionController.getSessionById);

// Start attendance session and generate initial QR token (Teacher only)
router.post('/:id/start', authenticateToken, requireRole('teacher'), sessionController.startSession);

// Refresh or replace an expired QR token (Teacher only)
router.post('/:id/refresh-qr', authenticateToken, requireRole('teacher'), sessionController.refreshQrToken);

// End an active session (Teacher only)
router.post('/:id/end', authenticateToken, requireRole('teacher'), sessionController.endSession);

// Return current QR token only to authorized teacher
router.get('/:id/current-qr', authenticateToken, requireRole('teacher'), sessionController.getCurrentQr);

// Return attendance records for session (Teacher only)
router.get('/:id/attendance', authenticateToken, requireRole('teacher'), sessionController.getSessionAttendance);

module.exports = router;
