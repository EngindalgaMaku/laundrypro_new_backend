const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function resetPassword() {
  try {
    console.log("🔑 Resetting zeyno@gmail.com password...\n");

    console.log("📧 Looking for user: zeyno@gmail.com");

    const user = await prisma.user.findUnique({
      where: { email: "zeyno@gmail.com" },
      include: { business: true },
    });

    if (!user) {
      console.log("❌ User not found!");
      return;
    }

    console.log("✅ User found:");
    console.log(`   Email: ${user.email}`);
    console.log(`   Business: ${user.business?.name || "No business"}`);
    console.log(`   Business ID: ${user.businessId}`);
    console.log(`   Role: ${user.role}`);

    // Set new password to "123456"
    const newPassword = "123456";
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { email: "zeyno@gmail.com" },
      data: {
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log("\n✅ Password reset successful!");
    console.log(`📧 Email: zeyno@gmail.com`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`🏢 Business: ${user.business?.name}`);
    console.log(`📱 You can now login to mobile app with these credentials`);

    console.log("\n🎯 Expected after login:");
    console.log(`   - Should see only ${user.business?.name} services`);
    console.log(`   - Should see exactly 19 services (not 38)`);
    console.log(`   - Business ID should be: ${user.businessId}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetPassword();
