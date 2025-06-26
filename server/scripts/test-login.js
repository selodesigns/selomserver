const axios = require('axios');
const { logger } = require('../utils/Logger');

async function testLogin() {
  try {
    console.log('Testing login endpoint with admin credentials...');
    
    const response = await axios.post('http://localhost:3241/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login successful!');
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Login failed!');
    console.error('Error status:', error.response?.status);
    console.error('Error message:', error.response?.data || error.message);
    
    if (error.response?.data?.message) {
      console.error('Server message:', error.response.data.message);
    }
  }
}

// Execute the function
testLogin();
