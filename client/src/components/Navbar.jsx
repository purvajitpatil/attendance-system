import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, isTeacher, isStudent, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        QR Attendance
        {user?.role && <span>{user.role}</span>}
      </Link>

      <div className="navbar-links">
        {isAuthenticated ? (
          <>
            {isTeacher && (
              <>
                <Link to="/teacher/dashboard">Dashboard</Link>
                <Link to="/teacher/sessions/create">New Session</Link>
                <Link to="/teacher/reports">Reports</Link>
              </>
            )}

            {isStudent && (
              <>
                <Link to="/student/dashboard">Dashboard</Link>
                <Link to="/student/scan">Scan QR</Link>
                <Link to="/student/history">My History</Link>
              </>
            )}

            <span className="user-badge">
              {user.name} {user.studentId ? `(${user.studentId})` : ''}
            </span>

            <button onClick={handleLogout} className="btn btn-secondary btn-sm">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Student Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
