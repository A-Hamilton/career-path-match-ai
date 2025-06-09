// Test script to find which TheirStack API parameters work
const axios = require('axios');
require('dotenv').config();

async function testTheirStackParameters() {
  const apiKey = process.env.THEIRSTACK_API_KEY;
  
  const testCases = [
    {
      name: "Minimal request",
      params: {
        limit: 5
      }
    },
    {
      name: "With page",
      params: {
        page: 0,
        limit: 5
      }
    },
    {
      name: "With job title",
      params: {
        page: 0,
        limit: 5,
        job_title_pattern_or: ["developer"]
      }
    },
    {
      name: "With location",
      params: {
        page: 0,
        limit: 5,
        location_name_or: ["Remote"]
      }
    },
    {
      name: "With posted_at filter",
      params: {
        page: 0,
        limit: 5,
        posted_at_max_age_days: 30
      }
    },
    {
      name: "Full request (current)",
      params: {
        posted_at_max_age_days: 30,
        page: 0,
        limit: 20,
        job_title_pattern_or: ["AI Engineer"],
        location_name_or: ["Remote"]
      }
    }
  ];

  for (const test of testCases) {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log('Parameters:', JSON.stringify(test.params, null, 2));

    try {
      const response = await axios.post(
        'https://api.theirstack.com/v1/jobs/search',
        test.params,
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
        console.log('✅ SUCCESS!');
        console.log('Jobs found:', response.data.data ? response.data.data.length : 0);
      } else if (response.status === 422) {
        console.log('❌ FAILED - Invalid parameters');
        console.log('Error details:', JSON.stringify(response.data, null, 2));
      } else {
        console.log(`⚠️  Status ${response.status}`);
        console.log('Response:', response.data);
      }

    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}:`, error.response.data);
      } else {
        console.log('❌ Network Error:', error.message);
      }
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testTheirStackParameters();
