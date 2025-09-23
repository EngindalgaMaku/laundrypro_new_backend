const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function testCredentials() {
  try {
    console.log("🔍 Testing login credentials...");

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: "test@laundrypro.com" },
    });

    if (!user) {
      console.log("❌ User not found in database");
      return;
    }

    console.log("✅ User found:", {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
      hasPassword: !!user.passwordHash,
    });

    // Test password verification
    const testPassword = "test123";
    const isValidPassword = await bcrypt.compare(
      testPassword,
      user.passwordHash
    );

    console.log(
      `🔐 Password test for "${testPassword}":`,
      isValidPassword ? "✅ Valid" : "❌ Invalid"
    );

    if (!isValidPassword) {
      console.log("💡 Creating new password hash for test123...");
      const newHash = await bcrypt.hash(testPassword, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      console.log("✅ Password hash updated successfully");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testCredentials();
