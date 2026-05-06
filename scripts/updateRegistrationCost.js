const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../registrations.db');

async function updateRegistrationCost() {
  console.log('Loading database...');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const fileBuffer = fs.readFileSync(dbPath);
  db.load(fileBuffer);

  const email = 'vivek@warblerit.com';
  const phone = '9994472344';
  const clubName = 'Coimbatore Manchester';

  console.log(`Searching for registration with email: ${email}, phone: ${phone}, club: ${clubName}`);

  const registration = db.prepare(
    `SELECT id, name, email, phone, club_name, total_amount FROM registrations 
     WHERE email = ? AND phone = ? AND club_name = ?`
  ).get(email, phone, clubName);

  if (!registration) {
    console.log('❌ Registration not found');
    console.log('Searching with partial matches...');
    
    const partialMatches = db.prepare(
      `SELECT id, name, email, phone, club_name, total_amount FROM registrations 
       WHERE email = ? OR phone = ? OR club_name = ?`
    ).all(email, phone, clubName);
    
    if (partialMatches.length > 0) {
      console.log('Found partial matches:');
      partialMatches.forEach(r => {
        console.log(`  ID: ${r.id}, Name: ${r.name}, Email: ${r.email}, Phone: ${r.phone}, Club: ${r.club_name}, Amount: ${r.total_amount}`);
      });
    }
    
    db.close();
    return;
  }

  console.log(`Found registration: ID=${registration.id}, Name=${registration.name}, Current Amount=${registration.total_amount}`);

  const newAmount = 1.00;
  db.prepare(`UPDATE registrations SET total_amount = ? WHERE id = ?`).run(newAmount, registration.id);

  // Also update the transaction amount if exists
  const transactions = db.prepare(`SELECT id, amount FROM transactions WHERE registration_id = ?`).all(registration.id);
  transactions.forEach(tx => {
    console.log(`Updating transaction ID=${tx.id} from ${tx.amount} to ${newAmount}`);
    db.prepare(`UPDATE transactions SET amount = ? WHERE id = ?`).run(newAmount, tx.id);
  });

  // Save database
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  db.close();

  console.log('✅ Registration cost updated to Rs.1.00');
}

updateRegistrationCost().catch(console.error);
