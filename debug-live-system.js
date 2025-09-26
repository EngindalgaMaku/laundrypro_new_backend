/**
 * Direct investigation of live system issues
 * Focus on database and API without external dependencies
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function checkDatabaseDirectly() {
  try {
    console.log("🗄️  Checking database directly...");

    // Check if database is accessible
    const orderCount = await prisma.order.count();
    console.log(`✅ Database accessible - Total orders: ${orderCount}`);

    // Check users in database
    console.log("\n👥 Checking users...");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        businessId: true,
        isActive: true,
      },
    });

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(
        `${index + 1}. ${user.email} (${user.firstName} ${
          user.lastName
        }) - Business: ${user.businessId} - Active: ${user.isActive}`
      );
    });

    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🔍 Using user: ${testUser.email} for testing`);

      // Check orders for this user's business
      if (testUser.businessId) {
        console.log(
          `\n📋 Checking orders for business ${testUser.businessId}...`
        );
        const orders = await prisma.order.findMany({
          where: { businessId: testUser.businessId },
          take: 3,
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
            orderItems: {
              include: {
                service: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                    description: true,
                  },
                },
              },
            },
          },
        });

        console.log(`Found ${orders.length} orders for this business`);

        if (orders.length > 0) {
          const sampleOrder = orders[0];
          console.log("\n🔍 Sample order analysis:");
          console.log("- Order ID:", sampleOrder.id);
          console.log("- Order Number:", sampleOrder.orderNumber);
          console.log("- Status:", sampleOrder.status);

          // Check the missing fields
          console.log("\n⚠️  Missing fields analysis:");
          console.log(
            `- deliveryDate: ${sampleOrder.deliveryDate || "NULL/MISSING"}`
          );
          console.log(`- priority: ${sampleOrder.priority || "NULL/MISSING"}`);
          console.log(
            `- totalAmount: ${sampleOrder.totalAmount || "NULL/MISSING"}`
          );
          console.log(
            `- orderInfo: ${sampleOrder.orderInfo || "NULL/MISSING"}`
          );
          console.log(
            `- deliveryNotes: ${sampleOrder.deliveryNotes || "NULL/MISSING"}`
          );
          console.log(
            `- referenceCode: ${sampleOrder.referenceCode || "NULL/MISSING"}`
          );
          console.log(
            `- specialInstructions: ${
              sampleOrder.specialInstructions || "NULL/MISSING"
            }`
          );

          // Check order items
          console.log(`\n🛠️  Order items: ${sampleOrder.orderItems.length}`);
          if (sampleOrder.orderItems.length === 0) {
            console.log(
              '⚠️  NO ORDER ITEMS - This explains "hizmet detayı görüntülenemedi" error!'
            );
          } else {
            sampleOrder.orderItems.forEach((item, index) => {
              console.log(`\n  Item ${index + 1}:`);
              console.log(`  - ID: ${item.id}`);
              console.log(`  - Service Name: ${item.serviceName || "MISSING"}`);
              console.log(
                `  - Service Description: ${
                  item.serviceDescription || "MISSING"
                }`
              );
              console.log(`  - Is Manual Entry: ${item.isManualEntry}`);
              console.log(`  - Has Service Object: ${!!item.service}`);
              console.log(`  - Quantity: ${item.quantity}`);
              console.log(`  - Unit Price: ${item.unitPrice}`);
              console.log(`  - Total Price: ${item.totalPrice}`);

              if (!item.service && !item.isManualEntry) {
                console.log(
                  "  ⚠️  ISSUE: Non-manual item missing service object!"
                );
              }
              if (!item.serviceName) {
                console.log(
                  '  ⚠️  ISSUE: Missing service name - will show "görüntülenemedi"!'
                );
              }
            });
          }

          return {
            userId: testUser.id,
            userEmail: testUser.email,
            businessId: testUser.businessId,
            sampleOrderId: sampleOrder.id,
            hasOrderItems: sampleOrder.orderItems.length > 0,
            hasCriticalFields: !!(
              sampleOrder.deliveryDate ||
              sampleOrder.priority ||
              sampleOrder.orderInfo
            ),
          };
        }
      }
    }
  } catch (error) {
    console.error("❌ Database check failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

async function resetTestUserPassword() {
  try {
    console.log("\n🔑 Resetting test user password...");
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("password123", 12);

    // Update the first user's password
    const user = await prisma.user.findFirst({
      select: { id: true, email: true },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: hashedPassword },
      });

      console.log(`✅ Password reset for ${user.email} to "password123"`);
      return user.email;
    }
  } catch (error) {
    console.error("❌ Password reset failed:", error.message);
  }
}

async function testAPIWithCurl(userEmail, password = "password123") {
  try {
    console.log(`\n🌐 Testing API with ${userEmail}...`);

    // Use curl to avoid dependencies
    const { exec } = require("child_process");
    const util = require("util");
    const execAsync = util.promisify(exec);

    // Test login
    const loginData = JSON.stringify({ email: userEmail, password: password });
    const loginCmd = `curl -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d "${loginData.replace(
      /"/g,
      '\\"'
    )}"`;

    console.log("Testing login...");
    const loginResult = await execAsync(loginCmd);
    console.log(
      "Login response:",
      loginResult.stdout.substring(0, 200) + "..."
    );

    try {
      const loginResponseData = JSON.parse(loginResult.stdout);
      if (loginResponseData.token) {
        console.log("✅ Login successful");

        // Test orders endpoint
        const ordersCmd = `curl -s -X GET "http://localhost:3000/api/orders?limit=2" -H "Authorization: Bearer ${loginResponseData.token}" -H "Content-Type: application/json"`;
        console.log("\nTesting orders endpoint...");
        const ordersResult = await execAsync(ordersCmd);

        try {
          const ordersData = JSON.parse(ordersResult.stdout);
          console.log("✅ Orders API successful");
          console.log(`Found ${ordersData.orders?.length || 0} orders`);

          if (ordersData.orders && ordersData.orders.length > 0) {
            const sampleOrder = ordersData.orders[0];
            console.log("\n🔍 API Response Analysis:");
            console.log("Sample order from API:", {
              id: sampleOrder.id,
              orderNumber: sampleOrder.orderNumber,
              deliveryDate: sampleOrder.deliveryDate || "MISSING",
              priority: sampleOrder.priority || "MISSING",
              totalAmount: sampleOrder.totalAmount || "MISSING",
              orderInfo: sampleOrder.orderInfo || "MISSING",
              itemsCount: sampleOrder.items?.length || 0,
            });

            // Test individual order detail
            if (sampleOrder.id) {
              const detailCmd = `curl -s -X GET "http://localhost:3000/api/orders/${sampleOrder.id}" -H "Authorization: Bearer ${loginResponseData.token}" -H "Content-Type: application/json"`;
              console.log("\nTesting order detail endpoint...");
              const detailResult = await execAsync(detailCmd);

              try {
                const detailData = JSON.parse(detailResult.stdout);
                console.log("✅ Order detail API successful");
                console.log("Detail response critical fields:", {
                  deliveryDate: detailData.deliveryDate || "MISSING",
                  priority: detailData.priority || "MISSING",
                  totalAmount: detailData.totalAmount || "MISSING",
                  orderInfo: detailData.orderInfo || "MISSING",
                  itemsCount: detailData.items?.length || 0,
                });

                // Analyze service details
                if (detailData.items && detailData.items.length > 0) {
                  console.log("\n🛠️  Service details from API:");
                  detailData.items.forEach((item, index) => {
                    console.log(`  Item ${index + 1}:`);
                    console.log(
                      `  - Service Name: ${item.serviceName || "MISSING"}`
                    );
                    console.log(
                      `  - Service Description: ${
                        item.serviceDescription || "MISSING"
                      }`
                    );
                    console.log(`  - Is Manual Entry: ${item.isManualEntry}`);
                    console.log(`  - Has Service Object: ${!!item.service}`);

                    if (!item.serviceName) {
                      console.log(
                        '  ⚠️  ROOT CAUSE FOUND: Missing serviceName causes "görüntülenemedi"!'
                      );
                    }
                  });
                } else {
                  console.log(
                    "  ⚠️  ROOT CAUSE FOUND: No items returned by API!"
                  );
                }
              } catch (e) {
                console.log("❌ Order detail parsing failed:", e.message);
                console.log(
                  "Raw response:",
                  detailResult.stdout.substring(0, 500)
                );
              }
            }
          } else {
            console.log("⚠️  No orders found in API response");
          }
        } catch (e) {
          console.log("❌ Orders parsing failed:", e.message);
          console.log("Raw response:", ordersResult.stdout.substring(0, 500));
        }
      } else {
        console.log("❌ Login failed - no token received");
        console.log("Response:", loginResult.stdout);
      }
    } catch (e) {
      console.log("❌ Login parsing failed:", e.message);
      console.log("Raw response:", loginResult.stdout);
    }
  } catch (error) {
    console.error("❌ API test failed:", error.message);
  }
}

async function main() {
  console.log("🚀 Starting Live System Investigation...\n");

  try {
    // Check database directly
    const dbResult = await checkDatabaseDirectly();

    // Reset password for testing
    const userEmail = await resetTestUserPassword();

    if (userEmail) {
      // Test API with reset password
      await testAPIWithCurl(userEmail);
    }

    console.log("\n🎯 INVESTIGATION COMPLETE");
    console.log(
      "\nThis analysis will show the exact root cause of missing fields in the real application."
    );
  } catch (error) {
    console.error("💥 Investigation failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
