const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const User = require('../models/User');

/**
 * Helper to fetch filtered attendance records for a teacher's sessions
 */
const getFilteredTeacherRecords = async (teacherId, { sessionId, subject, search }) => {
  // 1. Get all session IDs owned by this teacher
  let sessionQuery = { teacherId };
  if (sessionId) {
    sessionQuery._id = sessionId;
  }
  if (subject && subject.trim()) {
    sessionQuery.subject = { $regex: subject.trim(), $options: 'i' };
  }

  const teacherSessions = await AttendanceSession.find(sessionQuery);
  const sessionIds = teacherSessions.map((s) => s._id);

  if (sessionIds.length === 0) {
    return [];
  }

  // 2. Query attendance records for these sessions
  let recordQuery = { sessionId: { $in: sessionIds } };

  let records = await AttendanceRecord.find(recordQuery)
    .populate('sessionId', 'subject className createdAt')
    .populate('studentId', 'name email studentId')
    .sort({ markedAt: -1 });

  // 3. Apply search by student name or studentId if provided
  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    records = records.filter((rec) => {
      const name = rec.studentId?.name?.toLowerCase() || '';
      const stId = rec.studentId?.studentId?.toLowerCase() || '';
      return name.includes(s) || stId.includes(s);
    });
  }

  return records.map((r) => ({
    id: r._id,
    sessionId: r.sessionId?._id || '',
    studentName: r.studentId?.name || 'Unknown',
    studentId: r.studentId?.studentId || 'N/A',
    studentEmail: r.studentId?.email || '',
    subject: r.sessionId?.subject || 'N/A',
    className: r.sessionId?.className || 'N/A',
    status: r.status,
    markedAt: r.markedAt,
  }));
};

/**
 * Return attendance reports in JSON format
 */
const getReports = async (req, res, next) => {
  try {
    const { sessionId, subject, search } = req.query;
    const records = await getFilteredTeacherRecords(req.user.id, { sessionId, subject, search });

    return res.status(200).json({
      success: true,
      records,
      totalCount: records.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export attendance report as downloadable CSV
 */
const exportReportsCsv = async (req, res, next) => {
  try {
    const { sessionId, subject, search } = req.query;
    const records = await getFilteredTeacherRecords(req.user.id, { sessionId, subject, search });

    // CSV header
    const headers = ['Student Name', 'Student ID', 'Student Email', 'Subject', 'Class', 'Status', 'Date and Time'];
    
    // Format rows
    const rows = records.map((r) => [
      `"${r.studentName.replace(/"/g, '""')}"`,
      `"${r.studentId.replace(/"/g, '""')}"`,
      `"${r.studentEmail.replace(/"/g, '""')}"`,
      `"${r.subject.replace(/"/g, '""')}"`,
      `"${r.className.replace(/"/g, '""')}"`,
      `"${r.status}"`,
      `"${new Date(r.markedAt).toLocaleString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${Date.now()}.csv`);
    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports,
  exportReportsCsv,
};
