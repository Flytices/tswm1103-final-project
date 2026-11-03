const sqlite3 = require('sqlite3').verbose();

// Open campus.db securely
const db = new sqlite3.Database('./campus.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to campus.db successfully.\n');
});

// Query all records from the users table
db.all("SELECT id, username, password_hash, role FROM users", [], (err, rows) => {
  if (err) {
    console.error('Error querying users:', err.message);
    return;
  }
  
  console.log("=== USERS TABLE RECORDS ===");
  console.table(rows);
  
  db.close();
});