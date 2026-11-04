const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pcu-campus-secret-key-2026';

app.use(cors());
app.use(express.json({ limit: '10kb' }));

// HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Server-Side XSS Sanitization Helper
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

const db = new sqlite3.Database('./campus.db', (err) => {
  if (err) console.error('Database connection error:', err.message);
  else console.log('Connected to SQLite database (campus.db).');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student TEXT NOT NULL,
    department TEXT NOT NULL,
    date TEXT NOT NULL,
    purpose TEXT DEFAULT 'General Consultation',
    time_slot TEXT DEFAULT 'Morning (8:00 AM - 12:00 PM)',
    status TEXT DEFAULT 'Pending',
    created_by TEXT
  )`);

  // Safe migrations in case tables were created previously without these columns
  db.run(`ALTER TABLE appointments ADD COLUMN purpose TEXT DEFAULT 'General Consultation'`, () => {});
  db.run(`ALTER TABLE appointments ADD COLUMN time_slot TEXT DEFAULT 'Morning (8:00 AM - 12:00 PM)'`, () => {});

  // Performance Index
  db.run(`CREATE INDEX IF NOT EXISTS idx_appointments_status_date ON appointments(status, date)`);

  db.get(`SELECT COUNT(*) as count FROM users`, async (err, row) => {
    if (row && row.count === 0) {
      const adminHash = await bcrypt.hash('password123', 10);
      const studentHash = await bcrypt.hash('password123', 10);
      db.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['admin', adminHash, 'Admin']);
      db.run(`INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`, ['student', studentHash, 'Student']);
    }
  });
});

// Request & Performance Logger Middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeInMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} - ${res.statusCode} (${timeInMs} ms)`);
  });
  next();
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication Required (401): Please sign in first.' });
  }
  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return res.status(403).json({ success: false, error: 'Invalid or Expired Session Token (403).' });
    req.user = decodedUser;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({
      success: false,
      error: `Authorization Denied (403): Role '${req.user.role}' cannot approve or delete records.`
    });
  }
  next();
}

// ENDPOINT 1: POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const username = sanitizeInput(req.body.username);
  const password = req.body.password;
  const role = req.body.role === 'Admin' ? 'Admin' : 'Student';

  if (!username || username.length < 3 || !password || password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Registration Error: Username (min 3 chars) and Password (min 6 chars) are required.'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    db.run(
      `INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
      [username, passwordHash, role],
      function (err) {
        if (err) {
          return res.status(400).json({ success: false, error: 'Username already exists. Please choose another.' });
        }
        res.status(201).json({
          success: true,
          message: `Account '${username}' registered successfully as ${role}! You may now sign in.`
        });
      }
    );
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
});

// ENDPOINT 2: POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const username = sanitizeInput(req.body.username);
  const password = req.body.password;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required.' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ success: false, error: 'Database error occurred.' });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid username or password.' });

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ success: false, error: 'Invalid username or password.' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
    res.status(200).json({
      success: true,
      message: `Welcome, ${user.username} (${user.role})`,
      token,
      user: { username: user.username, role: user.role }
    });
  });
});

// ENDPOINT 3: GET /api/appointments
app.get('/api/appointments', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  db.all(`SELECT id, student, department, date, purpose, time_slot, status FROM appointments ORDER BY id DESC LIMIT ?`, [limit], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: 'Failed to retrieve appointments.' });
    res.status(200).json({ success: true, count: rows.length, data: rows });
  });
});

// ENDPOINT 4: POST /api/appointments (Feature 3: Same-day time slot double-booking protection)
app.post('/api/appointments', authenticateToken, (req, res) => {
  const cleanStudent = sanitizeInput(req.body.student);
  const cleanDepartment = sanitizeInput(req.body.department);
  const cleanDate = sanitizeInput(req.body.date);
  const cleanPurpose = sanitizeInput(req.body.purpose) || 'General Consultation';
  const cleanTimeSlot = sanitizeInput(req.body.time_slot || req.body.timeSlot) || 'Morning (8:00 AM - 12:00 PM)';

  if (!cleanStudent || cleanStudent.length < 3 || !cleanDepartment || !cleanDate) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Valid student name (min 3 chars), department, and date are required.'
    });
  }

  // Check if someone has already reserved this exact date and time slot
  const checkQuery = `SELECT * FROM appointments WHERE date = ? AND time_slot = ?`;
  db.get(checkQuery, [cleanDate, cleanTimeSlot], (err, existingRow) => {
    if (existingRow) {
      return res.status(400).json({
        success: false,
        error: `Reservation Blocked: The ${cleanTimeSlot} slot on ${cleanDate} is already reserved!`
      });
    }

    const sql = `INSERT INTO appointments (student, department, date, purpose, time_slot, status, created_by) VALUES (?, ?, ?, ?, ?, 'Pending', ?)`;
    db.run(sql, [cleanStudent, cleanDepartment, cleanDate, cleanPurpose, cleanTimeSlot, req.user.username], function (err) {
      if (err) return res.status(500).json({ success: false, error: 'Database insert failed.' });

      db.get(`SELECT id, student, department, date, purpose, time_slot, status FROM appointments WHERE id = ?`, [this.lastID], (err, newRecord) => {
        res.status(201).json({
          success: true,
          message: `Appointment booked successfully for student: ${newRecord.student} (${newRecord.time_slot})!`,
          data: newRecord
        });
      });
    });
  });
});

// ENDPOINT 5: PATCH /api/appointments/:id/status
app.patch('/api/appointments/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.get(`SELECT * FROM appointments WHERE id = ?`, [id], (err, appointment) => {
    if (!appointment) return res.status(404).json({ success: false, error: 'Appointment not found.' });

    const newStatus = appointment.status === 'Pending' ? 'Confirmed' : 'Pending';
    db.run(`UPDATE appointments SET status = ? WHERE id = ?`, [newStatus, id], (err) => {
      if (err) return res.status(500).json({ success: false, error: 'Database update failed.' });
      res.status(200).json({
        success: true,
        message: `Status updated to ${newStatus} for student: ${appointment.student}.`,
        data: { ...appointment, status: newStatus }
      });
    });
  });
});

// ENDPOINT 6: DELETE /api/appointments/:id
app.delete('/api/appointments/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.run(`DELETE FROM appointments WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ success: false, error: 'Database delete failed.' });
    if (this.changes === 0) return res.status(404).json({ success: false, error: 'Appointment not found.' });
    res.status(200).json({ success: true, message: 'Appointment deleted.' });
  });
});

// ENDPOINT 7: GET /api/health
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.send('PCU Appointment Backend API is running.');
});

app.listen(PORT, () => {
  console.log(`Final Project Server running on http://localhost:${PORT}`);
});