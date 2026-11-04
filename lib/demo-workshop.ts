import bcrypt from "bcryptjs";
import { deleteBusinessCompletely } from "@/lib/account-deletion";
import { prisma } from "@/lib/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";
import { newOrderNumber, newTrackingToken } from "@/lib/order-codes";

const HOUR = 3600 * 1000;
const CHECK_EVERY_MS = 10 * 60 * 1000;
const RESET_HOUR_TR = 3;

/** Replaces the demo business with fresh, made-up data dated around today */
export async function seedDemoBusiness() {
  // The published accounts must not take over an address a real business already uses
  const taken = await prisma.user.findFirst({
    where: {
      email: { in: DEMO_ACCOUNTS.map((a) => a.email) },
      OR: [{ businessId: null }, { business: { isDemo: false } }],
    },
    select: { email: true },
  });
  if (taken) {
    console.error(`[demo] ${taken.email} başka bir işletmede kayıtlı; demo kurulmadı`);
    return;
  }

  const old = await prisma.business.findMany({ where: { isDemo: true }, select: { id: true } });
  for (const { id } of old) await deleteBusinessCompletely(id);

  const business = await prisma.business.create({
    data: {
      isDemo: true,
      name: "Berrak Halı Yıkama (Demo)",
      businessType: "CARPET_CLEANING",
      phone: "02160000000",
      address: "Örnek Mahallesi, Deneme Sokak No: 1",
      city: "İstanbul",
      district: "Kadıköy",
      latitude: 40.982,
      longitude: 29.03,
      onboardingCompleted: true,
    },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const roleId = async (name: string) =>
    (await prisma.role.findUnique({ where: { name }, select: { id: true } }).catch(() => null))?.id ?? null;
  const account = async (email: string, role: "OWNER" | "EMPLOYEE" | "DRIVER", firstName: string, lastName: string) =>
    prisma.user.create({
      data: {
        businessId: business.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        roleId: await roleId(role),
        kvkkConsent: true,
        privacyConsent: true,
        termsConsent: true,
        consentDate: new Date(),
      },
    });
  const owner = await account(DEMO_ACCOUNTS[0].email, "OWNER", "Demo", "Yönetici");
  await account(DEMO_ACCOUNTS[1].email, "EMPLOYEE", "Demo", "Çalışan");
  const driver = await account(DEMO_ACCOUNTS[2].email, "DRIVER", "Demo", "Şoför");

  const services = await Promise.all(
    [
      { name: "Halı Yıkama", category: "CARPET_CLEANING", price: 120, unit: "m2", pricing: "PER_M2" },
      { name: "Koltuk Yıkama", category: "UPHOLSTERY_CLEANING", price: 450, unit: "adet", pricing: "FIXED" },
      { name: "Perde Yıkama", category: "CURTAIN_CLEANING", price: 90, unit: "m2", pricing: "PER_M2" },
    ].map(async (s, sortOrder) => {
      const service = await prisma.service.create({
        data: { businessId: business.id, name: s.name, category: s.category as never, price: s.price, sortOrder },
      });
      await prisma.servicePricing.create({
        data: {
          serviceId: service.id,
          businessId: business.id,
          name: "Standart",
          pricingType: s.pricing as never,
          basePrice: s.price,
          unit: s.unit,
        },
      });
      return service;
    })
  );
  const [carpet, sofa, curtain] = services;

  // status path, hours ago, what was washed, paid in full?
  const orders = [
    { name: ["Ayşe", "Yılmaz"], street: "Bağdat Caddesi No: 120 Daire 4", status: "PENDING", age: 1, item: [carpet, 12], paid: false },
    { name: ["Mehmet", "Kaya"], street: "Moda Caddesi No: 45", status: "CONFIRMED", age: 4, item: [sofa, 2], paid: false },
    { name: ["Elif", "Demir"], street: "Fener Kalamış Caddesi No: 7", status: "READY_FOR_PICKUP", age: 6, item: [curtain, 18], paid: false },
    { name: ["Hasan", "Çelik"], street: "Muvakkithane Caddesi No: 3", status: "IN_PROGRESS", age: 26, item: [carpet, 20], paid: false },
    { name: ["Zeynep", "Arslan"], street: "Kozyatağı 1458. Sokak No: 4 Daire 3", status: "READY_FOR_DELIVERY", age: 50, item: [carpet, 15], paid: false },
    { name: ["Fatma", "Şahin"], street: "Acıbadem Caddesi No: 80", status: "OUT_FOR_DELIVERY", age: 54, item: [sofa, 3], paid: true },
    { name: ["Ali", "Öztürk"], street: "Göztepe Caddesi No: 15", status: "DELIVERED", age: 70, item: [carpet, 24], paid: true },
    { name: ["Selin", "Koç"], street: "Suadiye Caddesi No: 32", status: "DELIVERED", age: 200, item: [curtain, 22], paid: true },
  ] as const;
  const PATH = ["PENDING", "CONFIRMED", "READY_FOR_PICKUP", "IN_PROGRESS", "READY_FOR_DELIVERY", "OUT_FOR_DELIVERY", "DELIVERED"];

  // Near Kadıköy: the route screen draws at once instead of asking a map service about made-up addresses
  const POINTS = [[40.9631,29.0653],[40.9838,29.0266],[40.9711,29.0394],[40.9905,29.0244],[40.9769,29.0897],[41.0024,29.0432],[40.9866,29.0639],[40.9583,29.0876]];

  for (const [index, o] of orders.entries()) {
    const createdAt = new Date(Date.now() - o.age * HOUR);
    const customer = await prisma.customer.create({
      data: {
        businessId: business.id,
        firstName: o.name[0],
        lastName: o.name[1],
        phone: `0500000${String(1000 + index)}`,
        address: o.street,
        city: "İstanbul",
        district: "Kadıköy",
        latitude: POINTS[index][0],
        longitude: POINTS[index][1],
      },
    });
    const [service, quantity] = o.item;
    const total = Number(service.price) * quantity;
    const steps = PATH.slice(0, PATH.indexOf(o.status) + 1);
    await prisma.order.create({
      data: {
        businessId: business.id,
        orderNumber: newOrderNumber(),
        trackingToken: newTrackingToken(),
        customerId: customer.id,
        assignedUserId: driver.id,
        status: o.status as never,
        subtotal: total,
        totalAmount: total,
        paymentStatus: o.paid ? "PAID" : "PENDING",
        paymentMethod: o.paid ? "CASH" : null,
        requiresInvoice: false,
        createdAt,
        orderItems: {
          create: [{ serviceId: service.id, serviceName: service.name, quantity, unitPrice: service.price, totalPrice: total }],
        },
        statusHistory: {
          create: steps.map((status, i) => ({
            status: status as never,
            changedBy: owner.id,
            createdAt: new Date(createdAt.getTime() + (i * (o.age * HOUR)) / Math.max(steps.length, 1)),
          })),
        },
        ...(o.paid && {
          payments: {
            create: [{ amount: total, paymentMethod: "CASH", status: "PAID", paidAt: new Date(createdAt.getTime() + o.age * HOUR * 0.9) }],
          },
        }),
      },
    });
  }

  await prisma.expense.createMany({
    data: [
      { businessId: business.id, amount: 1800, category: "FUEL", description: "Dağıtım aracı yakıtı", paymentMethod: "CASH", spentAt: new Date(Date.now() - 5 * HOUR), createdById: owner.id },
      { businessId: business.id, amount: 2400, category: "SUPPLIES", description: "Şampuan ve leke çıkarıcı", paymentMethod: "CREDIT_CARD", spentAt: new Date(Date.now() - 30 * HOUR), createdById: owner.id },
    ],
  });
  console.log("[demo] demo işletmesi kuruldu");
}

/** The demo day changes at 03:00 Turkey time (UTC+3 all year), which is midnight UTC */
export const demoDay = (at: Date) => new Date(at.getTime() + (3 - RESET_HOUR_TR) * HOUR).toISOString().slice(0, 10);

/** Fills the demo business now, then refreshes it every night for as long as the server runs */
export async function startDemoResets() {
  const report = (error: unknown) => console.error("[demo] sıfırlama başarısız", error);
  await seedDemoBusiness().catch(report);
  let last = demoDay(new Date());
  setInterval(() => {
    if (demoDay(new Date()) === last) return;
    seedDemoBusiness()
      .then(() => {
        last = demoDay(new Date());
      })
      .catch(report);
  }, CHECK_EVERY_MS).unref();
}
