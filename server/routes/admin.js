const express = require('express');
const router = express.Router();
const db = require('../database');
const { Parser } = require('json2csv');

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

    const recentTransactions = await db.prepare(`
      SELECT 
        t.*,
        r.name,
        r.email,
        r.club_name
      FROM transactions t
      LEFT JOIN registrations r ON t.registration_id = r.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `).all();

    res.status(200).json({
      success: true,
      summary: {
        totalRegistrations: totalRegistrations.count,
        totalDelegates: totalDelegates.count,
        totalAmount: totalAmount.total || 0,
        pendingPayments: pendingPayments.count,
        failedPayments: failedPayments.count,
      },
      recentTransactions,
    });
  } catch (error) {
    console.error('Error fetching admin summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
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

      return {
        ...registration,
        delegates,
      };
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

router.get('/admin/export-csv', async (req, res) => {
  try {
    const registrations = await db.prepare(`
      SELECT 
        r.id,
        r.name,
        r.email,
        r.phone,
        r.club_name,
        r.delegate_count,
        r.total_amount,
        r.payment_status,
        r.razorpay_order_id,
        r.razorpay_payment_id,
        r.created_at
      FROM registrations r
      WHERE r.payment_status = 'success'
      ORDER BY r.created_at DESC
    `).all();

    const csvData = [];
    
    for (const registration of registrations) {
      const delegates = await db.prepare(`
        SELECT delegate_name, delegate_designation 
        FROM delegates 
        WHERE registration_id = ?
      `).all(registration.id);

      delegates.forEach((delegate, index) => {
        csvData.push({
          'Registration ID': registration.id,
          'Name': registration.name,
          'Email': registration.email,
          'Phone': registration.phone,
          'Club Name': registration.club_name,
          'Total Delegates': registration.delegate_count,
          'Total Amount': registration.total_amount,
          'Payment Status': registration.payment_status,
          'Razorpay Order ID': registration.razorpay_order_id,
          'Razorpay Payment ID': registration.razorpay_payment_id,
          'Delegate Number': index + 1,
          'Delegate Name': delegate.delegate_name,
          'Delegate Designation': delegate.delegate_designation,
          'Registration Date': registration.created_at,
        });
      });
    }

    const fields = [
      'Registration ID',
      'Name',
      'Email',
      'Phone',
      'Club Name',
      'Total Delegates',
      'Total Amount',
      'Payment Status',
      'Razorpay Order ID',
      'Razorpay Payment ID',
      'Delegate Number',
      'Delegate Name',
      'Delegate Designation',
      'Registration Date',
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', `attachment; filename=registrations_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

module.exports = router;
