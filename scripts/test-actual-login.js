const fetch = require('node-fetch');

async function testActualLogin() {
  try {
    console.log('🔍 Testing actual login API call...');
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@laundrypro.com',
        password: 'test123' // You'll need to provide the actual password
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response data:', JSON.stringify(data, null, 2));
    
    if (response.ok && data.token) {
      console.log('\n🔑 Token analysis:');
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(data.token);
      console.log('Token payload:', decoded);
      
      console.log('\n✅ Login API is working correctly!');
      console.log('🎯 Use this token in your browser:');
      console.log(data.token);
    } else {
      console.log('❌ Login failed:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
    console.log('\n💡 Make sure the development server is running on localhost:3000');
  }
}

testActualLogin();
