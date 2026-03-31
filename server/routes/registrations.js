const express = require('express');
const router = express.Router();
const db = require('../database');
const { createOrder, verifyPaymentSignature, razorpay } = require('../utils/razorpay');
const { sendReceiptEmail } = require('../utils/email');
const { sendWhatsAppReceipt } = require('../utils/whatsapp');

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
    if (error.message.includes('SQLITE') || error.message.includes('database')) {
      res.status(500).json({ 
        error: 'Database error occurred',
        details: error.message 
      });
    } else if (error.message.includes('permission') || error.message.includes('EACCES')) {
      res.status(500).json({ 
        error: 'File permission error',
        details: 'Server cannot write to database file'
      });
    } else if (error.message.includes('ENOENT')) {
      res.status(500).json({ 
        error: 'File not found',
        details: 'Database file or directory missing'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create registration',
        details: error.message 
      });
    }
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

    // Step 1: Verify the payment signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      // Log failed signature verification
      console.error(`Payment signature verification failed for order ${razorpay_order_id}`);
      
      const updateTransaction = db.prepare(`
        UPDATE transactions 
        SET status = 'failed', 
            raw_response = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE razorpay_order_id = ?
      `);
      await updateTransaction.run(JSON.stringify({
        error: 'Signature verification failed',
        received: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
      }), razorpay_order_id);

      const updateRegistration = db.prepare(`
        UPDATE registrations 
        SET payment_status = 'failed'
        WHERE id = ? AND razorpay_order_id = ?
      `);
      await updateRegistration.run(registrationId, razorpay_order_id);

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed - Invalid signature',
      });
    }

    // Step 2: Fetch the registration to verify order details
    const registration = await db.prepare('SELECT * FROM registrations WHERE id = ? AND razorpay_order_id = ?').get(registrationId, razorpay_order_id);

    if (!registration) {
      console.error(`Registration not found for ID ${registrationId} and order ${razorpay_order_id}`);
      return res.status(404).json({ error: 'Registration not found or order mismatch' });
    }

    // Step 3: Try to fetch payment details from Razorpay for extra verification (non-blocking)
    let paymentDetails = null;
    try {
      paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

      // Extra check: verify amount matches
      const expectedAmount = registration.total_amount * 100;
      if (paymentDetails.amount !== expectedAmount) {
        console.warn(`Amount mismatch: Expected ${expectedAmount}, Received ${paymentDetails.amount}`);
      }

      // Extra check: verify order ID matches
      if (paymentDetails.order_id !== razorpay_order_id) {
        console.warn(`Order ID mismatch: Expected ${razorpay_order_id}, Received ${paymentDetails.order_id}`);
      }

      console.log(`Payment details fetched successfully: status=${paymentDetails.status}, amount=${paymentDetails.amount}`);
    } catch (fetchError) {
      // Non-blocking: log the error but continue since signature already verified
      console.warn(`Could not fetch payment details from Razorpay (non-blocking): ${fetchError.message}`);
      console.warn('Proceeding with signature-verified payment approval');
    }

    // Step 4: Generate incremental receipt number
    const lastReceipt = await db.prepare(`
      SELECT receipt_no FROM registrations 
      WHERE receipt_no IS NOT NULL 
      ORDER BY id DESC LIMIT 1
    `).get();

    let nextReceiptNum = 1;
    if (lastReceipt?.receipt_no) {
      const match = lastReceipt.receipt_no.match(/(\d+)$/);
      if (match) nextReceiptNum = parseInt(match[1]) + 1;
    }
    const receipt_no = `GMS2026-${String(nextReceiptNum).padStart(3, '0')}`;
    console.log(`✅ Generated receipt number: ${receipt_no}`);

    // Step 5: Mark payment as SUCCESS and save receipt_no
    const updateRegistration = db.prepare(`
      UPDATE registrations 
      SET payment_status = 'success', 
          razorpay_payment_id = ?,
          receipt_no = ?
      WHERE id = ? AND razorpay_order_id = ?
    `);
    await updateRegistration.run(razorpay_payment_id, receipt_no, registrationId, razorpay_order_id);

    const updateTransaction = db.prepare(`
      UPDATE transactions 
      SET status = 'success', 
          razorpay_payment_id = ?, 
          razorpay_signature = ?,
          raw_response = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE razorpay_order_id = ?
    `);
    await updateTransaction.run(
      razorpay_payment_id,
      razorpay_signature,
      JSON.stringify({
        verified: true,
        signature_verified: true,
        payment_details: paymentDetails,
        registration_id: registrationId,
        receipt_no,
        verification_timestamp: new Date().toISOString()
      }),
      razorpay_order_id
    );

    console.log(`✅ Payment verified: Registration ${registrationId}, Receipt ${receipt_no}, Order ${razorpay_order_id}, Payment ${razorpay_payment_id}`);

    // Step 6: Fetch delegates for notifications
    const delegates = await db.prepare(`
      SELECT delegate_name, delegate_designation FROM delegates WHERE registration_id = ?
    `).all(registrationId);

    // Step 7: Send email and WhatsApp notifications (non-blocking)
    const notificationData = {
      name: registration.name,
      email: registration.email,
      phone: registration.phone,
      club_name: registration.club_name,
      delegate_count: registration.delegate_count,
      total_amount: registration.total_amount,
      receipt_no,
      payment_id: razorpay_payment_id,
      delegates,
    };

    const updateNotificationStatus = async (emailSent, whatsappSent) => {
      await db.prepare(`
        UPDATE registrations SET email_status = ?, whatsapp_status = ? WHERE id = ?
      `).run(
        emailSent ? 'sent' : 'failed',
        whatsappSent ? 'sent' : 'failed',
        registrationId
      );
    };

    Promise.all([
      sendReceiptEmail(notificationData).catch(err => { console.error('Email notification failed:', err); return false; }),
      sendWhatsAppReceipt(notificationData).catch(err => { console.error('WhatsApp notification failed:', err); return false; }),
    ]).then(([emailSent, whatsappSent]) => {
      updateNotificationStatus(emailSent, whatsappSent).catch(err =>
        console.error('Failed to update notification status:', err)
      );
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      receipt_no,
      verification_details: {
        registration_id: registrationId,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: registration.total_amount,
        currency: paymentDetails?.currency || 'INR',
        status: paymentDetails?.status || 'captured',
        method: paymentDetails?.method || null,
        email: paymentDetails?.email || null,
        contact: paymentDetails?.contact || null,
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
