import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { reportService, sessionService } from '../services/api';
import Alert from '../components/Alert';

const AttendanceReports = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [records, setRecords] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // Filter state
  const [selectedSession, setSelectedSession] = useState(searchParams.get('sessionId') || '');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadSessions = async () => {
    try {
      const res = await sessionService.getSessions();
      if (res.success) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.warn('Failed to load session filters:', err);
    }
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedSession) filters.sessionId = selectedSession;
      if (subjectFilter.trim()) filters.subject = subjectFilter.trim();
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      const res = await reportService.getReports(filters);
      if (res.success) {
        setRecords(res.records);
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [selectedSession]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    loadReportData();
  };

  const handleResetFilters = () => {
    setSelectedSession('');
    setSubjectFilter('');
    setSearchQuery('');
    setSearchParams({});
    setTimeout(() => {
      loadReportData();
    }, 50);
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const filters = {};
      if (selectedSession) filters.sessionId = selectedSession;
      if (subjectFilter.trim()) filters.subject = subjectFilter.trim();
      if (searchQuery.trim()) filters.search = searchQuery.trim();

      await reportService.exportCsv(filters);
    } catch (err) {
      setError(err.message || 'Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Attendance Reports</h1>
          <p style={{ color: '#64748b' }}>Search, filter, and export verified attendance records</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="btn btn-secondary"
          disabled={exporting || records.length === 0}
        >
          {exporting ? 'Exporting...' : 'Export to CSV'}
        </button>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <form onSubmit={handleFilterSubmit} className="filters-row">
          <div className="form-group">
            <label className="form-label" htmlFor="filterSession">
              Session
            </label>
            <select
              id="filterSession"
              className="form-control"
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.subject} ({s.className})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="filterSubject">
              Subject Name
            </label>
            <input
              id="filterSubject"
              type="text"
              className="form-control"
              placeholder="e.g. Computer Networks"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="filterSearch">
              Student Name / ID
            </label>
            <input
              id="filterSearch"
              type="text"
              className="form-control"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ height: '38px' }}>
              Apply Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn btn-secondary btn-sm"
              style={{ height: '38px' }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Report Records Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Attendance Log</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total Records Found: <strong>{records.length}</strong>
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p>Loading attendance records...</p>
          </div>
        ) : records.length > 0 ? (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ fontWeight: 600 }}>{rec.studentName}</td>
                    <td>{rec.studentId}</td>
                    <td>{rec.studentEmail}</td>
                    <td>{rec.subject}</td>
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
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
            <p>No matching attendance records found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReports;
