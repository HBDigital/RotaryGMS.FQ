const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const dbPath = path.join(__dirname, '../registrations.db');
const csvPath = '/Users/vivek/Desktop/3206_contacts.csv';

async function importContacts() {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Load existing database
  const fileBuffer = fs.readFileSync(dbPath);
  db.load(fileBuffer);

  let imported = 0;
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split(',');
    if (parts.length < 3) continue;

    const name = parts[0]?.trim() || '';
    const club_name = parts[1]?.trim() || '';
    const phone = parts[2]?.trim().replace(/\D/g, '').slice(-10) || null;
    const email = parts[3]?.trim() || null;
    const role = parts[4]?.trim() || '';
    const zone = parts[5]?.trim() || '';

    if (!name || !club_name || !role || !zone) {
      skipped++;
      continue;
    }

    try {
      db.run(
        `INSERT INTO district_contacts (name, club_name, phone, email, role, zone)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, club_name, phone, email, role, zone]
      );
      imported++;
    } catch (e) {
      // Skip duplicates
      skipped++;
    }
  }

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  db.close();

  console.log(`✅ Import complete: ${imported} imported, ${skipped} skipped`);
}

importContacts().catch(console.error);
