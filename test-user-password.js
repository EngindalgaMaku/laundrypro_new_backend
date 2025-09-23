const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function checkPassword() {
  try {
    console.log("🔍 Checking mackaengin@gmail.com password...");

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { email: "mackaengin@gmail.com" },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        businessId: true,
      },
    });

    if (!user) {
      console.log("❌ User not found");
      return;
    }

    console.log("👤 User found:", user.email);
    console.log("🔒 Password hash exists:", !!user.passwordHash);
    console.log("🔒 Password hash length:", user.passwordHash?.length);
    console.log("✅ User active:", user.isActive);

    // Test common passwords
    const commonPasswords = [
      "test123",
      "password",
      "123456",
      "admin",
      "temizlik123",
    ];

    console.log("\n🔐 Testing common passwords...");

    for (const password of commonPasswords) {
      try {
        const isValid = await bcrypt.compare(password, user.passwordHash);
        console.log(
          `Password "${password}": ${isValid ? "✅ MATCH" : "❌ No match"}`
        );

        if (isValid) {
          console.log(`\n🎉 FOUND CORRECT PASSWORD: "${password}"`);

          // Now test the UserDatabaseService directly
          console.log("\n🧪 Testing UserDatabaseService.authenticateUser...");
          const { UserDatabaseService } = require("./lib/database/users");

          const authenticatedUser = await UserDatabaseService.authenticateUser(
            user.email,
            password
          );
          console.log("✅ Auth service result:");
          console.log("User ID:", authenticatedUser.id);
          console.log("Business ID:", authenticatedUser.business?.id);
          console.log("Business Name:", authenticatedUser.business?.name);

          return;
        }
      } catch (error) {
        console.log(`Password "${password}": ❌ Error - ${error.message}`);
      }
    }

    console.log("\n❌ None of the common passwords matched");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPassword();
