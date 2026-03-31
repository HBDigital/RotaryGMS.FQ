const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Use absolute path for better reliability
const dbPath = path.resolve(__dirname, '..', 'registrations.db');
let db;
let SQL;
let initPromise;

console.log('Database path:', dbPath);

async function initDatabase() {
  try {
    if (!SQL) {
      SQL = await initSqlJs();
      console.log('✅ SQL.js initialized');
    }
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    console.log('Database directory:', dbDir);
    
    if (!fs.existsSync(dbDir)) {
      console.log('Creating database directory:', dbDir);
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Check directory permissions
    try {
      fs.accessSync(dbDir, fs.constants.W_OK);
      console.log('✅ Database directory is writable');
    } catch (error) {
      console.error('❌ Database directory is not writable:', error);
      throw new Error(`Cannot write to database directory: ${dbDir}`);
    }
    
    if (fs.existsSync(dbPath)) {
      console.log('Loading existing database from:', dbPath);
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
      console.log('✅ Existing database loaded');
    } else {
      console.log('Creating new database at:', dbPath);
      db = new SQL.Database();
      console.log('✅ New database created');
    }

    // Create tables
    const createTablesSQL = `
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

      CREATE TABLE IF NOT EXISTS clubs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
      CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON registrations(payment_status);
      CREATE INDEX IF NOT EXISTS idx_delegates_registration_id ON delegates(registration_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_registration_id ON transactions(registration_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(razorpay_order_id);
    `;

    db.run(createTablesSQL);
    console.log('✅ Database tables created/verified');

    // Migrations - add new columns if they don't exist
    try { db.run('ALTER TABLE registrations ADD COLUMN receipt_no TEXT'); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE registrations ADD COLUMN email_status TEXT DEFAULT 'pending'"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE registrations ADD COLUMN whatsapp_status TEXT DEFAULT 'pending'"); } catch (e) { /* already exists */ }
    console.log('✅ Database migrations applied');

    // Seed clubs if table is empty (use db.exec for sync count check)
    const countResult = db.exec("SELECT COUNT(*) FROM clubs");
    const clubCount = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    if (clubCount === 0) {
      const clubNames = [
        'Coimbatore', 'Coimbatore Central', 'Coimbatore East', 'Coimbatore Mid-Town',
        'Coimbatore North', 'Coimbatore West', 'Palghat', 'Chittur Palghat',
        'Palakkad Green City', 'Metro Dynamix', 'Coimbatore Phoenix', 'Palakkad ACE',
        'E-club of Coimbatore Changemakers', 'E-Club of Coimbatore Pride',
        'Coimbatore Royals', 'Coimbatore Unicorns', 'Palghat East', 'Kovai',
        'Coimbatore Infra', 'Coimbatore Aram', 'Palakkad Central', 'Coimbatore New Town',
        'Coimbatore Metropolis', 'Coimbatore South', 'Coimbatore Aalam', 'Ottapalam',
        'Coimbatore Mitrutva', 'Coimbatore Blossom', 'Coimbatore United', 'Thondamuthur',
        'Coimbatore Satellite', 'Coimbatore Texcity', 'Mannarghat', 'Coimbatore Saicity',
        'Coimbatore Uptown', 'Vadakkencherry Malabar', 'Koduvayur', 'Coimbatore Millennium',
        'Coimbatore Manchester', 'Olavakkode', 'Coimbatore Spectrum', 'Nemmara',
        'Coimbatore Centennial', 'Coimbatore Aakruthi', 'Coimbatore Heritage', 'Pattambi',
        'Coimbatore Zenith', 'Coimbatore Gaalaxy', 'Coimbatore Legend', 'Coimbatore Green City',
        'Coimbatore Cotton City', 'Kovaipudur', 'Coimbatore Wind City', 'Coimbatore Ikons',
        'Coimbatore Downtown', 'Kalladikode', 'Coimbatore Cyber City', 'Shoranur',
        'Coimbatore Cosmopolitan', 'Alathur Central', 'Vadakkencherry', 'Sreekrishnapuram',
        'Palakkad Fort', 'Coimbatore Town', 'Coimbatore Vadavalli', 'Coimbatore Elite',
        'Coimbatore City', "Coimbatore D'elite", 'Coimbatore Monarks', 'Coimbatore Smart City',
        'Coimbatore Meridian', 'Coimbatore Industrial City', 'Rotaract Club',
      ];
      for (const name of clubNames) {
        db.run("INSERT OR IGNORE INTO clubs (name) VALUES (?)", [name]);
      }
      console.log(`✅ Seeded ${clubNames.length} clubs`);
    }

    saveDatabase();
    console.log('✅ Database initialized successfully');
    
    // Test database functionality
    const testResult = db.prepare("SELECT COUNT(*) as count FROM registrations").get();
    console.log('✅ Database test query successful, registrations count:', testResult.count);
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

function saveDatabase() {
  try {
    if (db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    }
  } catch (error) {
    console.error('Failed to save database:', error);
    throw error;
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
        try {
          await ensureInitialized();
          const stmt = db.prepare(sql);
          stmt.bind(params);
          stmt.step();
          const lastInsertRowid = db.exec("SELECT last_insert_rowid() as id")[0]?.values[0]?.[0];
          stmt.free();
          saveDatabase();
          return { lastInsertRowid };
        } catch (error) {
          console.error('Database run error:', error);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw error;
        }
      },
      get: async (...params) => {
        try {
          await ensureInitialized();
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const result = stmt.step() ? stmt.getAsObject() : null;
          stmt.free();
          return result;
        } catch (error) {
          console.error('Database get error:', error);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw error;
        }
      },
      all: async (...params) => {
        try {
          await ensureInitialized();
          const stmt = db.prepare(sql);
          stmt.bind(params);
          const results = [];
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        } catch (error) {
          console.error('Database all error:', error);
          console.error('SQL:', sql);
          console.error('Params:', params);
          throw error;
        }
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
