const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing Delegate Registration API...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const healthRes = await axios.get('http://localhost:5000/api/health');
    console.log('✅ Health check passed:', healthRes.data);

    // Test 2: Create Registration
    console.log('\n2️⃣ Testing registration creation...');
    const registrationData = {
      name: 'Test User',
      email: 'test@example.com',
      phone: '9876543210',
      club_name: 'Test Club',
      delegate_count: 2,
      delegates: [
        { name: 'Delegate One', designation: 'President' },
        { name: 'Delegate Two', designation: 'Vice President' }
      ]
    };

    const regRes = await axios.post(`${API_URL}/registrations`, registrationData);
    console.log('✅ Registration created:', regRes.data);
    const registrationId = regRes.data.registrationId;

    // Test 3: Get Admin Summary
    console.log('\n3️⃣ Testing admin summary...');
    const summaryRes = await axios.get(`${API_URL}/admin/summary`);
    console.log('✅ Admin summary:', summaryRes.data.summary);

    // Test 4: Get All Registrations
    console.log('\n4️⃣ Testing get all registrations...');
    const allRegsRes = await axios.get(`${API_URL}/admin/registrations`);
    console.log('✅ Total registrations:', allRegsRes.data.registrations.length);
    console.log('   Latest registration:', allRegsRes.data.registrations[0]);

    console.log('\n✨ All tests passed! API is working correctly.\n');
    console.log('📝 Summary:');
    console.log(`   - Registration ID: ${registrationId}`);
    console.log(`   - Total Amount: ₹${regRes.data.total_amount}`);
    console.log(`   - Delegates: ${registrationData.delegate_count}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Server is not running. Please start it with: npm run server');
    }
  }
}

testAPI();
