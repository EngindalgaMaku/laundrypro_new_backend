const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugBusinessAssociations() {
  console.log("🔍 Debugging Business-User Associations\n");

  try {
    // 1. Check total users and businesses
    const [totalUsers, totalBusinesses] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
    ]);

    console.log("📊 Database Overview:");
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Businesses: ${totalBusinesses}\n`);

    // 2. Check users without business association
    const usersWithoutBusiness = await prisma.user.findMany({
      where: { businessId: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    console.log("❌ Users WITHOUT Business Association:");
    if (usersWithoutBusiness.length === 0) {
      console.log("   ✅ All users have business associations\n");
    } else {
      console.log(
        `   Found ${usersWithoutBusiness.length} users without business:\n`
      );
      usersWithoutBusiness.forEach((user) => {
        console.log(`   - ${user.email} (${user.firstName} ${user.lastName})`);
        console.log(
          `     ID: ${user.id}, Role: ${user.role}, Active: ${user.isActive}`
        );
        console.log(`     Created: ${user.createdAt.toISOString()}\n`);
      });
    }

    // 3. Check users with invalid business references
    const usersWithInvalidBusiness = await prisma.user.findMany({
      where: {
        businessId: { not: null },
        business: null,
      },
      select: {
        id: true,
        email: true,
        businessId: true,
      },
    });

    console.log("🔗 Users with INVALID Business References:");
    if (usersWithInvalidBusiness.length === 0) {
      console.log("   ✅ All business references are valid\n");
    } else {
      console.log(
        `   Found ${usersWithInvalidBusiness.length} users with invalid business references:\n`
      );
      usersWithInvalidBusiness.forEach((user) => {
        console.log(
          `   - ${user.email} -> businessId: ${user.businessId} (DOES NOT EXIST)\n`
        );
      });
    }

    // 4. Show business distribution
    const businessDistribution = await prisma.user.groupBy({
      by: ["businessId"],
      where: { businessId: { not: null } },
      _count: { id: true },
    });

    console.log("🏢 Business Distribution:");
    for (const dist of businessDistribution) {
      const business = await prisma.business.findUnique({
        where: { id: dist.businessId },
        select: { name: true, businessType: true, isActive: true },
      });

      console.log(
        `   - ${business?.name || "Unknown Business"} (${dist.businessId})`
      );
      console.log(
        `     Type: ${business?.businessType}, Active: ${business?.isActive}`
      );
      console.log(`     Users: ${dist._count.id}\n`);
    }

    // 5. Show recent problematic activities
    console.log("🕒 Recent User Activities (last 24h):");
    const recentUsers = await prisma.user.findMany({
      where: {
        OR: [
          { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          { lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      },
      select: {
        email: true,
        businessId: true,
        lastLogin: true,
        createdAt: true,
        business: {
          select: { name: true },
        },
      },
      orderBy: { lastLogin: "desc" },
    });

    if (recentUsers.length === 0) {
      console.log("   No recent activity\n");
    } else {
      recentUsers.forEach((user) => {
        const status = user.businessId ? "✅ HAS BUSINESS" : "❌ NO BUSINESS";
        const businessName = user.business?.name || "None";
        console.log(`   - ${user.email} -> ${businessName} (${status})`);
        console.log(
          `     Last Login: ${user.lastLogin?.toISOString() || "Never"}`
        );
        console.log(`     Created: ${user.createdAt.toISOString()}\n`);
      });
    }
  } catch (error) {
    console.error("❌ Error during diagnosis:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to fix users without business
async function fixUsersWithoutBusiness() {
  console.log("🔧 Attempting to fix users without business association...\n");

  try {
    // Get the first available business
    const firstBusiness = await prisma.business.findFirst({
      where: { isActive: true },
    });

    if (!firstBusiness) {
      console.log("❌ No active businesses found. Cannot fix users.");
      return;
    }

    console.log(
      `🏢 Using business: ${firstBusiness.name} (${firstBusiness.id})\n`
    );

    // Update users without business
    const result = await prisma.user.updateMany({
      where: { businessId: null },
      data: { businessId: firstBusiness.id },
    });

    console.log(`✅ Updated ${result.count} users with business association\n`);
  } catch (error) {
    console.error("❌ Error during fix:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const command = process.argv[2];

if (command === "fix") {
  fixUsersWithoutBusiness();
} else {
  debugBusinessAssociations();
}
