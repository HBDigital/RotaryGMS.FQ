const express = require('express');
const router = express.Router();
const db = require('../database');
const { createOrder, verifyPaymentSignature } = require('../utils/razorpay');

router.post('/registrations', async (req, res) => {
  try {
    const { name, email, phone, club_name, delegate_count, delegates } = req.body;

    if (!name || !email || !phone || !club_name || !delegate_count || !delegates) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (delegates.length !== delegate_count) {
      return res.status(400).json({ error: 'Delegate count mismatch' });
    }

    const total_amount = delegate_count * 1000;

    const insertRegistration = db.prepare(`
      INSERT INTO registrations (name, email, phone, club_name, delegate_count, total_amount, payment_status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `);

    const result = await insertRegistration.run(name, email, phone, club_name, delegate_count, total_amount);
    const registrationId = result.lastInsertRowid;

    const insertDelegate = db.prepare(`
      INSERT INTO delegates (registration_id, delegate_name, delegate_designation)
      VALUES (?, ?, ?)
    `);

    for (const delegate of delegates) {
      await insertDelegate.run(registrationId, delegate.name, delegate.designation);
    }

    res.status(201).json({
      success: true,
      registrationId: registrationId,
      total_amount: total_amount,
    });
  } catch (error) {
    console.error('Error creating registration:', error);
    res.status(500).json({ error: 'Failed to create registration' });
  }
});

router.post('/create-order', async (req, res) => {
  try {
    const { registrationId, amount } = req.body;

    if (!registrationId || !amount) {
      return res.status(400).json({ error: 'Registration ID and amount are required' });
    }

    const registration = await db.prepare('SELECT * FROM registrations WHERE id = ?').get(registrationId);

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.total_amount !== amount) {
      return res.status(400).json({ error: 'Amount mismatch' });
    }

    const receipt = `receipt_${registrationId}_${Date.now()}`;
    const order = await createOrder(amount, receipt);

    const updateRegistration = db.prepare(`
      UPDATE registrations 
      SET razorpay_order_id = ? 
      WHERE id = ?
    `);
    await updateRegistration.run(order.id, registrationId);

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (registration_id, razorpay_order_id, amount, status, raw_response)
      VALUES (?, ?, ?, 'created', ?)
    `);
    await insertTransaction.run(registrationId, order.id, amount, JSON.stringify(order));

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, registrationId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !registrationId) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (isValid) {
      const updateRegistration = db.prepare(`
        UPDATE registrations 
        SET payment_status = 'success', razorpay_payment_id = ?
        WHERE id = ? AND razorpay_order_id = ?
      `);
      await updateRegistration.run(razorpay_payment_id, registrationId, razorpay_order_id);

      const updateTransaction = db.prepare(`
        UPDATE transactions 
        SET status = 'success', 
            razorpay_payment_id = ?, 
            razorpay_signature = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE razorpay_order_id = ?
      `);
      await updateTransaction.run(razorpay_payment_id, razorpay_signature, razorpay_order_id);

      res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
      });
    } else {
      const updateTransaction = db.prepare(`
        UPDATE transactions 
        SET status = 'failed',
            updated_at = CURRENT_TIMESTAMP
        WHERE razorpay_order_id = ?
      `);
      await updateTransaction.run(razorpay_order_id);

      const updateRegistration = db.prepare(`
        UPDATE registrations 
        SET payment_status = 'failed'
        WHERE id = ? AND razorpay_order_id = ?
      `);
      await updateRegistration.run(registrationId, razorpay_order_id);

      res.status(400).json({
        success: false,
        error: 'Payment verification failed',
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
