import { PrismaClient } from "@prisma/client";
import { createWhatsAppService } from "./whatsapp-service";
import { createCustomerCommunicationActions } from "./communication";
import * as cron from "node-cron";

const prisma = new PrismaClient();

// Order status to WhatsApp template mapping
const ORDER_STATUS_TEMPLATES = {
  CONFIRMED: "order_confirmation",
  IN_PROGRESS: "order_status_update",
  READY_FOR_PICKUP: "order_ready",
  READY_FOR_DELIVERY: "order_ready",
  OUT_FOR_DELIVERY: "order_delivery",
  DELIVERED: "order_status_update",
  COMPLETED: "order_status_update",
} as const;

// Turkish status translations
const STATUS_TRANSLATIONS = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  IN_PROGRESS: "İşlemde",
  READY_FOR_PICKUP: "Teslim Almaya Hazır",
  READY_FOR_DELIVERY: "Teslimat İçin Hazır",
  OUT_FOR_DELIVERY: "Yolda",
  DELIVERED: "Teslim Edildi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
} as const;

export interface OrderStatusChangeEvent {
  orderId: string;
  oldStatus: string;
  newStatus: string;
  changedBy?: string;
  notes?: string;
}

export class WhatsAppOrderIntegration {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Handle order status change and send WhatsApp notification
   */
  async handleOrderStatusChange(event: OrderStatusChangeEvent): Promise<void> {
    try {
      // Get order details
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: {
          customer: true,
          business: true,
          orderItems: {
            include: {
              service: true,
            },
          },
        },
      });

      if (!order || !order.customer) {
        console.log(`Order ${event.orderId} or customer not found`);
        return;
      }

      // Check if WhatsApp is available for this business
      const whatsappService = await createWhatsAppService(
        order.businessId,
        this.prisma
      );
      if (!whatsappService) {
        console.log(`WhatsApp not configured for business ${order.businessId}`);
        return;
      }

      // Skip notification for certain status changes
      if (event.newStatus === "PENDING" || event.newStatus === "CANCELLED") {
        return;
      }

      // Prepare customer data
      const customer = {
        ...order.customer,
        businessId: order.businessId,
      };

      const customerName = `${customer.firstName} ${customer.lastName}`;
      const orderNumber = order.orderNumber;
      const statusText =
        STATUS_TRANSLATIONS[
          event.newStatus as keyof typeof STATUS_TRANSLATIONS
        ] || event.newStatus;

      // Create communication actions
      const communicationActions = createCustomerCommunicationActions(customer);

      // Send appropriate notification based on status
      switch (event.newStatus) {
        case "CONFIRMED":
          await communicationActions.sendOrderConfirmation(
            orderNumber,
            order.totalAmount.toString()
          );
          break;

        case "READY_FOR_PICKUP":
          await communicationActions.sendOrderReady(orderNumber);
          break;

        case "READY_FOR_DELIVERY":
          await communicationActions.sendOrderReady(orderNumber);
          break;

        case "OUT_FOR_DELIVERY":
          if (order.deliveryTime) {
            const deliveryTime = new Date(
              order.deliveryTime
            ).toLocaleTimeString("tr-TR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            await communicationActions.sendOrderDelivery(
              orderNumber,
              deliveryTime
            );
          } else {
            await communicationActions.sendOrderUpdate(orderNumber, statusText);
          }
          break;

        case "DELIVERED":
        case "COMPLETED":
          await communicationActions.sendOrderUpdate(orderNumber, statusText);

          // Schedule feedback request after 30 minutes
          setTimeout(() => {
            this.sendFeedbackRequest(order.id);
          }, 30 * 60 * 1000);
          break;

        default:
          await communicationActions.sendOrderUpdate(orderNumber, statusText);
          break;
      }

