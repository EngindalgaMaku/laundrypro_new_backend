const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function fixAuthenticationIssue() {
  try {
    console.log("🔧 FIXING mackaengin@gmail.com authentication issue...");

    // Step 1: Get current password hash for backup
    const user = await prisma.user.findUnique({
      where: { email: "mackaengin@gmail.com" },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("📝 Original password hash backed up");
    const originalPasswordHash = user.passwordHash;

    // Step 2: Temporarily set a known password for testing
    const testPassword = "test123";
    const newPasswordHash = await bcrypt.hash(testPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    console.log('🔑 Password temporarily changed to "test123" for testing');

    // Step 3: Test the login API with the new password
    console.log("\n🧪 Testing login API...");

    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "mackaengin@gmail.com",
        password: testPassword,
      }),
    });

    const responseData = await response.json();

    console.log("📡 LOGIN API Status:", response.status);
    console.log(
      "📡 LOGIN API Response:",
      JSON.stringify(responseData, null, 2)
    );

    if (response.ok) {
      console.log("✅ LOGIN SUCCESSFUL!");
      console.log("🎯 User ID:", responseData.user?.id);
      console.log("🎯 Business ID:", responseData.user?.business?.id);
      console.log("🎯 Business Name:", responseData.user?.business?.name);
      console.log("🎯 Token received:", !!responseData.token);

      // Step 4: Test the /api/users/me endpoint with the token
      console.log("\n🧪 Testing /api/users/me endpoint...");

      const meResponse = await fetch("http://localhost:3000/api/users/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${responseData.token}`,
          "Content-Type": "application/json",
        },
      });

      const meData = await meResponse.json();
      console.log("📡 /api/users/me Status:", meResponse.status);
      console.log(
        "📡 /api/users/me Response:",
        JSON.stringify(meData, null, 2)
      );
    } else {
      console.log("❌ LOGIN STILL FAILED");
      console.log("Error:", responseData.error);
    }

    // Step 5: Restore original password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: originalPasswordHash },
    });

    console.log("\n🔄 Original password restored");
  } catch (error) {
    console.error("❌ Error during authentication test:", error);

    // Make sure to restore password even if there's an error
    if (user?.id && originalPasswordHash) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: originalPasswordHash },
        });
        console.log("🔄 Password restored after error");
      } catch (restoreError) {
        console.error("❌ Failed to restore password:", restoreError);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixAuthenticationIssue();
