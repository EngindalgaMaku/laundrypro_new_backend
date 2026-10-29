import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { deleteAllOrderPhotos } from "@/lib/storage/order-photos";

/**
 * In-app account deletion (Google Play requires it for apps with sign-up).
 *
 * Business owner: the business and everything it owns are deleted. Most relations are
 * onDelete: Restrict, so rows go in dependency order inside one transaction; the rest
 * cascade when the business row goes.
 *
 * Other staff: the user row stays because route assignments must point to a user, but every
 * personal field is replaced and the account can no longer sign in.
 */
export async function deleteBusinessCompletely(businessId: string) {
  const inBusiness = { businessId };
  const ofBusinessRoute = { route: { businessId } };
  const users = await prisma.user.findMany({ where: inBusiness, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const orders = await prisma.order.findMany({ where: inBusiness, select: { id: true } });
  // Deleted orders kept for restoring still have their photos on disk
  const archived = await prisma.deletedOrder.findMany({ where: inBusiness, select: { orderId: true } });

  await prisma.$transaction([
    prisma.vehicleTrackingLog.deleteMany({ where: { vehicle: inBusiness } }),
    prisma.routeAssignment.deleteMany({ where: ofBusinessRoute }),
    prisma.routeStop.deleteMany({ where: ofBusinessRoute }),
    prisma.route.deleteMany({ where: inBusiness }),
    prisma.whatsAppMessage.deleteMany({ where: inBusiness }),
    prisma.eInvoice.deleteMany({ where: inBusiness }),
    prisma.invoice.deleteMany({ where: inBusiness }),
    prisma.order.deleteMany({ where: inBusiness }),
    prisma.customer.deleteMany({ where: inBusiness }),
    prisma.vehicle.deleteMany({ where: inBusiness }),
    prisma.deliveryZone.deleteMany({ where: inBusiness }),
    prisma.permissionAuditLog.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: inBusiness }),
    prisma.business.delete({ where: { id: businessId } }),
  ]);

  // Expenses and deleted orders go with the business row (onDelete: Cascade).
  // Photo files live on disk, outside the database (lib/storage/order-photos.ts)
  const photoOrderIds = [...orders.map((o) => o.id), ...archived.map((a) => a.orderId)];
  await Promise.all(photoOrderIds.map((id) => deleteAllOrderPhotos(id).catch(() => {})));
}

export async function anonymizeUser(userId: string) {
  const unusablePassword = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  await prisma.$transaction([
    prisma.userSession.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.vehicle.updateMany({ where: { assignedDriverId: userId }, data: { assignedDriverId: null } }),
    prisma.user.update({
      where: { id: userId },
      data: {
        email: `silinmis-${userId}@deleted.invalid`,
        firstName: "Silinmiş",
        lastName: "kullanıcı",
        phone: null,
        profilePhoto: null,
        passwordHash: unusablePassword,
        twoFactorSecret: null,
        twoFactorEnabled: false,
        isActive: false,
        marketingConsent: false,
      },
    }),
  ]);
}
