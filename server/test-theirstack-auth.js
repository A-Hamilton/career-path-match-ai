// Test script to verify TheirStack API authentication
const axios = require('axios');
require('dotenv').config();

async function testTheirStackAuth() {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  
  if (!apiKey) {
    console.error('❌ THEIRSTACK_API_KEY not found in environment variables');
    return;
  }

  console.log('🔑 Testing TheirStack API authentication...');
  console.log('API Key (first 20 chars):', apiKey.substring(0, 20) + '...');

  try {
    // Simple test request to verify authentication
    const response = await axios.post(
      'https://api.theirstack.com/v1/jobs/search',
      {
        posted_at_max_age_days: 30,
        page: 0,
        limit: 1,
        job_title_pattern_or: ['developer']
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000,
        validateStatus: (status) => status < 500
      }
    );

    if (response.status === 200) {
      console.log('✅ Authentication successful!');
      console.log('Response data keys:', Object.keys(response.data));
      console.log('Jobs found:', response.data.data ? response.data.data.length : 0);
    } else if (response.status === 401) {
      console.log('❌ Authentication failed - Invalid or expired API key');
      console.log('Response:', response.data);
    } else if (response.status === 402) {
      console.log('⚠️  Payment required or quota exceeded');
      console.log('Response:', response.data);
    } else if (response.status === 422) {
      console.log('⚠️  Invalid parameters (but auth is working)');
      console.log('Response:', response.data);
    } else {
      console.log(`⚠️  Unexpected status ${response.status}`);
      console.log('Response:', response.data);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - Check your internet connection');
    } else if (error.response) {
      console.log(`❌ API Error ${error.response.status}:`, error.response.data);
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testTheirStackAuth();
