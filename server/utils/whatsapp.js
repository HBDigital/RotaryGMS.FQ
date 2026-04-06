const ASKEVA_BASE_URL = 'https://backend.askeva.io/v1/message/send-message';

async function sendWhatsAppReceipt({ name, phone, receipt_no, club_name, delegate_count, total_amount }) {
  try {
    const token = process.env.ASKEVA_API_KEY;

    if (!token || token === 'YOUR_ASKEVA_API_KEY_HERE') {
      console.warn('⚠️ Askeva WhatsApp API not configured, skipping WhatsApp notification');
      return false;
    }

    // Clean phone number - ensure it's in international format
    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // Template variables:
    // {{1}} = name
    // {{2}} = receipt_no
    // {{3}} = club name
    // {{4}} = delegates count + amount
    const payload = {
      to: intlPhone,
      type: 'template',
      template: {
        language: {
          policy: 'deterministic',
          code: 'en',
        },
        name: 'gms_payment',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: name },
              { type: 'text', text: receipt_no },
              { type: 'text', text: club_name },
              { type: 'text', text: `${delegate_count} delegate(s), Rs.${total_amount.toLocaleString()} collected` },
            ],
          },
        ],
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${ASKEVA_BASE_URL}?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`✅ WhatsApp notification sent to ${intlPhone} for receipt ${receipt_no}`, data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send WhatsApp notification:', error.message);
    return false;
  }
}

async function sendWhatsAppAGReminder({ agName, agPhone, pendingClubs }) {
  try {
    const token = process.env.ASKEVA_API_KEY;
    if (!token || token === 'YOUR_ASKEVA_API_KEY_HERE') {
      console.warn('⚠️ Askeva WhatsApp API not configured, skipping AG reminder');
      return false;
    }

    const cleanPhone = agPhone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const payload = {
      to: intlPhone,
      type: 'template',
      template: {
        language: { policy: 'deterministic', code: 'en' },
        name: 'gms_reminder_2',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: agName },
              { type: 'text', text: pendingClubs },
            ],
          },
        ],
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${ASKEVA_BASE_URL}?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`✅ AG reminder sent to ${agName} (${intlPhone})`, data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send AG reminder:', error.message);
    return false;
  }
}

module.exports = { sendWhatsAppReceipt, sendWhatsAppAGReminder };
