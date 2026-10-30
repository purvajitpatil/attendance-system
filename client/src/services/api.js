import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for centralized error message formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected network or server error occurred.';
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }

    if (error.response && error.response.status === 401) {
      // Auto-clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    const enhancedError = new Error(message);
    enhancedError.status = error.response ? error.response.status : null;
    enhancedError.data = error.response ? error.response.data : null;
    return Promise.reject(enhancedError);
  }
);

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data;
  },
  register: async (name, email, password, studentId) => {
    const res = await api.post('/auth/register', { name, email, password, studentId });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const sessionService = {
  createSession: async (subject, className) => {
    const res = await api.post('/sessions', { subject, className });
    return res.data;
  },
  getSessions: async () => {
    const res = await api.get('/sessions');
    return res.data;
  },
  getSessionById: async (id) => {
    const res = await api.get(`/sessions/${id}`);
    return res.data;
  },
  startSession: async (id) => {
    const res = await api.post(`/sessions/${id}/start`);
    return res.data;
  },
  refreshQrToken: async (id) => {
    const res = await api.post(`/sessions/${id}/refresh-qr`);
    return res.data;
  },
  getCurrentQr: async (id) => {
    const res = await api.get(`/sessions/${id}/current-qr`);
    return res.data;
  },
  endSession: async (id) => {
    const res = await api.post(`/sessions/${id}/end`);
    return res.data;
  },
  getSessionAttendance: async (id) => {
    const res = await api.get(`/sessions/${id}/attendance`);
    return res.data;
  },
};

export const attendanceService = {
  scanAttendance: async (sessionId, token) => {
    const res = await api.post('/attendance/scan', { sessionId, token });
    return res.data;
  },
  getMyAttendance: async () => {
    const res = await api.get('/attendance/my');
    return res.data;
  },
  getSummary: async () => {
    const res = await api.get('/attendance/summary');
    return res.data;
  },
};

export const reportService = {
  getReports: async (filters = {}) => {
    const res = await api.get('/reports', { params: filters });
    return res.data;
  },
  exportCsv: async (filters = {}) => {
    const res = await api.get('/reports/csv', {
      params: filters,
      responseType: 'blob',
    });
    // Trigger browser download
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default api;
