const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendWhatsAppCustomMessage } = require('../utils/whatsapp');
const nodemailer = require('nodemailer');

// Get all district contacts
router.get('/admin/contacts', async (req, res) => {
  try {
    const contacts = await db.prepare(`
      SELECT * FROM district_contacts 
      WHERE active = 1 
      ORDER BY zone, role, name ASC
    `).all();
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contacts by zone
router.get('/admin/contacts/zone/:zone', async (req, res) => {
  try {
    const { zone } = req.params;
    const contacts = await db.prepare(`
      SELECT * FROM district_contacts 
      WHERE zone = ? AND active = 1 
      ORDER BY role, name ASC
    `).all(zone);
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts by zone:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Get contacts by role
router.get('/admin/contacts/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const contacts = await db.prepare(`
      SELECT * FROM district_contacts 
      WHERE role = ? AND active = 1 
      ORDER BY zone, name ASC
    `).all(role);
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error('Error fetching contacts by role:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

// Add a new contact
router.post('/admin/contacts', async (req, res) => {
  try {
    const { name, club_name, phone, email, role, zone } = req.body;
    if (!name || !club_name || !role || !zone) {
      return res.status(400).json({ error: 'name, club_name, role, and zone are required' });
    }

    await db.prepare(`
      INSERT INTO district_contacts (name, club_name, phone, email, role, zone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, club_name, phone || null, email || null, role, zone);

    res.status(201).json({ success: true, message: 'Contact added successfully' });
  } catch (error) {
    console.error('Error adding contact:', error);
    res.status(500).json({ error: 'Failed to add contact' });
  }
});

// Update a contact
router.put('/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, club_name, phone, email, role, zone } = req.body;

    await db.prepare(`
      UPDATE district_contacts 
      SET name = ?, club_name = ?, phone = ?, email = ?, role = ?, zone = ?
      WHERE id = ?
    `).run(name, club_name, phone || null, email || null, role, zone, id);

    res.status(200).json({ success: true, message: 'Contact updated successfully' });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

// Delete a contact (soft delete)
router.delete('/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.prepare(`UPDATE district_contacts SET active = 0 WHERE id = ?`).run(id);
    res.status(200).json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});


// Send WhatsApp message to contact
router.post('/admin/contacts/:id/whatsapp', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const contact = await db.prepare(`SELECT * FROM district_contacts WHERE id = ?`).get(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.phone) {
      return res.status(400).json({ error: 'Contact has no phone number' });
    }

    const result = await sendWhatsAppCustomMessage(contact.phone, message);

    if (result.success) {
      // Log cost
      await db.prepare(
        `INSERT INTO message_cost (message_type, recipient, cost) VALUES (?, ?, ?)`
      ).run('whatsapp', contact.phone, 1.0);

      res.status(200).json({ success: true, message: 'WhatsApp message sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send WhatsApp message' });
    }
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// Send email to contact
router.post('/admin/contacts/:id/email', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const contact = await db.prepare(`SELECT * FROM district_contacts WHERE id = ?`).get(id);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    if (!contact.email) {
      return res.status(400).json({ error: 'Contact has no email address' });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">Rotary District 3206 - District Learning Assembly</h1>
        </div>
        <div style="padding: 24px;">
          <p style="margin: 0 0 16px;">Dear ${contact.name},</p>
          <div style="line-height: 1.6; margin-bottom: 16px;">${message.replace(/\n/g, '<br>')}</div>
          <p style="margin: 16px 0 0; color: #666;">Best regards,<br>Rotary District 3206</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'Rotary 3206 DLA 2026'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: contact.email,
      subject: subject || 'District Learning Assembly',
      html,
    });

    // Log cost
    await db.prepare(
      `INSERT INTO message_cost (message_type, recipient, cost) VALUES (?, ?, ?)`
    ).run('email', contact.email, 0.15);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Get message costs
router.get('/admin/contacts/message-costs', async (req, res) => {
  try {
    const costs = await db.prepare(`
      SELECT message_type, COUNT(*) as count, SUM(cost) as total_cost
      FROM message_cost
      GROUP BY message_type
    `).all();

    const whatsapp = costs.find(c => c.message_type === 'whatsapp') || { count: 0, total_cost: 0 };
    const email = costs.find(c => c.message_type === 'email') || { count: 0, total_cost: 0 };

    res.status(200).json({
      success: true,
      whatsapp: {
        count: whatsapp.count,
        cost: whatsapp.total_cost
      },
      email: {
        count: email.count,
        cost: email.total_cost
      },
      total: {
        count: whatsapp.count + email.count,
        cost: whatsapp.total_cost + email.total_cost
      }
    });
  } catch (error) {
    console.error('Error fetching message costs:', error);
    res.status(500).json({ error: 'Failed to fetch message costs' });
  }
});

// Reset message costs
router.post('/admin/contacts/message-costs/reset', async (req, res) => {
  try {
    await db.prepare(`DELETE FROM message_cost`).run();
    res.status(200).json({ success: true, message: 'Message costs reset successfully' });
  } catch (error) {
    console.error('Error resetting message costs:', error);
    res.status(500).json({ error: 'Failed to reset message costs' });
  }
});

// Import contacts from CSV
router.post('/admin/contacts/import', express.text({ type: 'text/csv', limit: '10mb' }), async (req, res) => {
  try {
    const csvData = req.body;
    if (!csvData) {
      return res.status(400).json({ error: 'No CSV data provided' });
    }

    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have header and at least one data row' });
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = header.indexOf('name');
    const clubIdx = header.indexOf('club name') !== -1 ? header.indexOf('club name') : header.indexOf('club');
    const phoneIdx = header.indexOf('phone');
    const emailIdx = header.indexOf('email');
    const roleIdx = header.indexOf('role');
    const zoneIdx = header.indexOf('zone');

    if (nameIdx === -1 || clubIdx === -1) {
      return res.status(400).json({ error: 'CSV must have Name and Club Name columns' });
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const name = values[nameIdx] || '';
      const club_name = values[clubIdx] || '';
      const phone = phoneIdx !== -1 ? values[phoneIdx] : null;
      const email = emailIdx !== -1 ? values[emailIdx] : null;
      const role = roleIdx !== -1 ? values[roleIdx] : 'Member';
      const zone = zoneIdx !== -1 ? values[zoneIdx] : 'Zone 1';

      if (!name || !club_name) {
        skipped++;
        continue;
      }

      try {
        await db.prepare(`
          INSERT INTO district_contacts (name, club_name, phone, email, role, zone, active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(name, club_name) DO UPDATE SET
            phone = excluded.phone,
            email = excluded.email,
            role = excluded.role,
            zone = excluded.zone,
            active = 1
        `).run(name, club_name, phone, email, role, zone);
        imported++;
      } catch (err) {
        console.error(`Error importing contact ${name}:`, err);
        skipped++;
      }
    }

    console.log(`✅ Imported ${imported} contacts, skipped ${skipped}`);
    res.status(200).json({ 
      success: true, 
      message: `Imported ${imported} contacts, skipped ${skipped}`,
      imported,
      skipped
    });
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({ error: 'Failed to import contacts' });
  }
});

module.exports = router;
