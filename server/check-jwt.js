// Decode JWT token to check expiration
const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = process.env.THEIRSTACK_API_KEY;

if (!token) {
  console.error('❌ THEIRSTACK_API_KEY not found');
  process.exit(1);
}

try {
  // Decode without verification to see the payload
  const decoded = jwt.decode(token, { complete: true });
  
  console.log('📋 JWT Header:', JSON.stringify(decoded.header, null, 2));
  console.log('📋 JWT Payload:', JSON.stringify(decoded.payload, null, 2));
  
  if (decoded.payload.exp) {
    const expiration = new Date(decoded.payload.exp * 1000);
    const now = new Date();
    
    console.log('⏰ Token expires at:', expiration.toISOString());
    console.log('🕐 Current time:', now.toISOString());
    console.log('✅ Token valid:', expiration > now ? 'YES' : 'NO (EXPIRED)');
  } else {
    console.log('⚠️  No expiration field found in token');
  }
  
} catch (error) {
  console.error('❌ Error decoding JWT:', error.message);
}
