import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sessionService } from '../services/api';
import Alert from '../components/Alert';

const CreateSession = () => {
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!subject.trim()) {
      setError('Subject name cannot be empty.');
      return;
    }

    if (!className.trim()) {
      setError('Class name cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      const res = await sessionService.createSession(subject.trim(), className.trim());
      if (res.success && res.session) {
        // Direct navigate to active session screen
        navigate(`/teacher/sessions/${res.session.id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to create attendance session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link to="/teacher/dashboard" style={{ fontSize: '0.9rem' }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      <div className="card">
        <h1 className="card-title">Create Attendance Session</h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '20px' }}>
          Start an attendance session and generate single-use dynamic QR codes.
        </p>

        {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="subject">
              Subject Name
            </label>
            <input
              id="subject"
              type="text"
              className="form-control"
              placeholder="e.g. Computer Networks, Linear Algebra"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="className">
              Class / Batch Name
            </label>
            <input
              id="className"
              type="text"
              className="form-control"
              placeholder="e.g. CS-2024-A, Section B"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              required
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Session...' : 'Create & Start Session'}
            </button>
            <Link to="/teacher/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSession;
