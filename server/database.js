const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'registrations.db');
let db;
let SQL;
let initPromise;

async function initDatabase() {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      club_name TEXT NOT NULL,
      delegate_count INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      payment_status TEXT DEFAULT 'pending',
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS delegates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER NOT NULL,
      delegate_name TEXT NOT NULL,
      delegate_designation TEXT NOT NULL,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_id INTEGER,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount INTEGER NOT NULL,
      status TEXT DEFAULT 'created',
      raw_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (registration_id) REFERENCES registrations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
    CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON registrations(payment_status);
    CREATE INDEX IF NOT EXISTS idx_delegates_registration_id ON delegates(registration_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_registration_id ON transactions(registration_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(razorpay_order_id);
  `);

  saveDatabase();
  console.log('Database initialized successfully');
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function ensureInitialized() {
  if (!initPromise) {
    initPromise = initDatabase();
  }
  return initPromise;
}

const dbWrapper = {
  prepare: (sql) => {
    return {
      run: async (...params) => {
        await ensureInitialized();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        const lastInsertRowid = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
        stmt.free();
        saveDatabase();
        return { lastInsertRowid };
      },
      get: async (...params) => {
        await ensureInitialized();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        return result;
      },
      all: async (...params) => {
        await ensureInitialized();
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const results = [];
        while (stmt.step()) {
          results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
      }
    };
  },
  transaction: (fn) => {
    return async (...args) => {
      await ensureInitialized();
      try {
        db.run('BEGIN TRANSACTION');
        const result = fn(...args);
        db.run('COMMIT');
        saveDatabase();
        return result;
      } catch (error) {
        db.run('ROLLBACK');
        throw error;
      }
    };
  }
};

module.exports = dbWrapper;
