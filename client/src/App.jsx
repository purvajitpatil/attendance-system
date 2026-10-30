import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateSession from './pages/CreateSession';
import ActiveSession from './pages/ActiveSession';
import AttendanceReports from './pages/AttendanceReports';
import StudentDashboard from './pages/StudentDashboard';
import ScanAttendance from './pages/ScanAttendance';
import AttendanceHistory from './pages/AttendanceHistory';

const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '60px' }}>
        <p>Loading application...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return user?.role === 'teacher' ? (
    <Navigate to="/teacher/dashboard" replace />
  ) : (
    <Navigate to="/student/dashboard" replace />
  );
};

function App() {
  return (
    <div>
      <Navbar />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Teacher Routes */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/sessions/create"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <CreateSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/sessions/:id"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <ActiveSession />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/reports"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <AttendanceReports />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/scan"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <ScanAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/history"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <AttendanceHistory />
            </ProtectedRoute>
          }
        />

        {/* Home & Catch-all */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
