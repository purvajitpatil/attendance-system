import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService } from '../services/api';
import Alert from '../components/Alert';

const AttendanceHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getMyAttendance();
      if (res.success) {
        setRecords(res.records);
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <p>Loading your attendance records from database...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>My Attendance History</h1>
          <p style={{ color: '#64748b' }}>Complete record of all verified QR attendance scans</p>
        </div>
        <Link to="/student/scan" className="btn btn-primary">
          Scan QR Code
        </Link>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      <div className="card">
        {records && records.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Class / Section</th>
                  <th>Instructor</th>
                  <th>Status</th>
                  <th>Marked Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, index) => (
                  <tr key={rec.id}>
                    <td>{index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{rec.subject}</td>
                    <td>{rec.className}</td>
                    <td>{rec.teacherName}</td>
                    <td>
                      <span className="badge badge-present">{rec.status}</span>
                    </td>
                    <td>{new Date(rec.markedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <p>No attendance records found in the database.</p>
            <p style={{ fontSize: '0.85rem' }}>Attend a lecture session and scan the dynamic QR code to mark yourself present.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceHistory;
