# 🗄️ Database Connection Troubleshooting

## 🚨 Common Database Connection Issues

### 1. **SQLite Database File Path Issues**
- Database file doesn't exist
- Wrong file path in production
- Permissions preventing file creation

### 2. **File System Permissions**
- Application can't write to database directory
- Incorrect ownership of database files
- Missing directory structure

### 3. **Environment Variables**
- Database path not configured correctly
- Working directory issues

## 🔍 Step-by-Step Database Diagnosis

### Step 1: Check if Database File Exists
```bash
# SSH into your server
ssh -i your-key.pem ubuntu@your-server-ip

# Check if database file exists
ls -la /var/www/gmsfeequick/server/registrations.db
ls -la /var/www/gmsfeequick/registrations.db
ls -la /var/www/gmsfeequick/server/

# Check application directory structure
find /var/www/gmsfeequick -name "*.db" -type f
```

### Step 2: Check Directory Permissions
```bash
# Check permissions on application directory
ls -la /var/www/gmsfeequick/
ls -la /var/www/gmsfeequick/server/

# Check current user and groups
whoami
groups

# Check if application can write to directory
sudo -u ubuntu touch /var/www/gmsfeequick/server/test.db
sudo -u ubuntu rm /var/www/gmsfeequick/server/test.db
```

### Step 3: Fix Database Permissions
```bash
# Create server directory if it doesn't exist
sudo mkdir -p /var/www/gmsfeequick/server

# Set correct ownership
sudo chown -R ubuntu:ubuntu /var/www/gmsfeequick/

# Set correct permissions
sudo chmod 755 /var/www/gmsfeequick/
sudo chmod 755 /var/www/gmsfeequick/server/
sudo chmod 644 /var/www/gmsfeequick/server/registrations.db 2>/dev/null || true

# Test write permissions
sudo -u ubuntu touch /var/www/gmsfeequick/server/write-test
if [ -f /var/www/gmsfeequick/server/write-test ]; then
    echo "✅ Write permissions OK"
    rm /var/www/gmsfeequick/server/write-test
else
    echo "❌ Write permissions FAILED"
fi
```

### Step 4: Check PM2 Process and Logs
```bash
# Check PM2 status
pm2 status

# Check application logs for database errors
pm2 logs gmsfeequick --lines 100

# Look for specific database errors
pm2 logs gmsfeequick | grep -i "database\|sqlite\|permission\|enoent\|eacces"
```

### Step 5: Test Database Creation Manually
```bash
# Navigate to application directory
cd /var/www/gmsfeequick

# Create a simple database test script
cat > test-db.js << 'EOF'
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function testDatabase() {
    try {
        console.log('Testing database creation...');
        
        // Initialize SQL.js
        const SQL = await initSqlJs();
        console.log('✅ SQL.js initialized');
        
        // Test database path
        const dbPath = path.join(__dirname, 'server', 'registrations.db');
        console.log('Database path:', dbPath);
        
        // Ensure directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            console.log('Creating directory:', dbDir);
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // Create database
        const db = new SQL.Database();
        console.log('✅ Database created in memory');
        
        // Create a test table
        db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
        console.log('✅ Test table created');
        
        // Insert test data
        db.run('INSERT INTO test (name) VALUES (?)', ['Test Entry']);
        console.log('✅ Test data inserted');
        
        // Save database
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        console.log('✅ Database saved to:', dbPath);
        
        // Verify file exists
        if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            console.log('✅ Database file exists, size:', stats.size, 'bytes');
        } else {
            console.log('❌ Database file was not created');
        }
        
        console.log('🎉 Database test completed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

testDatabase();
EOF

# Run the test
node test-db.js

# Clean up
rm test-db.js
```

## 🛠️ Enhanced Database Configuration

### Update database.js with Better Path Handling
Replace your current `server/database.js` with this enhanced version:

```javascript
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

      CREATE INDEX IF NOT EXISTS idx_registrations_email ON registrations(email);
      CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON registrations(payment_status);
      CREATE INDEX IF NOT EXISTS idx_delegates_registration_id ON delegates(registration_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_registration_id ON transactions(registration_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(razorpay_order_id);
    `;

    db.run(createTablesSQL);
    console.log('✅ Database tables created/verified');

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
      // console.log('💾 Database saved successfully');
    }
  } catch (error) {
    console.error('❌ Failed to save database:', error);
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
          console.error('❌ Database run error:', error);
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
          console.error('❌ Database get error:', error);
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
          console.error('❌ Database all error:', error);
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

## 🚀 Quick Fix Commands

### One-Command Database Fix
```bash
# SSH into server and run this complete fix
cd /var/www/gmsfeequick && \
sudo mkdir -p server && \
sudo chown -R ubuntu:ubuntu . && \
sudo chmod -R 755 . && \
pm2 restart gmsfeequick && \
pm2 logs gmsfeequick --lines 20
```

### Manual Database Initialization
```bash
# Create database manually
cd /var/www/gmsfeequick
node -e "
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync('server/registrations.db', buffer);
  console.log('Database created successfully');
})();
"
```

## 📊 Database Health Check Script

Create this script to monitor database health:

```bash
cat > /home/ubuntu/db-health-check.sh << 'EOF'
#!/bin/bash

echo "🔍 Database Health Check"
echo "========================"

DB_PATH="/var/www/gmsfeequick/server/registrations.db"

# Check if database file exists
if [ -f "$DB_PATH" ]; then
    echo "✅ Database file exists: $DB_PATH"
    echo "   Size: $(du -h "$DB_PATH" | cut -f1)"
    echo "   Modified: $(stat -cki "$DB_PATH" | grep 'Modify:' | cut -d' ' -f2-)"
else
    echo "❌ Database file missing: $DB_PATH"
fi

# Check directory permissions
if [ -w "/var/www/gmsfeequick/server/" ]; then
    echo "✅ Database directory is writable"
else
    echo "❌ Database directory is not writable"
fi

# Check PM2 status
echo ""
echo "📊 PM2 Status:"
pm2 status | grep gmsfeequick

# Check recent logs for database errors
echo ""
echo "📋 Recent Database Errors:"
pm2 logs gmsfeequick --lines 10 | grep -i "database\|sqlite\|permission\|enoent\|eacces" || echo "No database errors found"

echo ""
echo "🎯 Next Steps:"
echo "1. If database file is missing, run: node -e 'require('./server/database.js')'"
echo "2. If permissions are wrong, run: sudo chown -R ubuntu:ubuntu /var/www/gmsfeequick/"
echo "3. Restart application: pm2 restart gmsfeequick"
EOF

chmod +x /home/ubuntu/db-health-check.sh
```

Run the health check:
```bash
/home/ubuntu/db-health-check.sh
```

## 🎯 Most Likely Solutions

Based on common issues, try these in order:

1. **Fix Permissions (90% success rate):**
   ```bash
   sudo chown -R ubuntu:ubuntu /var/www/gmsfeequick/
   sudo chmod -R 755 /var/www/gmsfeequick/
   pm2 restart gmsfeequick
   ```

2. **Create Database Manually:**
   ```bash
   cd /var/www/gmsfeequick
   mkdir -p server
   node -e "require('sql.js').then(SQL => { const db = new SQL.Database(); require('fs').writeFileSync('server/registrations.db', Buffer.from(db.export())); console.log('Database created'); })"
   ```

3. **Check Environment:**
   ```bash
   pm2 restart gmsfeequick
   pm2 logs gmsfeequick --lines 50
   ```

The enhanced database.js file will provide detailed logging to help you identify exactly what's going wrong with the database connection.
