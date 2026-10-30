import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceService } from '../services/api';
import Alert from '../components/Alert';

const ScanAttendance = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Manual fallback state
  const [manualSessionId, setManualSessionId] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [showManual, setShowManual] = useState(false);

  const scannerInstanceRef = useRef(null);

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      try {
        scannerInstanceRef.current.clear().catch((e) => console.warn('Scanner clear error:', e));
      } catch (err) {
        console.warn('Error clearing scanner:', err);
      }
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      let parsed;
      try {
        parsed = JSON.parse(decodedText);
      } catch (e) {
        throw new Error('Invalid QR code format. Must contain valid attendance session payload.');
      }

      if (!parsed.sessionId || !parsed.token) {
        throw new Error('Incomplete QR code data. Missing session ID or token.');
      }

      // Stop scanner immediately on scan
      stopScanner();

      // Submit to backend
      const res = await attendanceService.scanAttendance(parsed.sessionId, parsed.token);
      if (res.success) {
        setSuccessResult(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark attendance.');
      stopScanner();
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualSessionId.trim() || !manualToken.trim()) {
      setErrorMessage('Both Session ID and Token are required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await attendanceService.scanAttendance(manualSessionId.trim(), manualToken.trim());
      if (res.success) {
        setSuccessResult(res);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSuccessResult(null);
    setErrorMessage('');
    setScanning(true);
  };

  useEffect(() => {
    if (!scanning || successResult) return;

    let scanner = null;
    try {
      scanner = new Html5QrcodeScanner(
        'reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        /* verbose= */ false
      );

      scannerInstanceRef.current = scanner;

      scanner.render(
        (decodedText) => handleScanSuccess(decodedText),
        (scanError) => {
          // Camera scan tick frame error (normal while scanning empty frames)
        }
      );
    } catch (e) {
      console.error('Camera initialization error:', e);
      setCameraError('Unable to access camera. Please ensure permissions are granted or use manual entry below.');
      setScanning(false);
    }

    return () => {
      if (scanner) {
        try {
          scanner.clear().catch(() => {});
        } catch (e) {}
      }
    };
  }, [scanning, successResult]);

  return (
    <div className="container" style={{ maxWidth: '580px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/student/dashboard" style={{ fontSize: '0.9rem' }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="card scanner-card">
        <h1 className="card-title" style={{ textAlign: 'center' }}>
          Scan Attendance QR
        </h1>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
          Point your device camera at the teacher's dynamic QR code
        </p>

        {cameraError && (
          <Alert
            type="warning"
            message={cameraError}
            onClose={() => setCameraError('')}
          />
        )}

        {errorMessage && (
          <div>
            <Alert type="danger" message={errorMessage} />
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <button onClick={handleRetry} className="btn btn-primary">
                Try Scanning Again
              </button>
            </div>
          </div>
        )}

        {submitting && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <p style={{ fontWeight: 600 }}>Verifying single-use QR token with server...</p>
          </div>
        )}

        {successResult ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                fontSize: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              &#10003;
            </div>

            <h2 style={{ fontSize: '1.4rem', color: '#166534', marginBottom: '8px' }}>
              Attendance Recorded!
            </h2>
            <p style={{ color: '#475569', marginBottom: '20px' }}>
              Subject: <strong>{successResult.record?.subject}</strong> ({successResult.record?.className})
              <br />
              Time: {new Date(successResult.record?.markedAt).toLocaleTimeString()}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link to="/student/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
              <Link to="/student/history" className="btn btn-secondary">
                View History
              </Link>
            </div>
          </div>
        ) : (
          scanning && !errorMessage && !submitting && (
            <div>
              <div id="reader" style={{ width: '100%', marginBottom: '16px' }}></div>
            </div>
          )
        )}

        {/* Manual Fallback Option */}
        {!successResult && (
          <div style={{ marginTop: '24px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setShowManual(!showManual)}
                className="btn btn-secondary btn-sm"
              >
                {showManual ? 'Hide Manual Entry' : 'Manual Token Entry / Troubleshooting'}
              </button>
            </div>

            {showManual && (
              <form onSubmit={handleManualSubmit} style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="manualSessionId">
                    Session ID
                  </label>
                  <input
                    id="manualSessionId"
                    type="text"
                    className="form-control"
                    placeholder="Enter Session ObjectId"
                    value={manualSessionId}
                    onChange={(e) => setManualSessionId(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="manualToken">
                    QR Token
                  </label>
                  <input
                    id="manualToken"
                    type="text"
                    className="form-control"
                    placeholder="Enter single-use token"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Attendance Manually'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanAttendance;
