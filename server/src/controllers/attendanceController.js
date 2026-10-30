const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');
const QrService = require('../services/qrService');
const { activeSessionTokens } = require('./sessionController');

/**
 * Scan QR and mark attendance for student
 * Atomically consumes current QR token, rotates it, and creates attendance record
 */
const scanAttendance = async (req, res, next) => {
  try {
    const { sessionId, token } = req.body;
    const studentId = req.user.id;

    if (!sessionId || !token) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and QR token are required.',
      });
    }

    // 1. Check session existence
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Attendance session not found.',
      });
    }

    // 2. Check if session has ended
    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'This attendance session has already ended.',
      });
    }

    // 3. Prevent duplicate attendance check BEFORE consuming token
    const existingAttendance = await AttendanceRecord.findOne({
      sessionId: session._id,
      studentId: studentId,
    });
    if (existingAttendance) {
      return res.status(409).json({
        success: false,
        message: 'You have already marked attendance for this session.',
        markedAt: existingAttendance.markedAt,
      });
    }

    // 4. Verify token freshness and hash before attempting atomic update
    const scannedHash = QrService.hashToken(token);
    const now = new Date();

    if (session.currentQrTokenHash !== scannedHash) {
      return res.status(410).json({
        success: false,
        message: 'QR code has already been used or is invalid. Please scan the updated QR code.',
      });
    }

    if (QrService.isExpired(session.qrExpiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'QR code has expired. Please ask the teacher to refresh the QR code.',
      });
    }

    // 5. Generate replacement token pair
    const replacement = QrService.generateTokenPair();

    // 6. Atomically consume token via conditional update
    const updatedSession = await AttendanceSession.findOneAndUpdate(
      {
        _id: session._id,
        status: 'active',
        currentQrTokenHash: scannedHash,
        qrExpiresAt: { $gt: now },
      },
      {
        $set: {
          currentQrTokenHash: replacement.tokenHash,
          qrExpiresAt: replacement.expiresAt,
        },
      },
      { new: true }
    );

    if (!updatedSession) {
      // Token was consumed in a race condition by another concurrent scan
      return res.status(410).json({
        success: false,
        message: 'QR code was already consumed by another student. Please scan the newly generated QR code.',
      });
    }

    // Update active memory cache for teacher display polling
    activeSessionTokens.set(session._id.toString(), {
      token: replacement.token,
      expiresAt: replacement.expiresAt,
    });

    // 7. Create attendance record
    let record;
    try {
      record = await AttendanceRecord.create({
        sessionId: session._id,
        studentId: studentId,
        markedAt: new Date(),
        status: 'present',
      });
    } catch (recordError) {
      if (recordError.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'You have already marked attendance for this session.',
        });
      }
      throw recordError;
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance marked successfully!',
      record: {
        id: record._id,
        sessionId: session._id,
        subject: session.subject,
        className: session.className,
        markedAt: record.markedAt,
        status: record.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's attendance history
 */
const getMyAttendance = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const records = await AttendanceRecord.find({ studentId })
      .populate({
        path: 'sessionId',
        select: 'subject className status teacherId createdAt',
        populate: { path: 'teacherId', select: 'name email' },
      })
      .sort({ markedAt: -1 });

    const formatted = records.map((rec) => ({
      id: rec._id,
      sessionId: rec.sessionId ? rec.sessionId._id : null,
      subject: rec.sessionId ? rec.sessionId.subject : 'N/A',
      className: rec.sessionId ? rec.sessionId.className : 'N/A',
      teacherName: rec.sessionId && rec.sessionId.teacherId ? rec.sessionId.teacherId.name : 'Unknown',
      markedAt: rec.markedAt,
      status: rec.status,
    }));

    return res.status(200).json({
      success: true,
      records: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get dashboard summary stats based on authenticated user role
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    if (req.user.role === 'teacher') {
      const teacherId = req.user.id;

      const totalStudents = await User.countDocuments({ role: 'student' });
      const totalSessions = await AttendanceSession.countDocuments({ teacherId });
      const activeSessions = await AttendanceSession.countDocuments({ teacherId, status: 'active' });

      // Recent sessions
      const recentSessions = await AttendanceSession.find({ teacherId })
        .sort({ createdAt: -1 })
        .limit(5);

      const recentWithCounts = await Promise.all(
        recentSessions.map(async (sess) => {
          const count = await AttendanceRecord.countDocuments({ sessionId: sess._id });
          return {
            id: sess._id,
            subject: sess.subject,
            className: sess.className,
            status: sess.status,
            createdAt: sess.createdAt,
            attendanceCount: count,
          };
        })
      );

      return res.status(200).json({
        success: true,
        summary: {
          totalStudents,
          totalSessions,
          activeSessions,
          recentSessions: recentWithCounts,
        },
      });
    } else {
      // Student summary
      const studentId = req.user.id;
      const totalSessions = await AttendanceSession.countDocuments();
      const attendedCount = await AttendanceRecord.countDocuments({ studentId });

      const attendancePercentage = totalSessions > 0
        ? Math.round((attendedCount / totalSessions) * 100)
        : 0;

      const recentRecords = await AttendanceRecord.find({ studentId })
        .populate({
          path: 'sessionId',
          select: 'subject className',
        })
        .sort({ markedAt: -1 })
        .limit(5);

      const formattedRecent = recentRecords.map((r) => ({
        id: r._id,
        subject: r.sessionId ? r.sessionId.subject : 'N/A',
        className: r.sessionId ? r.sessionId.className : 'N/A',
        markedAt: r.markedAt,
        status: r.status,
      }));

      return res.status(200).json({
        success: true,
        summary: {
          studentName: req.user.name,
          studentId: req.user.studentId,
          totalSessions,
          sessionsAttended: attendedCount,
          attendancePercentage,
          recentRecords: formattedRecent,
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scanAttendance,
  getMyAttendance,
  getAttendanceSummary,
};
