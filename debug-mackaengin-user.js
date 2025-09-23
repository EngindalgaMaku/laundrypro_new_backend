const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log("🔍 Checking database record for mackaengin@gmail.com...");

    const user = await prisma.user.findUnique({
      where: { email: "mackaengin@gmail.com" },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            businessType: true,
            isActive: true,
          },
        },
      },
    });

    console.log("👤 User Record:");
    console.log("📧 Email:", user?.email);
    console.log("🆔 User ID:", user?.id);
    console.log("🏢 Business ID in user record:", user?.businessId);
    console.log("🏢 Business relationship:", user?.business);
    console.log("✅ User active:", user?.isActive);

    if (!user) {
      console.log("❌ USER NOT FOUND!");
      return;
    }

    if (!user.businessId) {
      console.log("⚠️  ISSUE FOUND: User has NO businessId assigned!");

      // Check if there are any businesses in the database
      const businesses = await prisma.business.findMany({
        select: { id: true, name: true, businessType: true },
      });

      console.log("🏢 Available businesses:", businesses);

      if (businesses.length > 0) {
        console.log(
          "💡 SUGGESTED FIX: Assign user to business:",
          businesses[0].id
        );
      }
    }

    if (user?.businessId && !user?.business) {
      console.log(
        "⚠️  ISSUE FOUND: User has businessId but business relationship is null!"
      );
      console.log("🔍 Checking if business exists...");

      const business = await prisma.business.findUnique({
        where: { id: user.businessId },
      });

      console.log("🏢 Business exists:", !!business);
      console.log("🏢 Business details:", business);

      if (!business) {
        console.log("❌ BUSINESS DOES NOT EXIST! This is the root cause.");
      }
    }
  } catch (error) {
    console.error("❌ Error checking user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
