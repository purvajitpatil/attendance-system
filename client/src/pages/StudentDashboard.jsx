import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService } from '../services/api';
import Alert from '../components/Alert';

const StudentDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadStudentData = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getSummary();
      if (res.success) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || 'Failed to load student statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <p>Loading student dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Welcome, {summary?.studentName}</h1>
          <p style={{ color: '#64748b' }}>Student ID: <strong>{summary?.studentId}</strong></p>
        </div>
        <Link to="/student/scan" className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '1rem' }}>
          Scan Attendance QR
        </Link>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Total Course Sessions</div>
          <div className="stat-value">{summary?.totalSessions ?? 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Sessions Attended</div>
          <div className="stat-value">{summary?.sessionsAttended ?? 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Attendance Percentage</div>
          <div className="stat-value" style={{ color: (summary?.attendancePercentage ?? 0) >= 75 ? '#16a34a' : '#d97706' }}>
            {summary?.attendancePercentage ?? 0}%
          </div>
        </div>
      </div>

      {/* Recent Attendance Records Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Recent Attendance Marks</h2>
          <Link to="/student/history" className="btn btn-secondary btn-sm">
            View All History &rarr;
          </Link>
        </div>

        {summary?.recentRecords && summary.recentRecords.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Marked At</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentRecords.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600 }}>{rec.subject}</td>
                    <td>{rec.className}</td>
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
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
            <p>You haven't marked attendance for any sessions yet.</p>
            <Link to="/student/scan" className="btn btn-primary" style={{ marginTop: '12px' }}>
              Scan QR Code Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