      console.log(
        `WhatsApp notification sent for order ${orderNumber} status change: ${event.oldStatus} → ${event.newStatus}`
      );
    } catch (error) {
      console.error("Error handling order status change:", error);
    }
  }

  /**
   * Send pickup reminder notifications
   */
  async sendPickupReminders(): Promise<void> {
    try {
      // Find orders scheduled for pickup in the next 2 hours
      const upcomingPickups = await this.prisma.order.findMany({
        where: {
          status: "READY_FOR_PICKUP",
          pickupTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 2 * 60 * 60 * 1000), // Next 2 hours
          },
        },
        include: {
          customer: true,
          business: true,
        },
      });

      for (const order of upcomingPickups) {
        if (!order.customer || !order.pickupTime) continue;

        const whatsappService = await createWhatsAppService(
          order.businessId,
          this.prisma
        );
        if (!whatsappService) continue;

        const customer = {
          ...order.customer,
          businessId: order.businessId,
        };

        const customerName = `${customer.firstName} ${customer.lastName}`;
        const pickupTime = order.pickupTime.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const communicationActions =
          createCustomerCommunicationActions(customer);
        await communicationActions.sendOrderPickup(
          order.orderNumber,
          pickupTime
        );
      }
    } catch (error) {
      console.error("Error sending pickup reminders:", error);
    }
  }

  /**
   * Send delivery notifications
   */
  async sendDeliveryNotifications(): Promise<void> {
    try {
      // Find orders scheduled for delivery in the next hour
      const upcomingDeliveries = await this.prisma.order.findMany({
        where: {
          status: "OUT_FOR_DELIVERY",
          deliveryTime: {
            gte: new Date(),
            lte: new Date(Date.now() + 60 * 60 * 1000), // Next hour
          },
        },
        include: {
          customer: true,
          business: true,
        },
      });

      for (const order of upcomingDeliveries) {
        if (!order.customer || !order.deliveryTime) continue;

        const whatsappService = await createWhatsAppService(
          order.businessId,
          this.prisma
        );
        if (!whatsappService) continue;

        const customer = {
          ...order.customer,
          businessId: order.businessId,
        };

        const customerName = `${customer.firstName} ${customer.lastName}`;
        const deliveryTime = order.deliveryTime.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const communicationActions =
          createCustomerCommunicationActions(customer);
        await communicationActions.sendOrderDelivery(
          order.orderNumber,
          deliveryTime
        );
      }
    } catch (error) {
      console.error("Error sending delivery notifications:", error);
    }
  }

  /**
   * Send feedback request after order completion
   */
  async sendFeedbackRequest(orderId: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
          business: true,
        },
      });

      if (!order || !order.customer) return;

      const whatsappService = await createWhatsAppService(
        order.businessId,
        this.prisma
      );
      if (!whatsappService) return;

      const customerName = `${order.customer.firstName} ${order.customer.lastName}`;

      // Send feedback request using template
      await whatsappService.sendTemplateMessage(
        order.customer.whatsapp || order.customer.phone,
        "feedback_request",
        "tr",
        [
          { type: "text", text: customerName },
          { type: "text", text: order.orderNumber },
        ],
        order.customer.id,
        order.id,
        order.businessId
      );
    } catch (error) {
      console.error("Error sending feedback request:", error);
    }
  }

  /**
   * Send payment reminders for pending payments
   */
  async sendPaymentReminders(): Promise<void> {
    try {
      // Find orders with pending payments older than 24 hours
      const pendingPayments = await this.prisma.order.findMany({
        where: {
          paymentStatus: "PENDING",
          status: {
            in: [
              "CONFIRMED",
              "IN_PROGRESS",
              "READY_FOR_PICKUP",
              "READY_FOR_DELIVERY",
            ],
          },
          createdAt: {
            lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
          },
        },
        include: {
          customer: true,
          business: true,
        },
      });

      for (const order of pendingPayments) {
        if (!order.customer) continue;

        const whatsappService = await createWhatsAppService(
          order.businessId,
          this.prisma
        );
        if (!whatsappService) continue;

        const customerName = `${order.customer.firstName} ${order.customer.lastName}`;

        await whatsappService.sendTextMessage(
          order.customer.whatsapp || order.customer.phone,
          `Merhaba ${customerName}, ${order.orderNumber} numaralı siparişiniz için ${order.totalAmount} TL ödeme beklenmektedir. Ödeme yapmak için lütfen bizimle iletişime geçin.`,
          order.customer.id,
          order.id,
          order.businessId
        );
      }
    } catch (error) {
      console.error("Error sending payment reminders:", error);
    }
  }

  /**
   * Handle payment received notification
   */
  async handlePaymentReceived(orderId: string, amount: string): Promise<void> {
    try {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: true,
        },
      });

      if (!order || !order.customer) return;

      const customer = {
        ...order.customer,
        businessId: order.businessId,
      };

      const communicationActions = createCustomerCommunicationActions(customer);
      await communicationActions.sendPaymentReceived(order.orderNumber, amount);
    } catch (error) {
      console.error("Error handling payment received notification:", error);
    }
  }

  /**
   * Send welcome message to new customers
   */
  async sendCustomerWelcome(
    customerId: string,
    businessName: string
  ): Promise<void> {
    try {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) return;

      const customerWithBusiness = {
        ...customer,
        businessId: customer.businessId,
      };

      const communicationActions =
        createCustomerCommunicationActions(customerWithBusiness);
      await communicationActions.sendWelcomeMessage(businessName);
    } catch (error) {
      console.error("Error sending customer welcome:", error);
    }
  }
}

// Singleton instance
let orderIntegration: WhatsAppOrderIntegration | null = null;

export function getOrderIntegration(): WhatsAppOrderIntegration {
  if (!orderIntegration) {
    orderIntegration = new WhatsAppOrderIntegration(prisma);
  }
  return orderIntegration;
}

/**
 * Initialize WhatsApp order integration with cron jobs
 */
export function initializeWhatsAppOrderIntegration(): void {
  const integration = getOrderIntegration();

  // Send pickup reminders every hour
  cron.schedule("0 * * * *", () => {
    integration.sendPickupReminders();
  });

  // Send delivery notifications every 30 minutes during business hours (8 AM - 8 PM)
  cron.schedule("*/30 8-20 * * *", () => {
    integration.sendDeliveryNotifications();
  });

  // Send payment reminders once a day at 10 AM
  cron.schedule("0 10 * * *", () => {
    integration.sendPaymentReminders();
  });

  console.log("WhatsApp order integration initialized with scheduled tasks");
}

/**
 * Webhook for order status changes (to be called from order update endpoints)
 */
export async function notifyOrderStatusChange(
  event: OrderStatusChangeEvent
): Promise<void> {
  const integration = getOrderIntegration();
  await integration.handleOrderStatusChange(event);
}

/**
 * Webhook for payment received (to be called from payment endpoints)
 */
export async function notifyPaymentReceived(
  orderId: string,
  amount: string
): Promise<void> {
  const integration = getOrderIntegration();
  await integration.handlePaymentReceived(orderId, amount);
}

/**
 * Webhook for new customer registration
 */
export async function notifyCustomerWelcome(
  customerId: string,
  businessName: string
): Promise<void> {
  const integration = getOrderIntegration();
  await integration.sendCustomerWelcome(customerId, businessName);
}
