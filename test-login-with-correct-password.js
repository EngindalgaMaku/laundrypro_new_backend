async function testCompleteAuthFlow() {
  console.log(
    "🔥 TESTING COMPLETE AUTHENTICATION FLOW FOR mackaengin@gmail.com"
  );

  try {
    // Step 1: Test login API with correct password
    console.log("\n📡 Step 1: Testing LOGIN API...");

    const loginResponse = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "mackaengin@gmail.com",
        password: "Zeynep2016.",
      }),
    });

    const loginData = await loginResponse.json();

    console.log("📡 LOGIN Status:", loginResponse.status);
    console.log("📡 LOGIN Response:", JSON.stringify(loginData, null, 2));

    if (!loginResponse.ok) {
      console.log("❌ LOGIN FAILED - Cannot proceed");
      return;
    }

    console.log("✅ LOGIN SUCCESSFUL!");
    console.log("🎯 User ID:", loginData.user?.id);
    console.log(
      "🎯 Business ID in login response:",
      loginData.user?.business?.id
    );
    console.log("🎯 Business Name:", loginData.user?.business?.name);
    console.log("🎯 Token received:", !!loginData.token);

    // Step 2: Test /api/users/me endpoint
    console.log("\n📡 Step 2: Testing /api/users/me...");

    const meResponse = await fetch("http://localhost:3000/api/users/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${loginData.token}`,
        "Content-Type": "application/json",
      },
    });

    const meData = await meResponse.json();
    console.log("📡 /api/users/me Status:", meResponse.status);
    console.log("📡 /api/users/me Response:", JSON.stringify(meData, null, 2));

    // Step 3: Test customer creation API (where the error might be occurring)
    console.log(
      "\n📡 Step 3: Testing /api/customers (where the error likely occurs)..."
    );

    const customerResponse = await fetch(
      "http://localhost:3000/api/customers",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${loginData.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: "Test",
          lastName: "Customer",
          phone: "+905551234567",
          email: "test@example.com",
        }),
      }
    );

    const customerData = await customerResponse.json();
    console.log("📡 /api/customers Status:", customerResponse.status);
    console.log(
      "📡 /api/customers Response:",
      JSON.stringify(customerData, null, 2)
    );

    if (
      customerResponse.status === 400 &&
      customerData.error?.includes("işyeri")
    ) {
      console.log(
        "🎯 FOUND THE ISSUE! The error occurs in customer creation API"
      );
    }

    // Step 4: Decode the JWT token to see what's inside
    console.log("\n🔍 Step 4: Decoding JWT token...");

    if (loginData.token) {
      const tokenParts = loginData.token.split(".");
      if (tokenParts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(tokenParts[1], "base64").toString()
        );
        console.log("🎯 JWT Payload:", JSON.stringify(payload, null, 2));
        console.log("🎯 Business ID in JWT:", payload.businessId);
      }
    }
  } catch (error) {
    console.error("❌ Error during authentication flow test:", error);
  }
}

testCompleteAuthFlow();
