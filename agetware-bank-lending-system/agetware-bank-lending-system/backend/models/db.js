
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = process.env.DB_PATH || './db/database.sqlite';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS Customers (
    customer_id TEXT PRIMARY KEY,
    name TEXT,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Loans (
    loan_id TEXT PRIMARY KEY,
    customer_id TEXT,
    principal_amount REAL,
    total_amount REAL,
    interest_rate REAL,
    loan_period_years INTEGER,
    monthly_emi REAL,
    amount_paid REAL DEFAULT 0,
    emis_left INTEGER DEFAULT 0,
    status TEXT,
    created_at TEXT,
    FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS Payments (
    payment_id TEXT PRIMARY KEY,
    loan_id TEXT,
    amount REAL,
    payment_type TEXT,
    payment_date TEXT,
    FOREIGN KEY (loan_id) REFERENCES Loans(loan_id)
  )`);
});

module.exports = db;
