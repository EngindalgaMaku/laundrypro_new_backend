const jwt = require('jsonwebtoken');

// This is the token that would be generated for zeynep@temizlik.com
// Let's see what tokens might be causing the confusion

const tokens = [
  // Token for zeynep@temizlik.com (the one causing issues)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZwNzB1dGwwMDAyd2Nyc2U1bWw2c3psIiwiZW1haWwiOiJ6ZXluZXBAdGVtaXpsaWsuY29tIiwiYnVzaW5lc3NJZCI6InRlbXBfYnVzaW5lc3NfaWQiLCJyb2xlIjoiT1dORVIiLCJpYXQiOjE3NTgyMjQwNDgsImV4cCI6MTc1ODgyODg0OH0.invalid',
  
  // Correct token for test@laundrypro.com
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbWZwYWI2OTkwMDAwd2M4Z3F3a2c0MHlpIiwiZW1haWwiOiJ0ZXN0QGxhdW5kcnlwcm8uY29tIiwiYnVzaW5lc3NJZCI6ImNtZnBsNzQ2NDAwMDB3Y253NjZta3lobmwiLCJyb2xlIjoiT1dORVIiLCJpYXQiOjE3NTgyMjQwNDgsImV4cCI6MTc1ODgyODg0OH0.2LlbCe2A_WjCXdj7kTZcBjkPx5F0C_i_E2K_o1BpVEY'
];

console.log('🔍 Decoding tokens to understand the issue...\n');

tokens.forEach((token, index) => {
  try {
    // Decode without verification to see the payload
    const decoded = jwt.decode(token);
    console.log(`Token ${index + 1}:`, decoded);
    console.log('---');
  } catch (error) {
    console.log(`Token ${index + 1}: Invalid or malformed`);
    console.log('---');
  }
});

console.log('\n🎯 The issue is likely that your browser has a token for zeynep@temizlik.com');
console.log('Even though you login with test@laundrypro.com, an old token might be cached.');
console.log('\n💡 Solutions:');
console.log('1. Clear browser localStorage completely');
console.log('2. Use the correct token for test@laundrypro.com');
console.log('3. Check if there are multiple tabs or sessions interfering');
