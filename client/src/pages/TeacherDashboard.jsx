import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { attendanceService, sessionService } from '../services/api';
import Alert from '../components/Alert';

const TeacherDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await attendanceService.getSummary();
      if (res.success) {
        setSummary(res.summary);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleEndSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to end this attendance session?')) {
      return;
    }
    try {
      await sessionService.endSession(sessionId);
      setActionMessage('Attendance session ended successfully.');
      loadDashboardData();
    } catch (err) {
      setError(err.message || 'Failed to end attendance session.');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '40px' }}>
        <p>Loading teacher dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Teacher Dashboard</h1>
          <p style={{ color: '#64748b' }}>Manage your classes and dynamic QR attendance sessions</p>
        </div>
        <Link to="/teacher/sessions/create" className="btn btn-primary">
          + Create New Session
        </Link>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}
      {actionMessage && <Alert type="success" message={actionMessage} onClose={() => setActionMessage('')} />}

      {/* Summary Stat Cards */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Total Students</div>
          <div className="stat-value">{summary?.totalStudents ?? 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Total Sessions</div>
          <div className="stat-value">{summary?.totalSessions ?? 0}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Active Sessions</div>
          <div className="stat-value" style={{ color: summary?.activeSessions > 0 ? '#16a34a' : '#1e40af' }}>
            {summary?.activeSessions ?? 0}
          </div>
        </div>
      </div>

      {/* Recent Sessions Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Recent Attendance Sessions</h2>
          <button onClick={loadDashboardData} className="btn btn-secondary btn-sm">
            Refresh
          </button>
        </div>

        {summary?.recentSessions && summary.recentSessions.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Students Present</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentSessions.map((sess) => (
                  <tr key={sess.id}>
                    <td style={{ fontWeight: 600 }}>{sess.subject}</td>
                    <td>{sess.className}</td>
                    <td>
                      <span className={`badge badge-${sess.status}`}>{sess.status}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{sess.attendanceCount}</td>
                    <td>{new Date(sess.createdAt).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {sess.status === 'active' ? (
                          <>
                            <Link to={`/teacher/sessions/${sess.id}`} className="btn btn-primary btn-sm">
                              Display QR
                            </Link>
                            <button
                              onClick={() => handleEndSession(sess.id)}
                              className="btn btn-danger btn-sm"
                            >
                              End
                            </button>
                          </>
                        ) : (
                          <Link to={`/teacher/reports?sessionId=${sess.id}`} className="btn btn-secondary btn-sm">
                            View Records
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#64748b' }}>
            <p>No attendance sessions created yet.</p>
            <Link to="/teacher/sessions/create" className="btn btn-primary" style={{ marginTop: '12px' }}>
              Create Your First Session
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
