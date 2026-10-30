const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
  },
  className: {
    type: String,
    required: [true, 'Class name is required'],
    trim: true,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required'],
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active',
    required: true,
  },
  currentQrTokenHash: {
    type: String,
    default: null,
  },
  qrExpiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    default: null,
  },
});

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
