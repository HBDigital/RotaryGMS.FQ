const axios = require('axios');

async function sendWhatsAppReceipt({ name, phone, receipt_no, club_name, delegate_count, total_amount }) {
  try {
    const apiUrl = process.env.ASKEVA_API_URL;
    const apiKey = process.env.ASKEVA_API_KEY;

    if (!apiUrl || !apiKey || apiKey === 'YOUR_ASKEVA_API_KEY_HERE') {
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
      phone: intlPhone,
      template_name: 'gms_payment',
      variables: [
        name,
        receipt_no,
        club_name,
        `${delegate_count} delegate(s), ₹${total_amount.toLocaleString()} collected`,
      ],
    };

    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log(`✅ WhatsApp notification sent to ${intlPhone} for receipt ${receipt_no}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send WhatsApp notification:', error.message);
    return false;
  }
}

module.exports = { sendWhatsAppReceipt };
