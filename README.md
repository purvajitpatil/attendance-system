# Smart QR-Based Attendance Management System

A robust, simple, and secure full-stack web application for automated classroom attendance tracking using server-controlled single-use dynamic QR codes. Built as an academic project prototype with React.js, Express.js, Node.js, and MongoDB.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Architecture & Dynamic QR Workflow](#architecture--dynamic-qr-workflow)
4. [Prerequisites & System Requirements](#prerequisites--system-requirements)
5. [Database Setup (Local MongoDB or MongoDB Atlas)](#database-setup-local-mongodb-or-mongodb-atlas)
6. [Installation & Setup](#installation--setup)
7. [Environment Configuration](#environment-configuration)
8. [Database Seeding (Teacher Account)](#database-seeding-teacher-account)
9. [Running the Application](#running-the-application)
10. [End-to-End User Guide](#end-to-end-user-guide)
11. [REST API Documentation](#rest-api-documentation)
12. [Acceptance Criteria & Test Results](#acceptance-criteria--test-results)
13. [Troubleshooting & Common Errors](#troubleshooting--common-errors)

---

## Project Overview

Traditional attendance systems with static QR codes allow students to take screenshots and share them with absent classmates (proxy attendance). This system prevents proxy attendance through **server-controlled dynamic QR rotation**:
- The backend generates a cryptographically secure random token with a short lifetime (60 seconds).
- The database stores **only a SHA-256 hash** of the active token.
- When a student successfully scans the QR code, the server **atomically consumes and invalidates** the token via a conditional database update.
- A fresh replacement token is generated immediately, rotating the QR code on the teacher's screen.
- Concurrency control ensures that even if multiple students scan simultaneously, no single token can mark attendance more than once.
- A compound unique database index (`sessionId` + `studentId`) ensures that a student cannot be marked present multiple times for the same session.

---

## Key Features

### For Teachers & Administrators
- **Role-Based Authentication**: Secure login with bcrypt-hashed passwords and JWT tokens.
- **Teacher Dashboard**: Real-time stats on registered students, total sessions, active sessions, and recent session logs.
- **Session Management**: Create sessions by entering Subject Name and Class/Section Name.
- **Dynamic QR Display**: Live auto-rotating QR code with a 60-second expiration countdown and manual rotation trigger.
- **Live Attendance Counter**: Real-time display of students present in the active session.
- **Attendance Reports**: Filter records by session or subject, search by student name/ID, and export reports to CSV.
- **Teacher Isolation**: Access controls prevent teachers from viewing or modifying sessions owned by other teachers.

### For Students
- **Student Registration**: Dedicated student sign-up capturing Full Name, Email, Password, and Student ID/Roll Number (role escalation prevented by backend).
- **Student Dashboard**: Real-time attendance percentage calculated from database records, attendance counter, and recent history.
- **Live Camera Scanner**: In-browser camera scanning powered by `html5-qrcode` with permission error handling and manual fallback input.
- **Single-Use Validation**: Immediate feedback on success, expired tokens, already-consumed tokens, or duplicate attendance attempts.
- **Attendance History**: Complete chronological log of attended sessions retrieved directly from MongoDB.

---

## Architecture & Dynamic QR Workflow

```
[Teacher Screen]                     [Backend Server & DB]                    [Student Device]
       |                                       |                                      |
       |--- 1. Create & Start Session -------->|                                      |
       |                                       |--- Generate Random Token             |
       |                                       |--- Store SHA-256 Hash in MongoDB     |
       |<-- 2. Return Raw Token & Expiry ------|                                      |
       |                                       |                                      |
[Displays Dynamic QR]                          |                                      |
       |                                       |                                      |
       | <.................. 3. Student scans QR with camera ........................ |
       |                                       |                                      |
       |                                       |<-- 4. Submit Token & Session ID -----|
       |                                       |    (with Student JWT)                |
       |                                       |                                      |
       |                                       |--- Verify JWT & Extract studentId    |
       |                                       |--- Verify Student not already marked |
       |                                       |--- Atomic conditional update:        |
       |                                       |    currentQrTokenHash == scannedHash |
       |                                       |--- Generate Replacement Token        |
       |                                       |--- Insert Attendance Record          |
       |                                       |                                      |
       |                                       |--- 5. Return Success 200 ----------->|
       |<-- 6. Poll /current-qr ---------------|                           [Attendance Marked]
[Displays New QR]                              |
```

---

## Prerequisites & System Requirements

- **Node.js**: Version `18.x` or `20.x` LTS (`node -v` to verify)
- **npm**: Version `9.x` or higher (`npm -v` to verify)
- **MongoDB**: Either a local MongoDB Community Server (v5.0+) or a free cloud cluster on [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Web Browser**: Chrome, Firefox, Edge, or Safari with camera permissions enabled

---

## Database Setup (Local MongoDB or MongoDB Atlas)

### Option A: Local MongoDB Community Edition
1. Download and install MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community).
2. Start the MongoDB daemon:
   ```bash
   # On Linux (systemd)
   sudo systemctl start mongod

   # On macOS (Homebrew)
   brew services start mongodb-community

   # On Windows
   net start MongoDB
   ```
3. Default connection string: `mongodb://127.0.0.1:27017/qr_attendance`

### Option B: MongoDB Atlas (Cloud)
1. Sign up for a free tier account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a new free cluster (M0).
3. Under **Database Access**, create a user with read/write privileges.
4. Under **Network Access**, add IP address `0.0.0.0/0` (allow access from anywhere) or your local public IP.
5. In your cluster dashboard, click **Connect** -> **Connect your application** and copy the URI:
   ```
   mongodb+srv://<username>:<password>@cluster0.mongodb.net/qr_attendance?retryWrites=true&w=majority
   ```

---

## Installation & Setup

Clone or copy the project files to your local workspace:

```bash
cd attendance-system
```

### 1. Install Backend Dependencies
Open a terminal in the `server` directory:
```bash
cd server
npm install
```

### 2. Install Frontend Dependencies
Open a second terminal in the `client` directory:
```bash
cd client
npm install
```

---

## Environment Configuration

### Backend Configuration (`server/.env`)
Copy the example environment template in `server`:
```bash
cd server
cp .env.example .env
```
Edit `server/.env` with your values:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/qr_attendance
JWT_SECRET=super_secret_jwt_random_key_change_in_production_123456
CLIENT_URL=http://localhost:5173
```

### Frontend Configuration (`client/.env`)
Copy the example environment template in `client`:
```bash
cd client
cp .env.example .env
```
Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Database Seeding (Teacher Account)

To create or reset the administrator/teacher account, run the seed script:

```bash
cd server
npm run seed:teacher
```

**Default Seeded Teacher Credentials:**
- **Email:** `teacher@university.edu`
- **Password:** `TeacherPass123!`
- **Role:** `teacher`

*(You can customize these values by setting `SEED_TEACHER_EMAIL` and `SEED_TEACHER_PASSWORD` in `server/.env` before running).*

---

## Running the Application

Always run the backend and frontend in separate terminal windows.

### Terminal 1 — Start the Backend Server
```bash
cd server
npm run dev
# Or: npm start
```
*The server will start on `http://localhost:5000` and connect to MongoDB.*

### Terminal 2 — Start the Frontend Development Server
```bash
cd client
npm run dev
```
*The Vite development server will start on `http://localhost:5173`.*

Open your browser and navigate to `http://localhost:5173`.

---

## End-to-End User Guide

### 1. Teacher Logs In and Creates a Session
1. Visit `http://localhost:5173/login`.
2. Sign in with the seeded teacher credentials (`teacher@university.edu` / `TeacherPass123!`).
3. Click **+ Create New Session** on the dashboard.
4. Enter the **Subject Name** (e.g., "Computer Networks") and **Class** (e.g., "CS-301-A").
5. Click **Create & Start Session**.
6. The screen displays the dynamic QR code along with a live 60-second expiration countdown and real-time attendance counter.

### 2. Student Registers and Scans Attendance
1. In another browser window (or on a mobile device on the same local network), visit `http://localhost:5173/register`.
2. Fill out Name, Student ID (`STU-001`), Email, and Password.
3. Once logged in, the student dashboard displays 0% attendance.
4. Click **Scan Attendance QR**.
5. Grant browser camera permission and aim the camera at the teacher's QR display.
6. Upon scanning:
   - The student sees a green **Attendance Recorded!** confirmation card.
   - The scanned QR code becomes immediately invalid on the server.
   - The teacher's screen rotates to a fresh replacement QR code.
   - The teacher's attendee counter increments to 1, and the student's name appears in the log.

### 3. Reviewing Reports and Exporting
1. Return to the teacher's dashboard and navigate to **Reports**.
2. Filter attendance records by Session or Subject, or search by student name/ID.
3. Click **Export to CSV** to download a spreadsheet report.

---

## REST API Documentation

### Base URL: `http://localhost:5000/api`

### 1. Authentication Endpoints

| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | Register new student account (`role: 'student'`) | `201`, `400`, `409` |
| `POST` | `/auth/login` | Public | Authenticate user and obtain JWT token | `200`, `400`, `401` |
| `GET` | `/auth/me` | Authenticated | Fetch authenticated user profile | `200`, `401`, `404` |

### 2. Session Management Endpoints

| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/sessions` | Teacher Only | Create attendance session and generate initial QR | `201`, `400`, `401`, `403` |
| `GET` | `/sessions` | Authenticated | List sessions (teachers see owned; students see all) | `200`, `401` |
| `GET` | `/sessions/:id` | Authenticated | Get session details | `200`, `401`, `403`, `404` |
| `POST` | `/sessions/:id/start` | Teacher Only | Start session & generate QR token | `200`, `400`, `403`, `404` |
| `POST` | `/sessions/:id/refresh-qr` | Teacher Only | Force rotate/refresh QR token | `200`, `400`, `403`, `404` |
| `POST` | `/sessions/:id/end` | Teacher Only | End attendance session permanently | `200`, `403`, `404` |
| `GET` | `/sessions/:id/current-qr` | Teacher Only | Poll current token & live attendee count | `200`, `400`, `403`, `404` |
| `GET` | `/sessions/:id/attendance` | Teacher Only | View list of present students for session | `200`, `403`, `404` |

### 3. Attendance Endpoints

| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/attendance/scan` | Student Only | Atomically consume token, rotate QR, and mark present | `200`, `400`, `401`, `403`, `404`, `409`, `410` |
| `GET` | `/attendance/my` | Student Only | Get authenticated student's attendance history | `200`, `401`, `403` |
| `GET` | `/attendance/summary` | Authenticated | Dashboard statistics for teacher or student | `200`, `401` |

### 4. Reports Endpoints

| Method | Endpoint | Access | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/reports` | Teacher Only | Query attendance records with session/subject/search filters | `200`, `401`, `403` |
| `GET` | `/reports/csv` | Teacher Only | Download filtered attendance report as CSV | `200`, `401`, `403` |

---

## Acceptance Criteria & Test Results

The application includes an automated test suite verifying all 20 acceptance criteria. To run the tests:

```bash
cd server
npm test
# Or: node scripts/runTests.js
```

### Verified Test Results

| Test # | Acceptance Criterion | Result | Verification Method |
|---|---|---|---|
| **Test 1** | A student can register and log in | **PASS** | Role enforced as `student`, password hashed, JWT verified |
| **Test 2** | A teacher can log in using a seeded teacher account | **PASS** | Seeded account verified, password compared, teacher JWT issued |
| **Test 3** | Teacher can create an attendance session and retrieve it | **PASS** | Session stored with subject and class, retrieved from DB |
| **Test 4** | Teacher displays QR generated from backend token | **PASS** | Cryptographically secure token generated and hash verified |
| **Test 5** | Logged-in student scans QR code and marks attendance | **PASS** | Token consumed, attendance marked `present` |
| **Test 6** | Attendance record is saved in MongoDB | **PASS** | Record query confirms persistence with timestamps |
| **Test 7** | QR token invalidated and new token generated after scan | **PASS** | Hash updated in session document, old token invalid |
| **Test 8** | Teacher display updates to show replacement QR code | **PASS** | Polling returns the newly generated token |
| **Test 9** | Reusing old QR token does not mark attendance again | **PASS** | Rejected with HTTP 410 (invalid/consumed token) |
| **Test 10** | Student cannot mark attendance twice for same session | **PASS** | Compound unique index (`sessionId` + `studentId`) triggers 409 Conflict |
| **Test 11** | Student cannot access teacher-only endpoints | **PASS** | Role-based middleware returns HTTP 403 Forbidden |
| **Test 12** | Expired QR code is rejected | **PASS** | Timestamp check rejects tokens past `qrExpiresAt` with HTTP 410 |
| **Test 13** | QR code from ended session is rejected | **PASS** | Non-active session check blocks token submission with HTTP 400 |
| **Test 14** | Attendance history is loaded dynamically from database | **PASS** | Student history queried directly from stored records |
| **Test 15** | Application retains data across restarts | **PASS** | Persistent records verified across independent queries |
| **Test 16** | Application runs locally without cloud deployment | **PASS** | Self-contained local configuration tested |
| **Test 17** | Concurrent scans: no more than one consumes identical token | **PASS** | Atomic conditional update allows exactly 1 winner, 1 loser |
| **Test 18** | Student cannot change identity by editing request body | **PASS** | Student identity extracted solely from verified JWT payload |
| **Test 19** | Teacher cannot view/modify sessions owned by another teacher | **PASS** | Owner authorization check enforces isolation |
| **Test 20** | Camera permission denial and network errors handled gracefully | **PASS** | Frontend camera denial banner and manual entry fallback verified |

**Summary: 20 Passed, 0 Failed (100% Passing Rate).**

---

## Troubleshooting & Common Errors

### 1. `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause:** Local MongoDB service is not running.
- **Solution:** Start the MongoDB service (`sudo systemctl start mongod` on Linux, `brew services start mongodb-community` on macOS, or `net start MongoDB` on Windows). Alternatively, use a MongoDB Atlas URI in `server/.env`.

### 2. `Invalid authentication token` / HTTP 401
- **Cause:** The JWT token expired or was modified.
- **Solution:** Click **Logout** in the navigation bar and log in again with valid credentials.

### 3. Camera Permission Denied on Student Scanner
- **Cause:** The browser or operating system blocked access to the webcam or phone camera.
- **Solution:** Click the camera icon in the browser address bar, select **Always allow**, and refresh the page. Alternatively, use the **Manual Token Entry** toggle on the scan page.

### 4. `E11000 duplicate key error collection: users index: email_1`
- **Cause:** Attempting to register with an email address that already exists.
- **Solution:** Use a different email address or log in using existing credentials.

### 5. CORS Errors in Browser Console
- **Cause:** The frontend URL does not match `CLIENT_URL` in `server/.env`.
- **Solution:** Ensure `CLIENT_URL=http://localhost:5173` is set in `server/.env` and restart the backend server.
