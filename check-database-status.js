const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkDatabaseStatus() {
  console.log("🔍 Checking database status...\n");

  try {
    // Check users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        businessId: true,
        isActive: true,
      },
    });

    console.log("👥 Users in database:", users.length);
    if (users.length > 0) {
      console.log("Users:");
      users.forEach((user) => {
        console.log(
          `  - ${user.email} (${user.role}) - businessId: ${user.businessId}`
        );
      });
    } else {
      console.log("  ❌ No users found in database");
    }

    // Check businesses
    const businesses = await prisma.business.findMany({
      select: {
        id: true,
        name: true,
        businessType: true,
        isActive: true,
      },
    });

    console.log("\n🏢 Businesses in database:", businesses.length);
    if (businesses.length > 0) {
      console.log("Businesses:");
      businesses.forEach((business) => {
        console.log(
          `  - ${business.name} (${business.businessType}) - ID: ${business.id}`
        );
      });
    } else {
      console.log("  ❌ No businesses found in database");
    }

    // Check services
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        businessId: true,
      },
    });

    console.log("\n🛠️ Services in database:", services.length);
    if (services.length > 0) {
      console.log("Services:");
      services.forEach((service) => {
        console.log(`  - ${service.name} (${service.category})`);
      });
    } else {
      console.log("  ❌ No services found in database");
    }

    // Check customers
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    console.log("\n👤 Customers in database:", customers.length);
    if (customers.length > 0) {
      console.log("First 3 customers:");
      customers.slice(0, 3).forEach((customer) => {
        console.log(
          `  - ${customer.firstName} ${customer.lastName} (${
            customer.email || "no email"
          })`
        );
      });
    } else {
      console.log("  ❌ No customers found in database");
    }

    // Summary
    console.log("\n📊 DATABASE STATUS SUMMARY:");
    console.log(`  Users: ${users.length}`);
    console.log(`  Businesses: ${businesses.length}`);
    console.log(`  Services: ${services.length}`);
    console.log(`  Customers: ${customers.length}`);

    if (users.length === 0) {
      console.log("\n⚠️  DATABASE IS EMPTY!");
      console.log("💡 You need to run the seed script:");
      console.log("   cd backend && npm run db:seed");
      console.log("   or");
      console.log("   cd backend && npx ts-node prisma/seed.ts");
    }
  } catch (error) {
    console.error("❌ Error checking database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseStatus();
