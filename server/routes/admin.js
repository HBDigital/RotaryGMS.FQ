const express = require('express');
const router = express.Router();
const db = require('../database');
const XLSX = require('xlsx');
const { sendWhatsAppAGReminder } = require('../utils/whatsapp');

router.get('/admin/summary', async (req, res) => {
  try {
    const totalRegistrations = await db.prepare(`
      SELECT COUNT(*) as count FROM registrations WHERE payment_status = 'success'
    `).get();

    const totalDelegates = await db.prepare(`
      SELECT COUNT(*) as count FROM delegates 
      WHERE registration_id IN (SELECT id FROM registrations WHERE payment_status = 'success')
    `).get();

    const totalAmount = await db.prepare(`
      SELECT SUM(total_amount) as total FROM registrations WHERE payment_status = 'success'
    `).get();

    const pendingPayments = await db.prepare(`
      SELECT COUNT(*) as count FROM registrations WHERE payment_status = 'pending'
    `).get();

    const failedPayments = await db.prepare(`
      SELECT COUNT(*) as count FROM registrations WHERE payment_status = 'failed'
    `).get();

    res.status(200).json({
      success: true,
      summary: {
        totalRegistrations: totalRegistrations.count,
        totalDelegates: totalDelegates.count,
        totalAmount: totalAmount.total || 0,
        pendingPayments: pendingPayments.count,
        failedPayments: failedPayments.count,
      },
    });
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// Paginated transactions endpoint
router.get('/admin/transactions', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const totalCount = await db.prepare(`SELECT COUNT(*) as count FROM transactions`).get();

    const transactions = await db.prepare(`
      SELECT 
        t.*,
        r.name,
        r.email,
        r.club_name,
        r.receipt_no
      FROM transactions t
      LEFT JOIN registrations r ON t.registration_id = r.id
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        total: totalCount.count,
        page,
        limit,
        totalPages: Math.ceil(totalCount.count / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

router.get('/admin/registrations', async (req, res) => {
  try {
    const registrations = await db.prepare(`
      SELECT * FROM registrations WHERE payment_status = 'success' ORDER BY created_at DESC
    `).all();

    const registrationsWithDelegates = await Promise.all(registrations.map(async registration => {
      const delegates = await db.prepare(`
        SELECT delegate_name, delegate_designation 
        FROM delegates 
        WHERE registration_id = ?
      `).all(registration.id);
      return { ...registration, delegates };
    }));

    res.status(200).json({
      success: true,
      registrations: registrationsWithDelegates,
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Excel export - each delegate on a separate row, transaction details repeated
router.get('/admin/export-excel', async (req, res) => {
  try {
    const registrations = await db.prepare(`
      SELECT 
        r.id, r.receipt_no, r.name, r.email, r.phone, r.club_name,
        r.delegate_count, r.total_amount, r.payment_status,
        r.razorpay_order_id, r.razorpay_payment_id, r.created_at,
        r.email_status, r.whatsapp_status
      FROM registrations r
      WHERE r.payment_status = 'success'
      ORDER BY r.id ASC
    `).all();

    const rows = [];

    for (const reg of registrations) {
      const delegates = await db.prepare(`
        SELECT delegate_name, delegate_designation FROM delegates WHERE registration_id = ?
      `).all(reg.id);

      delegates.forEach((delegate, index) => {
        rows.push({
          'Receipt No': reg.receipt_no || '',
          'Reg ID': reg.id,
          'Name': reg.name,
          'Email': reg.email,
          'Phone': reg.phone,
          'Club Name': reg.club_name,
          'Total Delegates': reg.delegate_count,
          'Amount (₹)': reg.total_amount,
          'Payment Status': reg.payment_status,
          'Email Status': reg.email_status || 'pending',
          'WhatsApp Status': reg.whatsapp_status || 'pending',
          'Razorpay Order ID': reg.razorpay_order_id || '',
          'Razorpay Payment ID': reg.razorpay_payment_id || '',
          'Registration Date': reg.created_at,
          'Delegate #': index + 1,
          'Delegate Name': delegate.delegate_name,
          'Delegate Designation': delegate.delegate_designation,
        });
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = Object.keys(rows[0] || {}).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String(r[key] || '').length)) + 2,
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=GMS2026_Registrations_${Date.now()}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({ error: 'Failed to export Excel' });
  }
});

// Get all active clubs (public - used by registration form)
router.get('/clubs', async (req, res) => {
  try {
    const clubs = await db.prepare(`SELECT id, name FROM clubs WHERE active = 1 ORDER BY name ASC`).all();
    res.status(200).json({ success: true, clubs });
  } catch (error) {
    console.error('Error fetching clubs:', error);
    res.status(500).json({ error: 'Failed to fetch clubs' });
  }
});

// Admin: add a new club
router.post('/admin/clubs', async (req, res) => {
  try {
    const { name, assistant_governor } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Club name is required' });

    if (assistant_governor) {
      const agInfo = await db.prepare(
        `SELECT DISTINCT district_director, zone FROM clubs WHERE assistant_governor = ? LIMIT 1`
      ).get(assistant_governor);
      await db.prepare(
        `INSERT OR IGNORE INTO clubs (name, assistant_governor, district_director, zone)
         VALUES (?, ?, ?, ?)`
      ).run(name.trim(), assistant_governor, agInfo?.district_director || null, agInfo?.zone || null);
    } else {
      await db.prepare(`INSERT OR IGNORE INTO clubs (name) VALUES (?)`).run(name.trim());
    }
    res.status(201).json({ success: true, message: 'Club added' });
  } catch (error) {
    console.error('Error adding club:', error);
    res.status(500).json({ error: 'Failed to add club' });
  }
});

// Admin: district report — clubs grouped by DD → AG with compliance status
router.get('/admin/district-report', async (req, res) => {
  try {
    const clubs = await db.prepare(`
      SELECT
        c.id,
        c.name,
        c.zone,
        c.district_director,
        c.assistant_governor,
        c.ggr,
        r.total_delegates AS delegate_count,
        r.registration_count,
        r.receipt_nos,
        r.payment_status
      FROM clubs c
      LEFT JOIN (
        SELECT
          club_name,
          SUM(delegate_count)  AS total_delegates,
          COUNT(*)             AS registration_count,
          GROUP_CONCAT(receipt_no, ', ') AS receipt_nos,
          'success'            AS payment_status
        FROM registrations
        WHERE payment_status = 'success'
        GROUP BY club_name
      ) r ON r.club_name = c.name
      WHERE c.active = 1 AND c.district_director IS NOT NULL
      ORDER BY c.zone ASC, c.district_director ASC, c.assistant_governor ASC, c.name ASC
    `).all();

    const remindedToday = await db.prepare(`
      SELECT DISTINCT ag_name FROM reminder_log
      WHERE date(sent_at) = date('now')
    `).all();
    const remindedSet = new Set(remindedToday.map(r => r.ag_name));

    const agList = await db.prepare(`
      SELECT DISTINCT assistant_governor, district_director, zone
      FROM clubs
      WHERE assistant_governor IS NOT NULL
      ORDER BY zone ASC, district_director ASC, assistant_governor ASC
    `).all();

    // Group: zone → DD → AG → clubs
    const zonesMap = {};
    for (const club of clubs) {
      const zone = club.zone || 0;
      const dd = club.district_director || 'Unassigned';
      const ag = club.assistant_governor || 'Unassigned';

      if (!zonesMap[zone]) zonesMap[zone] = { zone, district_directors: {} };
      if (!zonesMap[zone].district_directors[dd]) zonesMap[zone].district_directors[dd] = { name: dd, assistant_governors: {} };
      if (!zonesMap[zone].district_directors[dd].assistant_governors[ag]) {
        zonesMap[zone].district_directors[dd].assistant_governors[ag] = {
          name: ag,
          phone: club.ag_phone || null,
          reminder_sent_today: remindedSet.has(ag),
          clubs: [],
        };
      }

      const isCompliant = club.payment_status === 'success' && club.delegate_count >= 2;
      const isPartial   = club.payment_status === 'success' && club.delegate_count < 2;
      zonesMap[zone].district_directors[dd].assistant_governors[ag].clubs.push({
        name: club.name,
        ggr: club.ggr,
        status: isCompliant ? 'completed' : isPartial ? 'partial' : 'not_registered',
        delegate_count: club.delegate_count || 0,
        registration_count: club.registration_count || 0,
        receipt_nos: club.receipt_nos || null,
      });
    }

    // Flatten to array
    const result = Object.values(zonesMap).map(z => ({
      zone: z.zone,
      district_directors: Object.values(z.district_directors).map(dd => ({
        name: dd.name,
        assistant_governors: Object.values(dd.assistant_governors).map(ag => {
          const agClubs = ag.clubs;
          const completed = agClubs.filter(c => c.status === 'completed').length;
          const partial   = agClubs.filter(c => c.status === 'partial').length;
          const not_reg   = agClubs.filter(c => c.status === 'not_registered').length;
          return { name: ag.name, phone: ag.phone, reminder_sent_today: ag.reminder_sent_today, total: agClubs.length, completed, partial, not_registered: not_reg, clubs: agClubs };
        }),
      })),
    }));

    res.status(200).json({ success: true, report: result, ag_list: agList });
  } catch (error) {
    console.error('Error fetching district report:', error);
    res.status(500).json({ error: 'Failed to fetch district report' });
  }
});

router.post('/admin/send-ag-reminder', async (req, res) => {
  try {
    const { ag_name } = req.body;
    if (!ag_name) return res.status(400).json({ error: 'ag_name is required' });

    const alreadySent = await db.prepare(
      `SELECT id FROM reminder_log WHERE ag_name = ? AND date(sent_at) = date('now')`
    ).get(ag_name);
    if (alreadySent) return res.status(429).json({ error: 'Reminder already sent today for this AG' });

    const agClub = await db.prepare(
      `SELECT DISTINCT assistant_governor, ag_phone FROM clubs WHERE assistant_governor = ? AND ag_phone IS NOT NULL LIMIT 1`
    ).get(ag_name);
    if (!agClub || !agClub.ag_phone) return res.status(404).json({ error: 'AG phone not found' });

    const pendingRows = await db.prepare(`
      SELECT c.name FROM clubs c
      LEFT JOIN (
        SELECT club_name FROM registrations WHERE payment_status = 'success' GROUP BY club_name
      ) r ON r.club_name = c.name
      WHERE c.assistant_governor = ? AND c.active = 1 AND r.club_name IS NULL
      ORDER BY c.name ASC
    `).all(ag_name);
    const pendingClubs = pendingRows.map(r => r.name).join(', ');
    if (!pendingClubs) return res.status(400).json({ error: 'No pending clubs for this AG' });

    const sent = await sendWhatsAppAGReminder({ agName: ag_name, agPhone: agClub.ag_phone, pendingClubs });
    if (!sent) return res.status(500).json({ error: 'Failed to send WhatsApp message' });

    await db.prepare(`INSERT INTO reminder_log (ag_name) VALUES (?)`).run(ag_name);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending AG reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// Admin: clubs that have NOT registered yet
router.get('/admin/unregistered-clubs', async (req, res) => {
  try {
    const unregistered = await db.prepare(`
      SELECT c.id, c.name
      FROM clubs c
      WHERE c.active = 1
        AND c.name NOT IN (
          SELECT DISTINCT r.club_name FROM registrations r WHERE r.payment_status = 'success'
        )
      ORDER BY c.name ASC
    `).all();

    const registered = await db.prepare(`
      SELECT DISTINCT r.club_name, r.receipt_no, r.delegate_count
      FROM registrations r
      WHERE r.payment_status = 'success'
      ORDER BY r.club_name ASC
    `).all();

    res.status(200).json({ success: true, unregistered, registered });
  } catch (error) {
    console.error('Error fetching unregistered clubs:', error);
    res.status(500).json({ error: 'Failed to fetch unregistered clubs' });
  }
});

module.exports = router;
