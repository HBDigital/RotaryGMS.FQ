# 🔧 Registration Error Troubleshooting Guide

## 🚨 Common Causes of "Failed to create registration" Error

### 1. **Database Permission Issues** (Most Common)
- SQLite database file not writable
- File permissions incorrect on server
- Database file doesn't exist and can't be created

### 2. **Environment Variables Missing**
- `.env` file not found in production
- Required variables not set
- Incorrect values in production environment

### 3. **CORS Issues**
- Frontend URL not properly configured
- CORS blocking API requests

### 4. **Database Path Issues**
- Database path incorrect in production
- File system permissions

### 5. **Server Configuration Issues**
- Port conflicts
- Process not running with correct permissions

## 🔍 Step-by-Step Troubleshooting

### Step 1: Check Server Logs
```bash
# Check application logs
pm2 logs gmsfeequick

# Or if running directly:
tail -f /var/log/gmsfeequick/error.log

# Check system logs
sudo journalctl -u nginx -f
```

### Step 2: Verify Database Permissions
```bash
# Check if database file exists
ls -la /var/www/gmsfeequick/server/registrations.db

# Check directory permissions
ls -la /var/www/gmsfeequick/server/

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/gmsfeequick/server/
sudo chmod 755 /var/www/gmsfeequick/server/
sudo chmod 644 /var/www/gmsfeequick/server/registrations.db

# Or for Ubuntu with specific user:
sudo chown -R ubuntu:ubuntu /var/www/gmsfeequick/server/
```

### Step 3: Test API Endpoint Directly
```bash
# Test health endpoint
curl -X GET https://gms.feequick.com/api/health

# Test registration endpoint with sample data
curl -X POST https://gms.feequick.com/api/registrations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "club_name": "Test Club",
    "delegate_count": 1,
    "delegates": [{"name": "Test Delegate", "designation": "Member"}]
  }'
```

### Step 4: Check Environment Variables
```bash
# Check if .env file exists
ls -la /var/www/gmsfeequick/.env*

# View environment variables
cat /var/www/gmsfeequick/.env.production

# Verify required variables:
# - PORT
# - RAZORPAY_KEY_ID
# - RAZORPAY_KEY_SECRET
# - FRONTEND_URL
# - NODE_ENV
```

### Step 5: Verify PM2 Process Status
```bash
# Check PM2 status
pm2 status

# Check specific process details
pm2 show gmsfeequick

# Restart if needed
pm2 restart gmsfeequick
```

## 🛠️ Enhanced Error Handling Implementation

### Update Database Error Handling
Replace the current database.js with enhanced error handling:

```javascript
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'registrations.db');
let db;
let SQL;
let initPromise;

async function initDatabase() {
  try {
    if (!SQL) {
      SQL = await initSqlJs();
    }
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    if (fs.existsSync(dbPath)) {
      console.log('Loading existing database from:', dbPath);
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      console.log('Creating new database at:', dbPath);
      db = new SQL.Database();
    }

    // Create tables
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
  } catch (error) {
    console.error('Database initialization failed:', error);
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
```

### Enhanced Registration Route Error Handling
Update the registration route with better error messages:

```javascript
router.post('/registrations', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
    const { name, email, phone, club_name, delegate_count, delegates } = req.body;

    // Enhanced validation
    if (!name || !email || !phone || !club_name || !delegate_count || !delegates) {
      console.error('Missing required fields:', { name, email, phone, club_name, delegate_count, delegates });
      return res.status(400).json({ 
        error: 'All fields are required',
        missing: { name, email, phone, club_name, delegate_count, delegates }
      });
    }

    if (delegates.length !== delegate_count) {
      console.error('Delegate count mismatch:', { delegate_count, delegatesLength: delegates.length });
      return res.status(400).json({ 
        error: 'Delegate count mismatch',
        expected: delegate_count,
        received: delegates.length
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate phone format
    if (!/^[0-9]{10}$/.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ error: 'Phone must be 10 digits' });
    }

    const total_amount = delegate_count * 1000;
    console.log('Creating registration:', { name, email, total_amount });

    const insertRegistration = db.prepare(`
      INSERT INTO registrations (name, email, phone, club_name, delegate_count, total_amount, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = await insertRegistration.run(name, email, phone, club_name, delegate_count, total_amount);
    const registrationId = result.lastInsertRowid;
    
    console.log('Registration created with ID:', registrationId);

    const insertDelegate = db.prepare(`
      INSERT INTO delegates (registration_id, delegate_name, delegate_designation)
      VALUES (?, ?, ?)
    `);

    for (const delegate of delegates) {
      if (!delegate.name || !delegate.designation) {
        throw new Error(`Delegate name and designation are required for delegate ${delegates.indexOf(delegate) + 1}`);
      }
      await insertDelegate.run(registrationId, delegate.name, delegate.designation);
    }

    console.log('Delegates added for registration:', registrationId);

    res.status(201).json({
      success: true,
      registrationId: registrationId,
      total_amount: total_amount,
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    console.error('Stack trace:', error.stack);
    
    // Provide more specific error messages
    if (error.message.includes('SQLITE')) {
      res.status(500).json({ 
        error: 'Database error occurred',
        details: error.message 
      });
    } else if (error.message.includes('permission')) {
      res.status(500).json({ 
        error: 'File permission error',
        details: 'Server cannot write to database file'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create registration',
        details: error.message 
      });
    }
  }
});
```

## 🚀 Quick Fix Script

Create a script to fix common issues:

```bash
#!/bin/bash
# fix-registration-issues.sh

echo "🔧 Fixing registration issues..."

# Fix database permissions
echo "📁 Fixing database permissions..."
sudo mkdir -p /var/www/gmsfeequick/server
sudo chown -R ubuntu:ubuntu /var/www/gmsfeequick/
sudo chmod -R 755 /var/www/gmsfeequick/

# Restart PM2
echo "🔄 Restarting application..."
pm2 restart gmsfeequick

# Test API
echo "🧪 Testing API..."
curl -s https://gms.feequick.com/api/health

echo "✅ Fix complete!"
```

## 📞 Support Checklist

Before contacting support, verify:

1. ✅ Server logs checked for specific error messages
2. ✅ Database permissions verified
3. ✅ Environment variables confirmed
4. ✅ API endpoints tested directly
5. ✅ PM2 process status confirmed
6. ✅ Nginx configuration verified
7. ✅ SSL certificate valid

## 🔍 Debug Mode

Temporarily enable debug mode:

```javascript
// In server/index.js, add this line after require('dotenv').config();
process.env.DEBUG = 'true';
```

This will provide more detailed logging to help identify the exact issue.
