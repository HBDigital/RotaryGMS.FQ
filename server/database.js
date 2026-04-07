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
      CREATE TABLE IF NOT EXISTS reminder_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ag_name TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_registration_id ON transactions(registration_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(razorpay_order_id);
    `;

    db.run(createTablesSQL);
    console.log('✅ Database tables created/verified');

    // Migrations - add new columns if they don't exist
    try { db.run('ALTER TABLE registrations ADD COLUMN receipt_no TEXT'); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE registrations ADD COLUMN email_status TEXT DEFAULT 'pending'"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE registrations ADD COLUMN whatsapp_status TEXT DEFAULT 'pending'"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE clubs ADD COLUMN zone INTEGER DEFAULT NULL"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE clubs ADD COLUMN district_director TEXT DEFAULT NULL"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE clubs ADD COLUMN assistant_governor TEXT DEFAULT NULL"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE clubs ADD COLUMN ggr TEXT DEFAULT NULL"); } catch (e) { /* already exists */ }
    try { db.run("ALTER TABLE clubs ADD COLUMN ag_phone TEXT DEFAULT NULL"); } catch (e) { /* already exists */ }
    console.log('✅ Database migrations applied');

    // Seed AG phone numbers (always update so new entries get phones)
    const agPhones = [
      ['Rtn. Maruthachalam S',        '9894020222'],
      ['Rtn. Paul William W',          '9363129292'],
      ['Rtn. Dr. Fredricks John',      '9345912889'],
      ['Rtn. Bhavik Momaya',           '9677772172'],
      ['Rtn. Dr. Deepana S N',         '9865261200'],
      ['Rtn. Vijay C R',               '9366613384'],
      ['Rtn. Krishna Murthy Rao S',    '9843015541'],
      ['Rtn. Prabhu S',                '9488836000'],
      ['Rtn. John Singarayar A',       '9500946666'],
      ['Rtn. Gurpreet Singh',          '9843072720'],
      ['Rtn. Ramakrishnan M',          '9843973000'],
      ['Rtn. Dr. Rohini Sharma',       '9453011667'],
      ['Rtn. Dr. Muthukumar S',        '9387217326'],
      ['Rtn. Dr. Latha Nair',          '9447706453'],
      ['Rtn. Vinu Jacob Thomas',       '9495227943'],
      ['Rtn. Pratheesh Radhakrishnan', '9446147967'],
      ['Rtn. Sujith Chandran',         '9809261991'],
      ['Rtn. Vijayan K V',             '8547290255'],
    ];
    for (const [ag, phone] of agPhones) {
      db.run("UPDATE clubs SET ag_phone = ? WHERE assistant_governor = ?", [phone, ag]);
    }
    console.log('✅ AG phone numbers seeded');

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
      console.log(`\u2705 Seeded ${clubNames.length} clubs`);
    }

    // Seed district hierarchy (DD/AG/GGR) assignments for clubs
    const hierarchyResult = db.exec("SELECT COUNT(*) FROM clubs WHERE district_director IS NOT NULL");
    const assignedCount = hierarchyResult.length > 0 ? hierarchyResult[0].values[0][0] : 0;
    if (assignedCount === 0) {
      const clubAssignments = [
        // Zone 1 — DD: Rtn. Dr. Vijayakumar N — AG: Rtn. Maruthachalam S
        ['Coimbatore Gaalaxy', 1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Maruthachalam S', 'Rtn. Krishnakumar R'],
        ['Thondamuthur',       1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Maruthachalam S', 'Rtn. Krishnakumar R'],
        ['Coimbatore Millennium', 1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Maruthachalam S', 'Rtn. Muthukumar K'],
        ['Coimbatore West',    1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Maruthachalam S', 'Rtn. Muthukumar K'],
        ['Coimbatore Downtown',1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Maruthachalam S', 'Rtn. Muthukumar K'],
        // Zone 1 — DD: Rtn. Dr. Vijayakumar N — AG: Rtn. Paul William W
        ['Coimbatore Ikons',   1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Paul William W', 'Rtn. Venkatesh D'],
        ['Coimbatore',         1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Paul William W', 'Rtn. Venkatesh D'],
        ['Coimbatore Phoenix', 1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Paul William W', 'Rtn. Dr. Sathish Kumar M'],
        ['Coimbatore Blossom', 1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Paul William W', 'Rtn. Dr. Sathish Kumar M'],
        ['Coimbatore Centennial',1,'Rtn. Dr. Vijayakumar N','Rtn. Paul William W', 'Rtn. Dr. Sathish Kumar M'],
        // Zone 1 — DD: Rtn. Dr. Vijayakumar N — AG: Rtn. Dr. Fredricks John
        ['Coimbatore Elite',   1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Dr. Fredricks John', 'Rtn. Dr. Nirmala Natarajan'],
        ['Coimbatore Satellite',1,'Rtn. Dr. Vijayakumar N', 'Rtn. Dr. Fredricks John', 'Rtn. Dr. Nirmala Natarajan'],
        ['Coimbatore Heritage',1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Dr. Fredricks John', 'Rtn. Ramkumar A'],
        ['Coimbatore Vadavalli',1,'Rtn. Dr. Vijayakumar N', 'Rtn. Dr. Fredricks John', 'Rtn. Ramkumar A'],
        // Zone 1 — DD: Rtn. Manivanan T — AG: Rtn. Bhavik Momaya
        ['Coimbatore Meridian',1, 'Rtn. Manivanan T', 'Rtn. Bhavik Momaya', 'Rtn. Rajadurai S'],
        ["Coimbatore D'elite", 1, 'Rtn. Manivanan T', 'Rtn. Bhavik Momaya', 'Rtn. Rajadurai S'],
        ['Coimbatore City',    1, 'Rtn. Manivanan T', 'Rtn. Bhavik Momaya', 'Rtn. Rajadurai S'],
        ['Coimbatore Aalam',   1, 'Rtn. Manivanan T', 'Rtn. Bhavik Momaya', 'Rtn. Jayamurali B'],
        ['Coimbatore Aakruthi',1, 'Rtn. Manivanan T', 'Rtn. Bhavik Momaya', 'Rtn. Jayamurali B'],
        // Zone 1 — DD: Rtn. Manivanan T — AG: Rtn. Dr. Deepana S N
        ['Coimbatore Texcity', 1, 'Rtn. Manivanan T', 'Rtn. Dr. Deepana S N', 'Rtn. Raj Siddarth'],
        ['Metro Dynamix',      1, 'Rtn. Manivanan T', 'Rtn. Dr. Deepana S N', 'Rtn. Raj Siddarth'],
        ['Coimbatore Legend',  1, 'Rtn. Manivanan T', 'Rtn. Dr. Deepana S N', 'Rtn. Thulasisethu'],
        ['Coimbatore Saicity', 1, 'Rtn. Manivanan T', 'Rtn. Dr. Deepana S N', 'Rtn. Thulasisethu'],
        ['Coimbatore Central', 1, 'Rtn. Manivanan T', 'Rtn. Dr. Deepana S N', 'Rtn. Thulasisethu'],
        // Zone 1 — DD: Rtn. Manivanan T — AG: Rtn. Vijay C R
        ['Coimbatore Monarks', 1, 'Rtn. Manivanan T', 'Rtn. Vijay C R', 'Rtn. Kumarpal K Daga'],
        ['Coimbatore Zenith',  1, 'Rtn. Manivanan T', 'Rtn. Vijay C R', 'Rtn. Manikantan VAJ'],
        ['Coimbatore Aram',    1, 'Rtn. Manivanan T', 'Rtn. Vijay C R', 'Rtn. Manikantan VAJ'],
        // Zone 2 — DD: Rtn. Nagaraj K C — AG: Rtn. Krishna Murthy Rao S
        ['Coimbatore East',    2, 'Rtn. Nagaraj K C', 'Rtn. Krishna Murthy Rao S', 'Rtn. Saravanan R'],
        ['Coimbatore Green City',2,'Rtn. Nagaraj K C','Rtn. Krishna Murthy Rao S', 'Rtn. Saravanan R'],
        ['Coimbatore Unicorns',2, 'Rtn. Nagaraj K C', 'Rtn. Krishna Murthy Rao S', 'Rtn. Saravanan R'],
        ['Coimbatore Smart City',2,'Rtn. Nagaraj K C','Rtn. Krishna Murthy Rao S', 'Rtn. Ramesh C P'],
        ['Coimbatore Cyber City',2,'Rtn. Nagaraj K C','Rtn. Krishna Murthy Rao S', 'Rtn. Ramesh C P'],
        // Zone 2 — DD: Rtn. Nagaraj K C — AG: Rtn. Prabhu S
        ['Coimbatore New Town',2, 'Rtn. Nagaraj K C', 'Rtn. Prabhu S', 'Rtn. Kaneshan R D'],
        ['Kovaipudur',         2, 'Rtn. Nagaraj K C', 'Rtn. Prabhu S', 'Rtn. Srinivasan B'],
        ['E-Club of Coimbatore Pride',2,'Rtn. Nagaraj K C','Rtn. Prabhu S','Rtn. Srinivasan B'],
        ['Coimbatore Mid-Town',2, 'Rtn. Nagaraj K C', 'Rtn. Prabhu S', 'Rtn. Srinivasan B'],
        ['Coimbatore United',  2, 'Rtn. Nagaraj K C', 'Rtn. Prabhu S', 'Rtn. Kaneshan R D'],
        // Zone 2 — DD: Rtn. Nagaraj K C — AG: Rtn. John Singarayar A
        ['Coimbatore Infra',   2, 'Rtn. Nagaraj K C', 'Rtn. John Singarayar A', 'Rtn. Kesavaraj V N'],
        ['Kovai',              2, 'Rtn. Nagaraj K C', 'Rtn. John Singarayar A', 'Rtn. Kesavaraj V N'],
        ['Coimbatore Town',    2, 'Rtn. Nagaraj K C', 'Rtn. John Singarayar A', 'Rtn. Sathish Kumar R'],
        ['Coimbatore South',   2, 'Rtn. Nagaraj K C', 'Rtn. John Singarayar A', 'Rtn. Sathish Kumar R'],
        // Zone 2 — DD: Rtn. Swaminathan S G — AG: Rtn. Gurpreet Singh
        ['Coimbatore Metropolis',2,'Rtn. Swaminathan S G','Rtn. Gurpreet Singh','Rtn. Vijayakumar R'],
        ['E-club of Coimbatore Changemakers',2,'Rtn. Swaminathan S G','Rtn. Gurpreet Singh','Rtn. Vijayakumar R'],
        ['Coimbatore Manchester',2,'Rtn. Swaminathan S G','Rtn. Gurpreet Singh','Rtn. Vijayakumar R'],
        ['Coimbatore Royals',  2, 'Rtn. Swaminathan S G', 'Rtn. Gurpreet Singh', 'Rtn. Vadivel R'],
        ['Coimbatore Cosmopolitan',2,'Rtn. Swaminathan S G','Rtn. Gurpreet Singh','Rtn. Vadivel R'],
        // Zone 2 — DD: Rtn. Swaminathan S G — AG: Rtn. Ramakrishnan M
        ['Coimbatore North',   2, 'Rtn. Swaminathan S G', 'Rtn. Ramakrishnan M', 'Rtn. Prakash Kuttappan'],
        ['Coimbatore Wind City',2,'Rtn. Swaminathan S G','Rtn. Ramakrishnan M','Rtn. Vijayakumar R'],
        ['Coimbatore Industrial City',2,'Rtn. Swaminathan S G','Rtn. Ramakrishnan M','Rtn. Vijayakumar R'],
        // Zone 2 — DD: Rtn. Swaminathan S G — AG: Rtn. Dr. Rohini Sharma
        ['Coimbatore Mitrutva',2, 'Rtn. Swaminathan S G', 'Rtn. Dr. Rohini Sharma', 'Rtn. Bharat D Shah'],
        ['Coimbatore Cotton City',2,'Rtn. Swaminathan S G','Rtn. Dr. Rohini Sharma','Rtn. Bharat D Shah'],
        ['Coimbatore Spectrum',2, 'Rtn. Swaminathan S G', 'Rtn. Dr. Rohini Sharma', 'Rtn. Gokula Krishnan A'],
        ['Coimbatore Uptown',  2, 'Rtn. Swaminathan S G', 'Rtn. Dr. Rohini Sharma', 'Rtn. Gokula Krishnan A'],
      ];
      for (const [name, zone, dd, ag, ggr] of clubAssignments) {
        db.run(
          "UPDATE clubs SET zone = ?, district_director = ?, assistant_governor = ?, ggr = ? WHERE name = ?",
          [zone, dd, ag, ggr, name]
        );
      }
      console.log(`✅ Seeded district hierarchy for ${clubAssignments.length} clubs`);
    }

    // Always-run: insert missing clubs + assign Zone 3 and any omitted Zone 1/2 clubs
    const extraClubNames = ['Coimbatore Siruvani', 'Coimbatore Sangamam', 'Coimbatore Rise', 'Coimbatore Global'];
    for (const name of extraClubNames) {
      db.run("INSERT OR IGNORE INTO clubs (name) VALUES (?)", [name]);
    }

    const zone3AndMissing = [
      // Zone 1 missing clubs
      ['Coimbatore Siruvani', 1, 'Rtn. Dr. Vijayakumar N', 'Rtn. Dr. Fredricks John',  'Rtn. Ramkumar A'],
      ['Coimbatore Sangamam', 1, 'Rtn. Manivanan T',       'Rtn. Dr. Deepana S N',     'Rtn. Raj Siddarth'],
      // Zone 2 missing clubs
      ['Coimbatore Rise',     2, 'Rtn. Swaminathan S G',   'Rtn. Ramakrishnan M',       'Rtn. Prakash Kuttappan'],
      ['Coimbatore Global',   2, 'Rtn. Swaminathan S G',   'Rtn. Dr. Rohini Sharma',    'Rtn. Gokula Krishnan A'],
      // Zone 3 — DD: Rtn. Rajesh P Nair — AG: Rtn. Dr. Muthukumar S
      ['Palghat',                  3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Muthukumar S',        'Rtn. Dr. Sharath K B Menon'],
      ['Palakkad ACE',             3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Muthukumar S',        'Rtn. Dr. Sharath K B Menon'],
      ['Chittur Palghat',          3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Muthukumar S',        'Rtn. Ramanarayana E P'],
      ['Palakkad Central',         3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Muthukumar S',        'Rtn. Ramanarayana E P'],
      // Zone 3 — DD: Rtn. Rajesh P Nair — AG: Rtn. Dr. Latha Nair
      ['Olavakkode',               3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Latha Nair',          'Rtn. Raj C'],
      ['Palghat East',             3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Latha Nair',          'Rtn. Raj C'],
      ['Palakkad Fort',            3, 'Rtn. Rajesh P Nair', 'Rtn. Dr. Latha Nair',          'Rtn. Raj C'],
      // Zone 3 — DD: Rtn. Rajesh P Nair — AG: Rtn. Vinu Jacob Thomas
      ['Mannarghat',               3, 'Rtn. Rajesh P Nair', 'Rtn. Vinu Jacob Thomas',       'Rtn. Mohanan S'],
      ['Kalladikode',              3, 'Rtn. Rajesh P Nair', 'Rtn. Vinu Jacob Thomas',       'Rtn. Dr. Krishnakumar R C'],
      ['Sreekrishnapuram',         3, 'Rtn. Rajesh P Nair', 'Rtn. Vinu Jacob Thomas',       'Rtn. Dr. Krishnakumar R C'],
      // Zone 3 — DD: Rtn. Ramlal C B — AG: Rtn. Pratheesh Radhakrishnan
      ['Vadakkencherry Malabar',   3, 'Rtn. Ramlal C B',   'Rtn. Pratheesh Radhakrishnan', 'Rtn. Asok Kumar K V'],
      ['Nemmara',                  3, 'Rtn. Ramlal C B',   'Rtn. Pratheesh Radhakrishnan', 'Rtn. Asok Kumar K V'],
      ['Pattambi',                 3, 'Rtn. Ramlal C B',   'Rtn. Pratheesh Radhakrishnan', 'Rtn. Suresh Kumar R'],
      // Zone 3 — DD: Rtn. Ramlal C B — AG: Rtn. Sujith Chandran
      ['Alathur Central',          3, 'Rtn. Ramlal C B',   'Rtn. Sujith Chandran',         'Rtn. Sunil Ammath'],
      ['Ottapalam',                3, 'Rtn. Ramlal C B',   'Rtn. Sujith Chandran',         'Rtn. Sunil Ammath'],
      ['Koduvayur',                3, 'Rtn. Ramlal C B',   'Rtn. Sujith Chandran',         'Rtn. Sudeep P R'],
      // Zone 3 — DD: Rtn. Ramlal C B — AG: Rtn. Vijayan K V
      ['Vadakkencherry',           3, 'Rtn. Ramlal C B',   'Rtn. Vijayan K V',             'Rtn. Haridasan V'],
      ['Palakkad Green City',      3, 'Rtn. Ramlal C B',   'Rtn. Vijayan K V',             'Rtn. Haridasan V'],
      ['Shoranur',                 3, 'Rtn. Ramlal C B',   'Rtn. Vijayan K V',             'Rtn. Ajith Erattakkulam'],
    ];
    for (const [name, zone, dd, ag, ggr] of zone3AndMissing) {
      db.run("UPDATE clubs SET zone = ?, district_director = ?, assistant_governor = ?, ggr = ? WHERE name = ?",
        [zone, dd, ag, ggr, name]);
    }
    console.log(`✅ Zone 3 + missing clubs hierarchy applied (${zone3AndMissing.length} clubs)`);

    // Re-apply phone numbers so newly-inserted clubs also get ag_phone
    for (const [ag, phone] of agPhones) {
      db.run("UPDATE clubs SET ag_phone = ? WHERE assistant_governor = ?", [phone, ag]);
    }
    console.log('✅ AG phone numbers re-applied after club inserts');

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
