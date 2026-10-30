import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { sessionService } from '../services/api';
import Alert from '../components/Alert';

const ActiveSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(60);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Poll timer ref
  const pollTimerRef = useRef(null);

  // Fetch session details and initial QR token
  const fetchSessionAndQr = async () => {
    try {
      const sessRes = await sessionService.getSessionById(id);
      if (sessRes.success) {
        setSession(sessRes.session);
        if (sessRes.session.status === 'ended') {
          return;
        }
      }

      const qrRes = await sessionService.getCurrentQr(id);
      if (qrRes.success) {
        setToken(qrRes.token);
        setExpiresAt(new Date(qrRes.expiresAt));
        setAttendanceCount(qrRes.attendanceCount);
      }

      // Fetch attendee list
      const attRes = await sessionService.getSessionAttendance(id);
      if (attRes.success) {
        setAttendees(attRes.records);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch session and QR information.');
    } finally {
      setLoading(false);
    }
  };

  // Manual or automatic refresh token
  const handleRefreshToken = async () => {
    try {
      setRefreshing(true);
      const res = await sessionService.refreshQrToken(id);
      if (res.success) {
        setToken(res.token);
        setExpiresAt(new Date(res.expiresAt));
      }
    } catch (err) {
      setError(err.message || 'Failed to refresh QR token.');
    } finally {
      setRefreshing(false);
    }
  };

  // End session handler
  const handleEndSession = async () => {
    if (!window.confirm('Are you sure you want to end this attendance session? Students will no longer be able to mark attendance.')) {
      return;
    }

    try {
      await sessionService.endSession(id);
      navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to end session.');
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessionAndQr();
  }, [id]);

  // Periodic polling for dynamic token rotation and attendance count (every 2 seconds)
  useEffect(() => {
    if (session?.status === 'ended') return;

    pollTimerRef.current = setInterval(async () => {
      try {
        const qrRes = await sessionService.getCurrentQr(id);
        if (qrRes.success) {
          // If token rotated on backend, update state immediately
          if (qrRes.token !== token) {
            setToken(qrRes.token);
            setExpiresAt(new Date(qrRes.expiresAt));
          }
          if (qrRes.attendanceCount !== attendanceCount) {
            setAttendanceCount(qrRes.attendanceCount);
            // Refresh attendee list
            const attRes = await sessionService.getSessionAttendance(id);
            if (attRes.success) {
              setAttendees(attRes.records);
            }
          }
        }
      } catch (err) {
        // Suppress continuous polling error in console
      }
    }, 2000);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [id, token, attendanceCount, session?.status]);

  // Expiration countdown ticker
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000));
      setRemainingSeconds(diff);

      // If timer hits zero, trigger auto-refresh
      if (diff === 0 && !refreshing) {
        handleRefreshToken();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, refreshing]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <p>Loading session and generating QR code...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container">
        <Alert type="danger" message={error || 'Session not found.'} />
        <Link to="/teacher/dashboard" className="btn btn-secondary">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  // QR Payload structured as JSON string
  const qrPayload = JSON.stringify({
    sessionId: session.id,
    token: token,
  });

  return (
    <div className="container">
      {/* Session Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{session.subject}</h1>
            <span className={`badge badge-${session.status}`}>{session.status}</span>
          </div>
          <p style={{ color: '#64748b', marginTop: '4px' }}>
            Class: <strong>{session.className}</strong> | Session ID: <code>{session.id}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {session.status === 'active' && (
            <>
              <button
                onClick={handleRefreshToken}
                className="btn btn-secondary"
                disabled={refreshing}
              >
                {refreshing ? 'Rotating...' : 'Rotate QR Token'}
              </button>
              <button onClick={handleEndSession} className="btn btn-danger">
                End Session
              </button>
            </>
          )}
          <Link to="/teacher/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Dynamic QR Display Column */}
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 className="card-title">Live Dynamic QR Code</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Single-use token automatically rotates after every scan or upon expiration.
          </p>

          {session.status === 'active' ? (
            <div className="qr-container">
              {token ? (
                <div className="qr-box">
                  <QRCodeSVG value={qrPayload} size={240} level="H" includeMargin={true} />
                </div>
              ) : (
                <p>Generating secure token...</p>
              )}

              <div className={`qr-timer ${remainingSeconds <= 10 ? 'expiring' : ''}`}>
                Validity Remaining: {remainingSeconds}s
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '6px' }}>
                Auto-refreshes every 60s or immediately upon student attendance
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', background: '#f8fafc', borderRadius: '6px' }}>
              <p style={{ fontWeight: 600, color: '#64748b' }}>This session has ended.</p>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>QR codes are deactivated.</p>
            </div>
          )}
        </div>

        {/* Live Attendance Counter & Student List */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Attendance Log</h2>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e40af' }}>
              Present: {attendanceCount}
            </div>
          </div>

          {attendees && attendees.length > 0 ? (
            <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Student ID</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((att) => (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 600 }}>{att.studentName}</td>
                      <td>{att.studentId}</td>
                      <td>{new Date(att.markedAt).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
              <p>No students have marked attendance yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Scanned records will appear here live.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActiveSession;
