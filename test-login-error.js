const axios = require("axios");

async function testLoginErrors() {
  console.log("🧪 Testing Login Error Handling...\n");

  const testCases = [
    {
      name: "Valid credentials",
      data: { email: "test@laundrypro.com", password: "test123" },
    },
    {
      name: "Invalid email",
      data: { email: "wrong@email.com", password: "test123" },
    },
    {
      name: "Invalid password",
      data: { email: "test@laundrypro.com", password: "wrongpassword" },
    },
    {
      name: "Missing email",
      data: { password: "test123" },
    },
    {
      name: "Invalid JSON format",
      data: "invalid json",
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n📋 Test: ${testCase.name}`);

      const response = await axios.post(
        "http://localhost:3000/api/auth/login",
        testCase.data,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 5000,
        }
      );

      console.log(`✅ Status: ${response.status}`);
      console.log(`📝 Response: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      if (error.response) {
        console.log(`❌ Status: ${error.response.status}`);
        console.log(
          `📝 Error Response: ${JSON.stringify(error.response.data, null, 2)}`
        );
      } else if (error.request) {
        console.log(`🔗 Network Error: No response received`);
      } else {
        console.log(`⚠️ Error: ${error.message}`);
      }
    }
  }
}

testLoginErrors().catch(console.error);
