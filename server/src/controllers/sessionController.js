const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');
const QrService = require('../services/qrService');

// In-memory cache for currently active raw tokens (never stored in DB)
// Map<sessionIdString, { token: string, expiresAt: Date }>
const activeSessionTokens = new Map();

/**
 * Helper to generate and persist a new QR token for a session
 */
const rotateSessionToken = async (session) => {
  const { token, tokenHash, expiresAt } = QrService.generateTokenPair();
  session.currentQrTokenHash = tokenHash;
  session.qrExpiresAt = expiresAt;
  await session.save();

  activeSessionTokens.set(session._id.toString(), {
    token,
    expiresAt,
  });

  return { token, expiresAt };
};

/**
 * Teacher creates a new attendance session
 */
const createSession = async (req, res, next) => {
  try {
    const { subject, className } = req.body;

    if (!subject || subject.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Subject name cannot be empty.',
      });
    }

    if (!className || className.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Class name cannot be empty.',
      });
    }

    const session = await AttendanceSession.create({
      subject: subject.trim(),
      className: className.trim(),
      teacherId: req.user.id,
      status: 'active',
    });

    // Generate initial QR token
    const { token, expiresAt } = await rotateSessionToken(session);

    return res.status(201).json({
      success: true,
      message: 'Attendance session created successfully.',
      session: {
        id: session._id,
        subject: session.subject,
        className: session.className,
        teacherId: session.teacherId,
        status: session.status,
        qrExpiresAt: session.qrExpiresAt,
        createdAt: session.createdAt,
      },
      token,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List attendance sessions
 * For teachers: only sessions owned by this teacher
 * For students: all available sessions
 */
const getSessions = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    }

    const sessions = await AttendanceSession.find(query)
      .populate('teacherId', 'name email')
      .sort({ createdAt: -1 });

    // Attach student attendance counts
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (sess) => {
        const attendanceCount = await AttendanceRecord.countDocuments({ sessionId: sess._id });
        return {
          id: sess._id,
          subject: sess.subject,
          className: sess.className,
          status: sess.status,
          teacherName: sess.teacherId ? sess.teacherId.name : 'Unknown',
          createdAt: sess.createdAt,
          endedAt: sess.endedAt,
          attendanceCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      sessions: sessionsWithCounts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single session details
 */
const getSessionById = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id).populate('teacherId', 'name email');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    // Role security: If teacher, must be the owner
    if (req.user.role === 'teacher' && session.teacherId._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to view sessions owned by another teacher.',
      });
    }

    const attendanceCount = await AttendanceRecord.countDocuments({ sessionId: session._id });

    return res.status(200).json({
      success: true,
      session: {
        id: session._id,
        subject: session.subject,
        className: session.className,
        status: session.status,
        teacherId: session.teacherId._id,
        teacherName: session.teacherId.name,
        createdAt: session.createdAt,
        endedAt: session.endedAt,
        attendanceCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start or restart an attendance session and generate initial QR
 */
const startSession = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot manage sessions owned by another teacher.',
      });
    }

    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot start an attendance session that has already ended.',
      });
    }

    session.status = 'active';
    const { token, expiresAt } = await rotateSessionToken(session);

    return res.status(200).json({
      success: true,
      message: 'Attendance session started.',
      token,
      expiresAt,
      session: {
        id: session._id,
        subject: session.subject,
        className: session.className,
        status: session.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh QR token for active session
 */
const refreshQrToken = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot manage sessions owned by another teacher.',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refresh QR code for a non-active session.',
      });
    }

    const { token, expiresAt } = await rotateSessionToken(session);

    return res.status(200).json({
      success: true,
      message: 'QR token refreshed successfully.',
      token,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current QR code token for display (Only authorized teacher)
 */
const getCurrentQr = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot access QR tokens for sessions owned by another teacher.',
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'This attendance session is not active.',
      });
    }

    const cached = activeSessionTokens.get(session._id.toString());
    const attendanceCount = await AttendanceRecord.countDocuments({ sessionId: session._id });

    // If token exists in memory, matches hash, and has not expired, return it
    if (cached && !QrService.isExpired(cached.expiresAt) && QrService.hashToken(cached.token) === session.currentQrTokenHash) {
      return res.status(200).json({
        success: true,
        sessionId: session._id,
        token: cached.token,
        expiresAt: cached.expiresAt,
        attendanceCount,
      });
    }

    // Otherwise, generate a fresh replacement token and persist hash
    const { token, expiresAt } = await rotateSessionToken(session);

    return res.status(200).json({
      success: true,
      sessionId: session._id,
      token,
      expiresAt,
      attendanceCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * End an attendance session
 */
const endSession = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot manage sessions owned by another teacher.',
      });
    }

    session.status = 'ended';
    session.endedAt = new Date();
    session.currentQrTokenHash = null;
    session.qrExpiresAt = null;
    await session.save();

    // Remove from active cache
    activeSessionTokens.delete(session._id.toString());

    return res.status(200).json({
      success: true,
      message: 'Attendance session ended successfully.',
      session: {
        id: session._id,
        status: session.status,
        endedAt: session.endedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get attendance records for a specific session
 */
const getSessionAttendance = async (req, res, next) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    if (session.teacherId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You cannot view attendance for sessions owned by another teacher.',
      });
    }

    const records = await AttendanceRecord.find({ sessionId: session._id })
      .populate('studentId', 'name email studentId')
      .sort({ markedAt: -1 });

    const formattedRecords = records.map((rec) => ({
      id: rec._id,
      studentName: rec.studentId ? rec.studentId.name : 'Unknown',
      studentEmail: rec.studentId ? rec.studentId.email : '',
      studentId: rec.studentId ? rec.studentId.studentId : 'N/A',
      status: rec.status,
      markedAt: rec.markedAt,
    }));

    return res.status(200).json({
      success: true,
      session: {
        id: session._id,
        subject: session.subject,
        className: session.className,
        status: session.status,
      },
      records: formattedRecords,
      totalCount: formattedRecords.length,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionById,
  startSession,
  refreshQrToken,
  getCurrentQr,
  endSession,
  getSessionAttendance,
  activeSessionTokens, // exported for testing and token rotation coordination
  rotateSessionToken,
};
