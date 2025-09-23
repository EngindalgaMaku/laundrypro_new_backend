const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config();

const prisma = new PrismaClient();

async function debugMackaenginAuthFlow() {
  console.log(
    "🔍 [AUTH-DEBUG] Testing authentication flow for mackaengin@gmail.com"
  );
  console.log("=====================================");

  const testEmail = "mackaengin@gmail.com";

  try {
    // Step 1: Check user exists in database
    console.log("\n📊 Step 1: Checking user in database...");
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
            isActive: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!dbUser) {
      console.error("❌ User not found in database!");
      return;
    }

    console.log("✅ User found in database:");
    console.log(`   - ID: ${dbUser.id}`);
    console.log(`   - Email: ${dbUser.email}`);
    console.log(`   - Name: ${dbUser.firstName} ${dbUser.lastName}`);
    console.log(`   - Role: ${dbUser.role}`);
    console.log(`   - Is Active: ${dbUser.isActive}`);
    console.log(`   - Business ID: ${dbUser.businessId}`);
    console.log(`   - Business Object:`, dbUser.business ? "EXISTS" : "NULL");

    if (dbUser.business) {
      console.log(`   - Business Name: ${dbUser.business.name}`);
      console.log(`   - Business Type: ${dbUser.business.businessType}`);
      console.log(`   - Business Active: ${dbUser.business.isActive}`);
    }

    // Step 2: Test JWT token creation (simulate login)
    console.log("\n🔐 Step 2: Testing JWT token creation...");

    if (!dbUser.businessId) {
      console.error("❌ PROBLEM: User has no businessId in database!");
      return;
    }

    if (!dbUser.business) {
      console.error("❌ PROBLEM: User business relationship is null!");
      return;
    }

    // Simulate the login token creation process
    const tokenPayload = {
      userId: dbUser.id,
      email: dbUser.email,
      businessId: dbUser.business.id, // Using business.id from relationship
      role: dbUser.role,
      iat: Math.floor(Date.now() / 1000),
    };

    console.log("📝 Token payload created:");
    console.log("   - userId:", tokenPayload.userId);
    console.log("   - email:", tokenPayload.email);
    console.log("   - businessId:", tokenPayload.businessId);
    console.log("   - role:", tokenPayload.role);

    const token = jwt.sign(tokenPayload, process.env.NEXTAUTH_SECRET, {
      expiresIn: "7d",
    });

    console.log("✅ JWT token created successfully");

    // Step 3: Test JWT token verification
    console.log("\n🔍 Step 3: Testing JWT token verification...");

    try {
      const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
      console.log("✅ Token verified successfully:");
      console.log("   - userId:", decoded.userId);
      console.log("   - email:", decoded.email);
      console.log("   - businessId:", decoded.businessId);
      console.log("   - role:", decoded.role);
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
    }

    // Step 4: Test the customer API endpoint flow
    console.log("\n🏪 Step 4: Testing customer API endpoint flow...");

    // Simulate what happens in customer API endpoint
    const currentUser = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: {
        id: true,
        email: true,
        businessId: true,
        isActive: true,
      },
    });

    console.log("👤 Current user lookup result:");
    console.log("   - Found:", !!currentUser);
    console.log("   - businessId:", currentUser?.businessId);
    console.log("   - isActive:", currentUser?.isActive);

    if (!currentUser?.businessId) {
      console.error("❌ PROBLEM: businessId is null in user lookup!");
      return;
    }

    // Test business validation
    const businessData = await prisma.business.findUnique({
      where: { id: currentUser.businessId },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    console.log("🏢 Business validation result:");
    console.log("   - Found:", !!businessData);
    console.log("   - ID:", businessData?.id);
    console.log("   - Name:", businessData?.name);
    console.log("   - isActive:", businessData?.isActive);

    if (!businessData) {
      console.error("❌ PROBLEM: Business not found!");
      return;
    }

    if (!businessData.isActive) {
      console.error("❌ PROBLEM: Business is inactive!");
      return;
    }

    // Step 5: Test mobile app flow
    console.log("\n📱 Step 5: Testing mobile app auth flow...");

    // Simulate login API response structure
    const loginApiResponse = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: dbUser.role,
        business: dbUser.business
          ? {
              id: dbUser.business.id,
              name: dbUser.business.name,
              businessType: dbUser.business.businessType,
              email: dbUser.business.email,
              phone: dbUser.business.phone,
            }
          : null,
      },
      token: token,
    };

    // Simulate mobile auth service processing
    const mobileUser = {
      id: loginApiResponse.user.id,
      email: loginApiResponse.user.email,
      firstName: loginApiResponse.user.firstName,
      lastName: loginApiResponse.user.lastName,
      role: loginApiResponse.user.role,
      businessId: loginApiResponse.user.business?.id || null,
      phone: loginApiResponse.user.business?.phone,
    };

    console.log("📱 Mobile user object:");
    console.log("   - businessId:", mobileUser.businessId);
    console.log("   - Has business association:", !!mobileUser.businessId);

    if (!mobileUser.businessId) {
      console.error(
        '❌ PROBLEM: Mobile app would show "hesabınıza bir işyeri atanmamış" error!'
      );
      return;
    }

    console.log("\n✅ All authentication flow tests PASSED!");
    console.log(
      '🔍 If user is still getting "işyeri bulunamadı" error, the issue might be:'
    );
    console.log(
      "   1. Token not being properly stored/retrieved in mobile app"
    );
    console.log("   2. Token being modified or corrupted during storage");
    console.log("   3. Network issues preventing proper token transmission");
    console.log("   4. Mobile app state management issues");
  } catch (error) {
    console.error("💥 Error during auth flow debug:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugMackaenginAuthFlow().catch(console.error);
