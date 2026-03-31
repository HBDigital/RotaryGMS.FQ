const axios = require('axios');

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

    const response = await axios.post(`${ASKEVA_BASE_URL}?token=${token}`, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`✅ WhatsApp notification sent to ${intlPhone} for receipt ${receipt_no}`, response.data);
    return true;
  } catch (error) {
    console.error('❌ Failed to send WhatsApp notification:', error.response?.data || error.message);
    return false;
  }
}

module.exports = { sendWhatsAppReceipt };
