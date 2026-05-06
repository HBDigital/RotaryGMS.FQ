const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zeptomail.in',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'emailapikey',
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

async function sendReceiptEmail({ name, email, phone, club_name, delegate_count, total_amount, receipt_no, payment_id }) {
  try {
    // Replace Manchester with Heritage in club name for display
    const displayClubName = club_name.replace(/Manchester/gi, 'Heritage');

    const plainText = `
District Learning Assembly - Rotary District 3206
Registration Confirmation

Dear ${name},

Your registration for District Learning Assembly - Rotary District 3206 has been successfully confirmed.

Receipt Number: ${receipt_no}

Registration Details:
- Name: ${name}
- Email: ${email}
- Phone: ${phone || 'N/A'}
- Club: ${displayClubName}
- Delegates: ${delegate_count}
- Amount Paid: Rs.${total_amount.toLocaleString()}
- Payment ID: ${payment_id || 'N/A'}

Please keep this receipt number for future reference and on-site verification.

Event Details:
Date: 24 May 2026
Venue: KPR College of Arts Science and Research, Coimbatore

For queries, contact us at info@rotary3206.org

Regards,
Rotary District 3206
District Learning Assembly Committee
    `.trim();

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmation - District Learning Assembly</title>
      </head>
      <body style="font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;margin:0;padding:20px;line-height:1.6;">
        <div style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          
          <div style="background-color:#1e40af;padding:24px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Rotary District 3206</h1>
            <p style="color:#dbeafe;margin:8px 0 0;font-size:14px;">District Learning Assembly - Registration Confirmation</p>
          </div>

          <div style="padding:32px;">
            <p style="color:#374151;font-size:15px;margin:0 0 20px;">Dear <strong>${name}</strong>,</p>
            <p style="color:#4b5563;font-size:14px;margin:0 0 24px;">
              Your registration for District Learning Assembly - Rotary District 3206 has been successfully confirmed. 
              Please find your receipt details below.
            </p>

            <div style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:16px 20px;margin-bottom:24px;text-align:center;">
              <p style="margin:0 0 4px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Receipt Number</p>
              <p style="margin:0;color:#1e40af;font-size:22px;font-weight:700;letter-spacing:1px;">${receipt_no}</p>
            </div>

            <h3 style="color:#1f2937;font-size:14px;margin:0 0 12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Registration Details</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
              <tr><td style="padding:8px 0;color:#6b7280;width:40%;">Name</td><td style="padding:8px 0;color:#1f2937;font-weight:500;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;color:#1f2937;">${email}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;color:#1f2937;">${phone || 'N/A'}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Club</td><td style="padding:8px 0;color:#1f2937;font-weight:500;">${displayClubName}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Delegates</td><td style="padding:8px 0;color:#1f2937;">${delegate_count}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Amount Paid</td><td style="padding:8px 0;color:#059669;font-weight:600;">Rs.${total_amount.toLocaleString()}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Payment ID</td><td style="padding:8px 0;color:#1f2937;font-size:12px;font-family:monospace;">${payment_id || 'N/A'}</td></tr>
            </table>

            <div style="background-color:#fefce8;border:1px solid #fde047;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
              <p style="margin:0;color:#854d0e;font-size:13px;">
                Please keep this receipt number <strong>${receipt_no}</strong> for future reference and on-site verification.
              </p>
            </div>

            <h3 style="color:#1f2937;font-size:14px;margin:0 0 12px;border-bottom:1px solid #e5e7eb;padding-bottom:8px;">Event Details</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
              <tr><td style="padding:8px 0;color:#6b7280;width:40%;">Date</td><td style="padding:8px 0;color:#1f2937;">24 May 2026</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Venue</td><td style="padding:8px 0;color:#1f2937;">KPR College of Arts Science and Research, Coimbatore</td></tr>
            </table>

            <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
              For queries, contact us at <a href="mailto:info@rotary3206.org" style="color:#1e40af;text-decoration:none;">info@rotary3206.org</a>
            </p>
          </div>

          <div style="background-color:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;">Rotary District 3206 - District Learning Assembly</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: '"Rotary 3206" <rotary3206_dla@feequick.com>',
      to: email,
      subject: `District Learning Assembly | Receipt ${receipt_no}`,
      text: plainText,
      html,
      headers: {
        'X-Priority': '3',
        'X-Mailer': 'Rotary 3206 DLA Registration System',
      },
    });

    console.log(`✅ Receipt email sent to ${email} for receipt ${receipt_no}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send receipt email:', error.message);
    return false;
  }
}

module.exports = { sendReceiptEmail };
