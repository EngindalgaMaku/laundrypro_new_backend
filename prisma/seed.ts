import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting comprehensive RBAC database seeding...");

  // ==========================================
  // 1. CREATE ROLES
  // ==========================================
  console.log("📝 Creating RBAC roles...");

  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: "OWNER" },
      update: {},
      create: {
        name: "OWNER",
        displayName: "İşletme Sahibi",
        level: 4,
        description: "İşletmenin tam yetkili sahibi. Tüm işlemleri yapabilir.",
        isActive: true,
        isSystem: true,
      },
    }),
    prisma.role.upsert({
      where: { name: "MANAGER" },
      update: {},
      create: {
        name: "MANAGER",
        displayName: "Yönetici",
        level: 3,
        description:
          "İşletme yöneticisi. Çalışanları ve operasyonları yönetebilir.",
        isActive: true,
        isSystem: true,
      },
    }),
    prisma.role.upsert({
      where: { name: "EMPLOYEE" },
      update: {},
      create: {
        name: "EMPLOYEE",
        displayName: "Çalışan",
        level: 2,
        description: "İşletme çalışanı. Günlük operasyonları yürütebilir.",
        isActive: true,
        isSystem: true,
      },
    }),
    prisma.role.upsert({
      where: { name: "DRIVER" },
      update: {},
      create: {
        name: "DRIVER",
        displayName: "Sürücü",
        level: 1,
        description:
          "Teslimat sürücüsü. Atanan rotalar ve siparişlerle ilgilenebilir.",
        isActive: true,
        isSystem: true,
      },
    }),
  ]);

  console.log("✅ Roles created:", roles.length);

  // ==========================================
  // 2. CREATE PERMISSIONS
  // ==========================================
  console.log("🔐 Creating permissions...");

  const permissions = [
    // User Management
    {
      name: "users:create",
      category: "USERS",
      action: "CREATE",
      resource: "users",
      description: "Yeni kullanıcı oluşturma",
    },
    {
      name: "users:read",
      category: "USERS",
      action: "READ",
      resource: "users",
      description: "Kullanıcı bilgilerini görüntüleme",
    },
    {
      name: "users:update",
      category: "USERS",
      action: "UPDATE",
      resource: "users",
      description: "Kullanıcı bilgilerini güncelleme",
    },
    {
      name: "users:delete",
      category: "USERS",
      action: "DELETE",
      resource: "users",
      description: "Kullanıcı silme",
    },

    // Business Management
    {
      name: "business:read",
      category: "BUSINESS",
      action: "READ",
      resource: "business",
      description: "İşletme bilgilerini görüntüleme",
    },
    {
      name: "business:update",
      category: "BUSINESS",
      action: "UPDATE",
      resource: "business",
      description: "İşletme bilgilerini güncelleme",
    },
    {
      name: "business:manage",
      category: "BUSINESS",
      action: "MANAGE",
      resource: "business",
      description: "İşletme ayarlarını yönetme",
    },

    // Customer Management
    {
      name: "customers:create",
      category: "CUSTOMERS",
      action: "CREATE",
      resource: "customers",
      description: "Yeni müşteri ekleme",
    },
    {
      name: "customers:read",
      category: "CUSTOMERS",
      action: "READ",
      resource: "customers",
      description: "Müşteri bilgilerini görüntüleme",
    },
    {
      name: "customers:update",
      category: "CUSTOMERS",
      action: "UPDATE",
      resource: "customers",
      description: "Müşteri bilgilerini güncelleme",
    },
    {
      name: "customers:delete",
      category: "CUSTOMERS",
      action: "DELETE",
      resource: "customers",
      description: "Müşteri silme",
    },

    // Order Management
    {
      name: "orders:create",
      category: "ORDERS",
      action: "CREATE",
      resource: "orders",
      description: "Yeni sipariş oluşturma",
    },
    {
      name: "orders:read",
      category: "ORDERS",
      action: "READ",
      resource: "orders",
      description: "Sipariş bilgilerini görüntüleme",
    },
    {
      name: "orders:update",
      category: "ORDERS",
      action: "UPDATE",
      resource: "orders",
      description: "Sipariş bilgilerini güncelleme",
    },
    {
      name: "orders:delete",
      category: "ORDERS",
      action: "DELETE",
      resource: "orders",
      description: "Sipariş silme",
    },
    {
      name: "orders:assign",
      category: "ORDERS",
      action: "ASSIGN",
      resource: "orders",
      description: "Sipariş atama",
    },

    // Invoice Management
    {
      name: "invoices:create",
      category: "INVOICES",
      action: "CREATE",
      resource: "invoices",
      description: "Fatura oluşturma",
    },
    {
      name: "invoices:read",
      category: "INVOICES",
      action: "READ",
      resource: "invoices",
      description: "Fatura görüntüleme",
    },
    {
      name: "invoices:update",
      category: "INVOICES",
      action: "UPDATE",
      resource: "invoices",
      description: "Fatura güncelleme",
    },
    {
      name: "invoices:delete",
      category: "INVOICES",
      action: "DELETE",
      resource: "invoices",
      description: "Fatura silme",
    },
    {
      name: "invoices:send",
      category: "INVOICES",
      action: "SEND",
      resource: "invoices",
      description: "Fatura gönderme",
    },

    // E-Invoice Management
    {
      name: "einvoices:create",
      category: "EINVOICES",
      action: "CREATE",
      resource: "einvoices",
      description: "E-fatura oluşturma",
    },
    {
      name: "einvoices:read",
      category: "EINVOICES",
      action: "READ",
      resource: "einvoices",
      description: "E-fatura görüntüleme",
    },
    {
      name: "einvoices:send",
      category: "EINVOICES",
      action: "SEND",
      resource: "einvoices",
      description: "E-fatura gönderme",
    },
    {
      name: "einvoices:cancel",
      category: "EINVOICES",
      action: "CANCEL",
      resource: "einvoices",
      description: "E-fatura iptal etme",
    },

    // Route Management
    {
      name: "routes:create",
      category: "ROUTES",
      action: "CREATE",
      resource: "routes",
      description: "Rota oluşturma",
    },
    {
      name: "routes:read",
      category: "ROUTES",
      action: "READ",
      resource: "routes",
      description: "Rota görüntüleme",
    },
    {
      name: "routes:update",
      category: "ROUTES",
      action: "UPDATE",
      resource: "routes",
      description: "Rota güncelleme",
    },
    {
      name: "routes:delete",
      category: "ROUTES",
      action: "DELETE",
      resource: "routes",
      description: "Rota silme",
    },
    {
      name: "routes:assign",
      category: "ROUTES",
      action: "ASSIGN",
      resource: "routes",
      description: "Rota atama",
    },

    // Vehicle Management
    {
      name: "vehicles:create",
      category: "VEHICLES",
      action: "CREATE",
      resource: "vehicles",
      description: "Araç ekleme",
    },
    {
      name: "vehicles:read",
      category: "VEHICLES",
      action: "READ",
      resource: "vehicles",
      description: "Araç bilgilerini görüntüleme",
    },
    {
      name: "vehicles:update",
      category: "VEHICLES",
      action: "UPDATE",
      resource: "vehicles",
      description: "Araç bilgilerini güncelleme",
    },
    {
      name: "vehicles:delete",
      category: "VEHICLES",
      action: "DELETE",
      resource: "vehicles",
      description: "Araç silme",
    },

    // Service Management
    {
      name: "services:create",
      category: "SERVICES",
      action: "CREATE",
      resource: "services",
      description: "Hizmet ekleme",
    },
    {
      name: "services:read",
      category: "SERVICES",
      action: "READ",
      resource: "services",
      description: "Hizmet bilgilerini görüntüleme",
    },
    {
      name: "services:update",
      category: "SERVICES",
      action: "UPDATE",
      resource: "services",
      description: "Hizmet güncelleme",
    },
    {
      name: "services:delete",
      category: "SERVICES",
      action: "DELETE",
      resource: "services",
      description: "Hizmet silme",
    },

    // Reports
    {
      name: "reports:read",
      category: "REPORTS",
      action: "READ",
      resource: "reports",
      description: "Raporları görüntüleme",
    },
    {
      name: "reports:financial",
      category: "REPORTS",
      action: "FINANCIAL",
      resource: "reports",
      description: "Mali raporları görüntüleme",
    },

    // WhatsApp Integration
    {
      name: "whatsapp:send",
      category: "WHATSAPP",
      action: "SEND",
      resource: "whatsapp",
      description: "WhatsApp mesajı gönderme",
    },
    {
      name: "whatsapp:manage",
      category: "WHATSAPP",
      action: "MANAGE",
      resource: "whatsapp",
      description: "WhatsApp ayarlarını yönetme",
    },

    // Settings
    {
      name: "settings:read",
      category: "SETTINGS",
      action: "READ",
      resource: "settings",
      description: "Ayarları görüntüleme",
    },
    {
      name: "settings:update",
      category: "SETTINGS",
      action: "UPDATE",
      resource: "settings",
      description: "Ayarları güncelleme",
    },
  ];

  const createdPermissions = await Promise.all(
    permissions.map((perm) =>
      prisma.permission.upsert({
        where: { name: perm.name },
        update: {},
        create: perm,
      })
    )
  );

  console.log("✅ Permissions created:", createdPermissions.length);

  // ==========================================
  // 3. CREATE ROLE-PERMISSION ASSIGNMENTS
  // ==========================================
  console.log("🔗 Creating role-permission assignments...");

  // Get role and permission IDs
  const ownerRole = await prisma.role.findUnique({ where: { name: "OWNER" } });
  const managerRole = await prisma.role.findUnique({
    where: { name: "MANAGER" },
  });
  const employeeRole = await prisma.role.findUnique({
    where: { name: "EMPLOYEE" },
  });
  const driverRole = await prisma.role.findUnique({
    where: { name: "DRIVER" },
  });

  // OWNER permissions (all permissions)
  const allPermissions = await prisma.permission.findMany();
  const ownerPermissions = await Promise.all(
    allPermissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: ownerRole!.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: ownerRole!.id,
          permissionId: permission.id,
        },
      })
    )
  );

  // MANAGER permissions (most operations except core business management)
  const managerPermissionNames = [
    "users:read",
    "users:update",
    "business:read",
    "customers:create",
    "customers:read",
    "customers:update",
    "customers:delete",
    "orders:create",
    "orders:read",
    "orders:update",
    "orders:delete",
    "orders:assign",
    "invoices:create",
    "invoices:read",
    "invoices:update",
    "invoices:send",
    "routes:create",
    "routes:read",
    "routes:update",
    "routes:assign",
    "vehicles:read",
    "vehicles:update",
    "services:create",
    "services:read",
    "services:update",
    "services:delete",
    "reports:read",
    "reports:financial",
    "whatsapp:send",
    "settings:read",
  ];

  const managerPermissions = await Promise.all(
    managerPermissionNames.map(async (permName) => {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (permission) {
        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: managerRole!.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: managerRole!.id,
            permissionId: permission.id,
          },
        });
      }
    })
  );

  // EMPLOYEE permissions (basic operations)
  const employeePermissionNames = [
    "users:read",
    "business:read",
    "customers:create",
    "customers:read",
    "customers:update",
    "orders:create",
    "orders:read",
    "orders:update",
    "invoices:create",
    "invoices:read",
    "services:read",
    "reports:read",
    "whatsapp:send",
    "settings:read",
  ];

  const employeePermissions = await Promise.all(
    employeePermissionNames.map(async (permName) => {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (permission) {
        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: employeeRole!.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: employeeRole!.id,
            permissionId: permission.id,
          },
        });
      }
    })
  );

  // DRIVER permissions (limited to assigned orders and routes)
  const driverPermissionNames = [
    "orders:read",
    "orders:update",
    "routes:read",
    "customers:read",
  ];

  const driverPermissions = await Promise.all(
    driverPermissionNames.map(async (permName) => {
      const permission = await prisma.permission.findUnique({
        where: { name: permName },
      });
      if (permission) {
        return prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: driverRole!.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: driverRole!.id,
            permissionId: permission.id,
          },
        });
      }
    })
  );

  console.log("✅ Role-permission assignments completed");

  // ==========================================
  // 4. CREATE TEST BUSINESS
  // ==========================================
  console.log("🏢 Creating test business...");

  const business = await prisma.business.upsert({
    where: { id: "test-business-id" },
    update: {},
    create: {
      id: "test-business-id",
      name: "LaundryPro Test İşletmesi",
      businessType: "LAUNDRY",
      email: "info@laundrypro.com",
      phone: "+90 555 123 4567",
      address: "Test Mahallesi, Test Sokak No:1",
      city: "İstanbul",
      district: "Kadıköy",
      description: "Test amaçlı çamaşırhane işletmesi",
    },
  });

  console.log("✅ Business created:", business.name);

  // ==========================================
  // 5. CREATE TEST USERS WITH DIFFERENT ROLES
  // ==========================================
  console.log("👥 Creating test users with different roles...");

  const hashedPassword = await bcrypt.hash("test123", 12);

  // Owner user
  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@laundrypro.com" },
    update: {
      roleId: ownerRole!.id,
      businessId: business.id,
    },
    create: {
      businessId: business.id,
      email: "owner@laundrypro.com",
      passwordHash: hashedPassword,
      firstName: "İşletme",
      lastName: "Sahibi",
      phone: "+90 555 001 0001",
      role: "OWNER",
      roleId: ownerRole!.id,
      isActive: true,
      kvkkConsent: true,
      privacyConsent: true,
      termsConsent: true,
    },
  });

  // Manager user
  const managerUser = await prisma.user.upsert({
    where: { email: "manager@laundrypro.com" },
    update: {
      roleId: managerRole!.id,
      businessId: business.id,
    },
    create: {
      businessId: business.id,
      email: "manager@laundrypro.com",
      passwordHash: hashedPassword,
      firstName: "Yönetici",
      lastName: "Kullanıcı",
      phone: "+90 555 002 0002",
      role: "MANAGER",
      roleId: managerRole!.id,
      isActive: true,
      kvkkConsent: true,
      privacyConsent: true,
      termsConsent: true,
    },
  });

  // Employee user
  const employeeUser = await prisma.user.upsert({
    where: { email: "employee@laundrypro.com" },
    update: {
      roleId: employeeRole!.id,
      businessId: business.id,
    },
    create: {
      businessId: business.id,
      email: "employee@laundrypro.com",
      passwordHash: hashedPassword,
      firstName: "Çalışan",
      lastName: "Kullanıcı",
      phone: "+90 555 003 0003",
      role: "EMPLOYEE",
      roleId: employeeRole!.id,
      isActive: true,
      kvkkConsent: true,
      privacyConsent: true,
      termsConsent: true,
    },
  });

  // Driver user
  const driverUser = await prisma.user.upsert({
    where: { email: "driver@laundrypro.com" },
    update: {
      roleId: driverRole!.id,
      businessId: business.id,
    },
    create: {
      businessId: business.id,
      email: "driver@laundrypro.com",
      passwordHash: hashedPassword,
      firstName: "Sürücü",
      lastName: "Kullanıcı",
      phone: "+90 555 004 0004",
      role: "DRIVER",
      roleId: driverRole!.id,
      isActive: true,
      kvkkConsent: true,
      privacyConsent: true,
      termsConsent: true,
    },
  });

  console.log("✅ Test users created with roles:");
  console.log(`  - Owner: ${ownerUser.email}`);
  console.log(`  - Manager: ${managerUser.email}`);
  console.log(`  - Employee: ${employeeUser.email}`);
  console.log(`  - Driver: ${driverUser.email}`);

  // ==========================================
  // 6. CREATE SAMPLE DATA
  // ==========================================
  console.log("📊 Creating sample business data...");

  // Create test customers
  const customers = await prisma.customer.createMany({
    data: [
      {
        businessId: business.id,
        firstName: "Ahmet",
        lastName: "Yılmaz",
        email: "ahmet@example.com",
        phone: "+90 532 111 2233",
        whatsapp: "+90 532 111 2233",
        address: "Kadıköy Mahallesi, Test Sokak No:5",
        city: "İstanbul",
        district: "Kadıköy",
      },
      {
        businessId: business.id,
        firstName: "Fatma",
        lastName: "Demir",
        email: "fatma@example.com",
        phone: "+90 543 444 5566",
        whatsapp: "+90 543 444 5566",
        address: "Beşiktaş Mahallesi, Örnek Cad. No:12",
        city: "İstanbul",
        district: "Beşiktaş",
      },
      {
        businessId: business.id,
        firstName: "Mehmet",
        lastName: "Kaya",
        phone: "+90 555 777 8899",
        whatsapp: "+90 555 777 8899",
        address: "Şişli Mahallesi, Demo Sok. No:8",
        city: "İstanbul",
        district: "Şişli",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Customers created:", customers.count);

  // Create test services
  const services = await prisma.service.createMany({
    data: [
      {
        businessId: business.id,
        name: "Kuru Temizleme",
        description: "Profesyonel kuru temizleme hizmeti",
        category: "DRY_CLEANING",
      },
      {
        businessId: business.id,
        name: "Çamaşır Yıkama",
        description: "Standart çamaşır yıkama ve kurutma",
        category: "LAUNDRY",
      },
      {
        businessId: business.id,
        name: "Halı Temizleme",
        description: "Derin halı temizleme hizmeti",
        category: "CARPET_CLEANING",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Services created:", services.count);

  // Create service pricings
  const firstService = await prisma.service.findFirst({
    where: { businessId: business.id },
  });

  if (firstService) {
    const servicePricings = await prisma.servicePricing.createMany({
      data: [
        {
          serviceId: firstService.id,
          businessId: business.id,
          name: "Standart Fiyat",
          description: "Standart hizmet fiyatı",
          pricingType: "PER_ITEM",
          basePrice: 25.0,
          unit: "adet",
        },
      ],
      skipDuplicates: true,
    });
    console.log("✅ Service pricings created:", servicePricings.count);
  }

  // Create a sample order
  const firstCustomer = await prisma.customer.findFirst({
    where: { businessId: business.id },
  });

  if (firstCustomer && firstService) {
    const order = await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber: "ORD-250101-001",
        customerId: firstCustomer.id,
        assignedUserId: ownerUser.id,
        status: "PENDING",
        priority: "NORMAL",
        subtotal: 25.0,
        taxAmount: 4.5,
        totalAmount: 29.5,
        notes: "Test siparişi - RBAC sistemi testi",
        orderItems: {
          create: {
            serviceId: firstService.id,
            quantity: 1,
            unitPrice: 25.0,
            totalPrice: 25.0,
          },
        },
        statusHistory: {
          create: {
            status: "PENDING",
            changedBy: ownerUser.id,
            notes: "Sipariş oluşturuldu",
          },
        },
      },
    });

    console.log("✅ Test order created:", order.orderNumber);
  }

  console.log("\n🎉 RBAC System database seeding completed successfully!");
  console.log("\n📋 Summary:");
  console.log(`✓ Roles: ${roles.length} created`);
  console.log(`✓ Permissions: ${createdPermissions.length} created`);
  console.log(`✓ Role-Permission assignments: completed`);
  console.log(`✓ Test business: ${business.name}`);
  console.log("✓ Test users created for all roles");
  console.log("✓ Sample data: customers, services, orders");
  console.log("\n🔑 Test login credentials:");
  console.log("  - Owner: owner@laundrypro.com / test123");
  console.log("  - Manager: manager@laundrypro.com / test123");
  console.log("  - Employee: employee@laundrypro.com / test123");
  console.log("  - Driver: driver@laundrypro.com / test123");
}

main()
  .catch((e) => {
    console.error("❌ RBAC seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
