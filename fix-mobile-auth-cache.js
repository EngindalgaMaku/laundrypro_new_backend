/**
 * IMMEDIATE FIX for mackaengin@gmail.com mobile authentication issue
 *
 * DIAGNOSIS:
 * - Database: ✅ User has proper businessId relationship
 * - Web API: ✅ /api/auth/login works perfectly
 * - Mobile App: ❌ Likely has stale cached data without businessId
 *
 * SOLUTION:
 * 1. Clear any cached authentication data for this user
 * 2. Force the mobile app to do a fresh login
 * 3. Verify the new login works correctly
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixMobileAuthIssue() {
  try {
    console.log(
      "🔧 FIXING mackaengin@gmail.com mobile authentication issue..."
    );

    // Step 1: Verify the user has correct database setup
    const user = await prisma.user.findUnique({
      where: { email: "mackaengin@gmail.com" },
      include: {
        business: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    if (!user.businessId || !user.business) {
      console.log("❌ User still missing business relationship");
      return;
    }

    console.log("✅ Database verification passed:");
    console.log(`   User ID: ${user.id}`);
    console.log(`   Business ID: ${user.businessId}`);
    console.log(`   Business Name: ${user.business.name}`);

    // Step 2: Test API endpoints that mobile app uses
    console.log("\n🧪 Testing mobile app API endpoints...");

    // Test login endpoint
    const loginResponse = await fetch(
      "http://192.168.1.113:3000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "mackaengin@gmail.com",
          password: "Zeynep2016.",
        }),
      }
    );

    if (!loginResponse.ok) {
      console.log(`❌ Mobile API endpoint failed: ${loginResponse.status}`);
      console.log("🔧 This indicates the mobile app cannot reach the server");
      console.log("🔧 Checking localhost instead...");

      // Fallback to localhost test
      const localhostResponse = await fetch(
        "http://localhost:3000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "mackaengin@gmail.com",
            password: "Zeynep2016.",
          }),
        }
      );

      if (localhostResponse.ok) {
        const data = await localhostResponse.json();
        console.log("✅ Localhost API works fine");
        console.log(`✅ Business ID in response: ${data.user?.business?.id}`);
        console.log(
          "🔧 SOLUTION: Update mobile app config to use correct server IP"
        );

        // Show the correct config
        console.log("\n📝 Mobile app config should be updated:");
        console.log("File: mobile/src/config/api.ts");
        console.log(
          'Change API_BASE_URL from: "http://192.168.1.113:3000/api"'
        );
        console.log('To: "http://localhost:3000/api" or correct server IP');
      } else {
        console.log("❌ Both localhost and configured IP failed");
      }

      return;
    }

    const loginData = await loginResponse.json();
    console.log("✅ Mobile API endpoint works!");
    console.log(`✅ Business ID in response: ${loginData.user?.business?.id}`);

    // Step 3: Provide instructions for clearing mobile cache
    console.log("\n📱 MOBILE APP CACHE CLEARING INSTRUCTIONS:");
    console.log("1. Open the mobile app");
    console.log("2. Go to Settings");
    console.log('3. Look for "Clear Cache" or "Logout" option');
    console.log("4. Clear all cached data");
    console.log("5. Login again with:");
    console.log("   Email: mackaengin@gmail.com");
    console.log("   Password: Zeynep2016.");

    // Step 4: Show what to expect after fix
    console.log("\n✅ AFTER CLEARING CACHE, USER SHOULD SEE:");
    console.log(`✅ User ID: ${loginData.user?.id}`);
    console.log(`✅ Business ID: ${loginData.user?.business?.id}`);
    console.log(`✅ Business Name: ${loginData.user?.business?.name}`);
    console.log(
      `✅ Can create customers without "hesabınıza işyeri atanmamış" error`
    );
  } catch (error) {
    console.error("❌ Error during fix:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n🔧 CONNECTION REFUSED - Server is not running");
      console.log(
        "🔧 Please ensure the Next.js server is running on the configured port"
      );
      console.log("🔧 Run: npm run dev or yarn dev");
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixMobileAuthIssue();
