// Test script for TheirStack API
const axios = require('axios');
require('dotenv').config();

async function testTheirStackAPI() {
  const API_KEY = process.env.THEIRSTACK_API_KEY;
  
  if (!API_KEY) {
    console.error('❌ THEIRSTACK_API_KEY not found in environment variables');
    return;
  }
  
  console.log('✅ API Key found:', API_KEY.substring(0, 20) + '...');
  
  const filters = {
    posted_at_max_age_days: 30,
    page: 0,
    limit: 5,
    job_title_pattern_or: ["Software Engineer"],
    include_total_results: false
  };
  
  console.log('🔍 Testing TheirStack API with filters:', JSON.stringify(filters, null, 2));
  
  try {
    const response = await axios.post(
      'https://api.theirstack.com/v1/jobs/search',
      filters,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        timeout: 15000
      }
    );
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.data) {
      console.log(`📈 Found ${response.data.data.length} jobs`);
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.status);
    console.error('📋 Error Details:', JSON.stringify(error.response?.data, null, 2));
  }
}

testTheirStackAPI();
