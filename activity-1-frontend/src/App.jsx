import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import './App.css';

const API_URL = 'http://localhost:5000/api/appointments';
const LOGIN_URL = 'http://localhost:5000/api/auth/login';
const REGISTER_URL = 'http://localhost:5000/api/auth/register';

function Navbar({ appTitle, studentName, user, onLogout }) {
  return (
    <header className="navbar">
      <h2>{appTitle}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>Developer: {studentName}</span>
        {user && (
          <span style={{ background: '#0369a1', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            User: <strong>{user.username}</strong> ({user.role})
            <button 
              onClick={onLogout} 
              style={{ marginLeft: '0.6rem', background: '#ef4444', color: 'white', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Logout
            </button>
          </span>
        )}
      </div>
    </header>
  );
}

function AuthPanel({ user, onLogin, onRegister, authMessage }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isRegistering) {
      const ok = await onRegister(username, password, role);
      if (ok) {
        setIsRegistering(false);
        setPassword('');
      }
    } else {
      onLogin(username, password);
    }
  };

  return (
    <div className="panel" style={{ marginBottom: '1.8rem', borderLeft: '6px solid #0284c7' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, border: 'none', padding: 0 }}>
          {user ? 'Active Session' : isRegistering ? 'Create Account' : 'Account Login'}
        </h3>
        {!user && (
          <button
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            style={{ background: 'transparent', border: '1.5px solid #0284c7', color: '#0284c7', padding: '0.35rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}
          >
            {isRegistering ? 'Back to Sign In' : 'Register New Account'}
          </button>
        )}
      </div>

      {authMessage && (
        <p style={{ backgroundColor: authMessage.isError ? '#fee2e2' : '#dcfce7', color: authMessage.isError ? '#b91c1c' : '#166534', padding: '0.7rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '600' }}>
          {authMessage.text}
        </p>
      )}

      {!user ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '170px' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>Username</label>
            <input 
              type="text" 
              placeholder="Enter username"
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
            />
          </div>
          
          {/* Feature 1: Password with Show/Hide toggle */}
          <div style={{ flex: 1, minWidth: '170px' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                style={{ width: '100%', padding: '0.65rem', paddingRight: '3.5rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: '#0284c7',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {isRegistering && (
            <div style={{ minWidth: '140px' }}>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '6px', border: '1.5px solid #cbd5e1' }}
              >
                <option value="Student">Student</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0.7rem 1.5rem' }}>
            {isRegistering ? 'Register' : 'Sign In'}
          </button>
        </form>
      ) : (
        <p style={{ fontSize: '0.9rem', color: '#334155' }}>
          Signed in as <strong>{user.username}</strong> ({user.role}).
        </p>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="stat-card">
      <h4>{title}</h4>
      <div className="value">{value}</div>
      <div className="subtitle">{subtitle}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function AppointmentForm({ onAddAppointment, serverError, successMsg }) {
  const [student, setStudent] = useState('');
  const [department, setDepartment] = useState('College of Informatics');
  const [date, setDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [timeSlot, setTimeSlot] = useState('Morning (8:00 AM - 12:00 PM)'); // Feature 3: Time Slot state

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isSaved = await onAddAppointment({ student, department, date, purpose, time_slot: timeSlot });
    if (isSaved) {
      setStudent('');
      setDate('');
      setPurpose('');
      setTimeSlot('Morning (8:00 AM - 12:00 PM)');
    }
  };

  return (
    <div className="panel">
      <h3>New Appointment</h3>
      {serverError && <p className="error-msg">{serverError}</p>}
      {successMsg && (
        <p style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '0.7rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', fontWeight: '600' }}>
          {successMsg}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Student Name</label>
          <input 
            type="text" 
            placeholder="e.g., Juan Dela Cruz" 
            value={student} 
            onChange={(e) => setStudent(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Department / Office</label>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option>College of Informatics</option>
            <option>Registrar Office</option>
            <option>Guidance & Counseling</option>
            <option>Student Affairs Office</option>
          </select>
        </div>
        <div className="form-group">
          <label>Purpose / Notes</label>
          <input 
            type="text" 
            placeholder="e.g., Academic Advising, Document Request" 
            value={purpose} 
            onChange={(e) => setPurpose(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Date</label>
          <input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
          />
        </div>
        {/* Feature 3: Time Slot Selection */}
        <div className="form-group">
          <label>Time Slot</label>
          <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
            <option value="Afternoon (1:00 PM - 4:00 PM)">Afternoon (1:00 PM - 4:00 PM)</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary">Book Appointment</button>
      </form>
    </div>
  );
}

function AppointmentTable({ appointments, loading, onToggleStatus, onDelete }) {
  if (loading) {
    return <p style={{ padding: '1rem', color: '#0284c7', fontWeight: 'bold' }}>Loading appointments...</p>;
  }

  return (
    <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Student</th>
            <th>Department</th>
            <th>Purpose</th>
            <th style={{ whiteSpace: 'nowrap' }}>Date & Time Slot</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {appointments.length === 0 ? (
            <tr><td colSpan="6" style={{ textAlign: 'center' }}>No appointments found.</td></tr>
          ) : (
            appointments.map((apt) => (
              <tr key={apt.id}>
                <td>{apt.student}</td>
                <td>{apt.department}</td>
                <td>{apt.purpose || 'General Consultation'}</td>
                <td className="date-time-cell">
                  <span>{apt.date}</span>{' '}
                  <small style={{ color: '#0284c7', fontWeight: 'bold', marginLeft: '0.35rem' }}>
                    • {apt.time_slot || 'Morning (8:00 AM - 12:00 PM)'}
                  </small>
                </td>
                <td onClick={() => onToggleStatus(apt.id)} style={{ cursor: 'pointer' }}>
                  <StatusBadge status={apt.status} />
                </td>
                <td>
                  <button className="btn btn-danger" onClick={() => onDelete(apt.id)}>Delete</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [authMessage, setAuthMessage] = useState(null);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const result = await response.json();
      if (result.success) setAppointments(result.data);
    } catch (err) {
      setServerError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (username, password, role) => {
    setServerError('');
    setSuccessMsg('');
    try {
      const response = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error);
        setAuthMessage({ text: result.error, isError: true });
        return false;
      }
      toast.success(result.message);
      setAuthMessage({ text: result.message, isError: false });
      return true;
    } catch (err) {
      toast.error('Registration request failed.');
      setAuthMessage({ text: 'Registration request failed.', isError: true });
      return false;
    }
  };

  const handleLogin = async (username, password) => {
    setServerError('');
    setSuccessMsg('');
    try {
      const response = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error);
        setAuthMessage({ text: result.error, isError: true });
        return;
      }
      toast.success(result.message);
      setToken(result.token);
      setUser(result.user);
      setAuthMessage({ text: result.message, isError: false });
    } catch (err) {
      toast.error('Login request failed.');
      setAuthMessage({ text: 'Login request failed.', isError: true });
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    toast('You have logged out.');
    setAuthMessage({ text: 'You have logged out.', isError: true });
  };

  const addAppointment = async (newApt) => {
    setServerError('');
    setSuccessMsg('');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newApt)
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error);
        setServerError(result.error);
        return false;
      }
      toast.success(result.message);
      setAppointments([result.data, ...appointments]);
      setSuccessMsg(result.message);
      return true;
    } catch (err) {
      toast.error('Network error while saving.');
      setServerError('Network error while saving.');
      return false;
    }
  };

  const toggleStatus = async (id) => {
    setServerError('');
    setSuccessMsg('');
    try {
      const response = await fetch(`${API_URL}/${id}/status`, {
        method: 'PATCH',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error);
        setServerError(result.error);
        return;
      }
      toast.success(result.message);
      setAppointments(appointments.map(apt => apt.id === id ? result.data : apt));
      setSuccessMsg(result.message);
    } catch (err) {
      toast.error('Failed to update status.');
      setServerError('Failed to update status.');
    }
  };

  const deleteAppointment = async (id) => {
    setServerError('');
    setSuccessMsg('');
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error);
        setServerError(result.error);
        return;
      }
      toast.success(result.message);
      setAppointments(appointments.filter(apt => apt.id !== id));
      setSuccessMsg(result.message);
    } catch (err) {
      toast.error('Failed to delete appointment.');
      setServerError('Failed to delete appointment.');
    }
  };

  const filtered = appointments.filter(apt => {
    const matchesName = apt.student.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || apt.status === statusFilter;
    return matchesName && matchesStatus;
  });

  return (
    <div>
      <Navbar 
        appTitle="PCU Campus Appointment System" 
        studentName="John joshua E. Mendoza" 
        user={user}
        onLogout={handleLogout}
      />
      <main className="container">
        <AuthPanel 
          user={user} 
          onLogin={handleLogin} 
          onRegister={handleRegister} 
          authMessage={authMessage} 
        />

        <section className="stats-grid">
          <StatCard title="Total Appointments" value={appointments.length} subtitle="All scheduled records" />
          <StatCard title="Confirmed" value={appointments.filter(a => a.status === 'Confirmed').length} subtitle="Ready for consultation" />
          <StatCard title="Pending Approval" value={appointments.filter(a => a.status === 'Pending').length} subtitle="Awaiting confirmation" />
        </section>

        <section className="main-grid">
          <AppointmentForm 
            onAddAppointment={addAppointment} 
            serverError={serverError} 
            successMsg={successMsg} 
          />
          <div className="panel">
            <h3>Appointment Schedule</h3>
            <div className="filter-bar">
              <input 
                type="text" 
                placeholder="Search student..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>
            <AppointmentTable 
              appointments={filtered} 
              loading={loading}
              onToggleStatus={toggleStatus} 
              onDelete={deleteAppointment} 
            />
          </div>
        </section>
      </main>
    </div>
  );
}