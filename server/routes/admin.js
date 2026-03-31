const express = require('express');
const router = express.Router();
const db = require('../database');
const XLSX = require('xlsx');

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
        r.razorpay_order_id, r.razorpay_payment_id, r.created_at
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

module.exports = router;
