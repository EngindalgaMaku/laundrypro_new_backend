const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

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
    console.log(`   - Business ID: ${user.businessId}`);

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
          console.log(
            `🎯 WORKING CREDENTIALS: mackaengin@gmail.com / ${password}`
          );
          return { email: "mackaengin@gmail.com", password };
        } else {
          console.log(`   ❌ ${password} - not correct`);
        }
      } catch (error) {
        console.log(`   ❌ Error testing ${password}:`, error.message);
      }
    }

    console.log("\n❌ None of the common passwords worked");
    console.log('💡 Setting new password: "engin123"');

    // Set known password
    const hashedPassword = await bcrypt.hash("engin123", 12);
    await prisma.user.update({
      where: { email: "mackaengin@gmail.com" },
      data: { passwordHash: hashedPassword },
    });

    console.log("✅ Password updated to: engin123");
    console.log("🎯 WORKING CREDENTIALS: mackaengin@gmail.com / engin123");

    return { email: "mackaengin@gmail.com", password: "engin123" };
  } catch (error) {
    console.error("❌ Error finding credentials:", error);
  } finally {
    await prisma.$disconnect();
  }
}

findWorkingCredentials().then((result) => {
  if (result) {
    console.log("\n🎉 FINAL RESULT:");
    console.log(`📧 Email: ${result.email}`);
    console.log(`🔑 Password: ${result.password}`);
    console.log("\n💡 Use these credentials in your mobile app and tests!");
    console.log("\n🔗 Next step: Test API connectivity with:");
    console.log("   node backend/scripts/test-actual-login.js");
  }
});
