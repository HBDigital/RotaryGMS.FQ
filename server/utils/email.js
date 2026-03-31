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

async function sendReceiptEmail({ name, email, phone, club_name, delegate_count, total_amount, receipt_no, payment_id, delegates }) {
  try {
    const delegateRows = delegates.map((d, i) =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.delegate_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.delegate_designation}</td>
      </tr>`
    ).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
          
          <div style="background:#1e40af;padding:24px 32px;text-align:center;">
            <h1 style="color:#fff;margin:0;font-size:22px;">Rotary 3206 — GMS 2026</h1>
            <p style="color:#bfdbfe;margin:4px 0 0;font-size:14px;">Registration Confirmation</p>
          </div>

          <div style="padding:32px;">
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center;">
              <p style="margin:0;color:#16a34a;font-size:14px;font-weight:600;">✅ Payment Verified & Registration Confirmed</p>
            </div>

            <p style="color:#374151;font-size:16px;margin-bottom:24px;">Dear <strong>${name}</strong>,</p>
            <p style="color:#6b7280;font-size:14px;margin-bottom:24px;">
              Your registration for <strong>GMS 2026 — Rotary District 3206</strong> has been successfully confirmed. 
              Please find your receipt details below.
            </p>

            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Receipt Number</p>
              <p style="margin:0;color:#1e40af;font-size:24px;font-weight:700;letter-spacing:2px;">${receipt_no}</p>
            </div>

            <h3 style="color:#1f2937;font-size:15px;margin:0 0 12px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Registration Details</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
              <tr><td style="padding:8px 0;color:#6b7280;width:40%;">Name</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td style="padding:8px 0;color:#1f2937;">${email}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Phone</td><td style="padding:8px 0;color:#1f2937;">${phone}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Club</td><td style="padding:8px 0;color:#1f2937;font-weight:600;">${club_name}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Delegates</td><td style="padding:8px 0;color:#1f2937;">${delegate_count}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Amount Paid</td><td style="padding:8px 0;color:#16a34a;font-weight:700;">₹${total_amount.toLocaleString()}</td></tr>
              <tr><td style="padding:8px 0;color:#6b7280;">Payment ID</td><td style="padding:8px 0;color:#1f2937;font-size:12px;font-family:monospace;">${payment_id}</td></tr>
            </table>

            <h3 style="color:#1f2937;font-size:15px;margin:0 0 12px;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">Delegate Details</h3>
            <table style="width:100%;border-collapse:collapse;margin-bottom:24px;font-size:14px;">
              <thead>
                <tr style="background:#f9fafb;">
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">#</th>
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Name</th>
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;">Designation</th>
                </tr>
              </thead>
              <tbody>
                ${delegateRows}
              </tbody>
            </table>

            <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
              <p style="margin:0;color:#92400e;font-size:13px;">
                📌 Please keep this receipt number <strong>${receipt_no}</strong> for future reference and on-site verification.
              </p>
            </div>

            <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">
              For queries, contact us at <a href="mailto:info@rotary3206.org" style="color:#1e40af;">info@rotary3206.org</a>
            </p>
          </div>

          <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Rotary District 3206 — GMS 2026 | Powered by FeeQuick</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'Rotary 3206 GMS 2026'}" <${process.env.FROM_EMAIL || 'noreply@gms.feequick.com'}>`,
      to: email,
      subject: `Registration Confirmed — Receipt ${receipt_no} | Rotary GMS 2026`,
      html,
    });

    console.log(`✅ Receipt email sent to ${email} for receipt ${receipt_no}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send receipt email:', error.message);
    return false;
  }
}

module.exports = { sendReceiptEmail };
