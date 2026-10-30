const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: [true, 'Session ID is required'],
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
  },
  markedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'present',
    enum: ['present', 'absent', 'late'],
  },
});

// Compound unique index prevents duplicate attendance for the same student in the same session
attendanceRecordSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
