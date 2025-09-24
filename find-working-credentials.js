const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const prisma = new PrismaClient();

async function findWorkingCredentials() {
  console.log("🔑 Finding working credentials for mackaengin@gmail.com...\n");

  try {
    // First get the user
    const user = await prisma.user.findUnique({
      where: { email: "mackaengin@gmail.com" },
      include: {
        business: true,
      },
    });

    if (!user) {
      console.log("❌ User mackaengin@gmail.com not found");
      return;
    }

    console.log("✅ User found:");
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.firstName} ${user.lastName}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Business: ${user.business?.name || "No business"}`);

    // Common passwords to test
    const commonPasswords = [
      "engin123",
      "test123",
      "admin123",
      "password",
      "macka123",
      "dalga123",
      "123456",
      "engin",
      "macka",
      "dalga",
    ];

    console.log("\n🔍 Testing common passwords...");

    for (const password of commonPasswords) {
      try {
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (isMatch) {
          console.log(`✅ FOUND WORKING PASSWORD: ${password}`);

          // Test actual login API
          console.log("\n🌐 Testing login API with found credentials...");
          try {
            const response = await fetch(
              "http://localhost:3000/api/auth/login",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: "mackaengin@gmail.com",
                  password: password,
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              console.log("✅ API Login successful!");
              console.log(
                `🎯 WORKING CREDENTIALS: mackaengin@gmail.com / ${password}`
              );
              console.log(`🔑 Token: ${data.token}`);
              return {
                email: "mackaengin@gmail.com",
                password,
                token: data.token,
              };
            } else {
              console.log(`❌ API login failed: ${response.status}`);
            }
          } catch (apiError) {
            console.log("⚠️  API server might not be running");
          }

          return { email: "mackaengin@gmail.com", password };
        }
      } catch (error) {
        console.log(`   ❌ Error testing ${password}:`, error.message);
      }
    }

    console.log("❌ None of the common passwords worked");
    console.log('\n💡 Setting new password: "engin123"');

    // Set known password
    const hashedPassword = await bcrypt.hash("engin123", 12);
    await prisma.user.update({
      where: { email: "mackaengin@gmail.com" },
      data: { passwordHash: hashedPassword },
    });

    console.log("✅ Password updated to: engin123");
    console.log("🎯 WORKING CREDENTIALS: mackaengin@gmail.com / engin123");

    // Test the new password
    console.log("\n🌐 Testing login API with new password...");
    try {
      const response = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "mackaengin@gmail.com",
          password: "engin123",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ API Login successful with new password!");
        console.log(`🔑 Token: ${data.token}`);
        return {
          email: "mackaengin@gmail.com",
          password: "engin123",
          token: data.token,
        };
      } else {
        const errorData = await response.json();
        console.log(`❌ API login failed: ${response.status}`, errorData);
      }
    } catch (apiError) {
      console.log("⚠️  API server might not be running:", apiError.message);
    }

    return { email: "mackaengin@gmail.com", password: "engin123" };
  } catch (error) {
    console.error("❌ Error finding credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

findWorkingCredentials().then((result) => {
  if (result) {
    console.log("\n🎉 SUMMARY:");
    console.log(`📧 Email: ${result.email}`);
    console.log(`🔑 Password: ${result.password}`);
    if (result.token) {
      console.log(`🎯 Token: ${result.token}`);
      console.log("\n💡 Use these credentials in your mobile app:");
      console.log(`   Email: ${result.email}`);
      console.log(`   Password: ${result.password}`);
    }
  }
});
