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
    // {{1}} = Name of person registering
    // {{2}} = Receipt No
    // {{3}} = Club name
    // {{4}} = Number of delegates + total amount
    // {{5}} = Host club - RCC Heritage
    const payload = {
      to: intlPhone,
      type: 'template',
      template: {
        language: {
          policy: 'deterministic',
          code: 'en',
        },
        name: 'dla_registration',
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: name },
              { type: 'text', text: receipt_no },
              { type: 'text', text: club_name },
              { type: 'text', text: `${delegate_count} delegate(s),Total Rs.${total_amount.toLocaleString()} collected` },
              { type: 'text', text: 'RCC Heritage' },
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

async function sendWhatsAppCustomMessage(phone, message) {
  try {
    const token = process.env.ASKEVA_API_KEY;
    if (!token || token === 'YOUR_ASKEVA_API_KEY_HERE') {
      console.warn('⚠️ Askeva WhatsApp API not configured, skipping WhatsApp message');
      return { success: false };
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    const payload = {
      to: intlPhone,
      type: 'text',
      text: { body: message },
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
    console.log(`✅ Custom WhatsApp message sent to ${intlPhone}`, data);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send custom WhatsApp message:', error.message);
    return { success: false };
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

async function sendWhatsAppTemplate({ phone, name, template, imageUrl }) {
  try {
    const token = process.env.ASKEVA_API_KEY;
    if (!token || token === 'YOUR_ASKEVA_API_KEY_HERE') {
      console.warn('⚠️ Askeva WhatsApp API not configured');
      return { success: false };
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;

    // Build payload based on template
    // dla_reminder: {{1}} = name, {{2}} = RCC Heritage
    // dla_event: {{1}} = name, {{2}} = RCC Heritage
    const components = [];

    // Add header image if provided
    if (imageUrl) {
      components.push({
        type: 'header',
        parameters: [
          { type: 'image', image: { link: imageUrl } },
        ],
      });
    }

    // Add body parameters
    components.push({
      type: 'body',
      parameters: [
        { type: 'text', text: name },
        { type: 'text', text: 'RCC Heritage' },
      ],
    });

    const payload = {
      to: intlPhone,
      type: 'template',
      template: {
        language: { policy: 'deterministic', code: 'en' },
        name: template, // 'dla_reminder' or 'dla_event'
        components,
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
    console.log(`✅ WhatsApp template ${template} sent to ${intlPhone}`, data);
    return { success: true, data };
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp template:`, error.message);
    return { success: false };
  }
}

module.exports = { sendWhatsAppReceipt, sendWhatsAppAGReminder, sendWhatsAppCustomMessage, sendWhatsAppTemplate };
