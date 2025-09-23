// Customer communication utilities
import { PrismaClient } from "@prisma/client";
import {
  WhatsAppBusinessService,
  createWhatsAppService,
} from "./whatsapp-service";

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp?: string | null;
  whatsappVerified?: boolean;
  email?: string | null;
  businessId?: string;
}

export interface CommunicationOptions {
  customer: Customer;
  orderId?: string;
  message?: string;
  subject?: string;
  templateName?: string;
  templateParams?: Array<{ type: string; text: string }>;
}

export interface WhatsAppBusinessMessage {
  success: boolean;
  messageId?: string;
  error?: string;
  isBusinessAPI?: boolean;
}

// Phone call functionality
export function makePhoneCall(phoneNumber: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  const phoneUrl = `tel:${cleanPhone}`;

  if (typeof window !== "undefined") {
    window.location.href = phoneUrl;
  }

  // Log communication
  logCommunication({
    customerId: "",
    type: "CALL",
    direction: "OUTGOING",
    phone: cleanPhone,
  });
}

// WhatsApp functionality - Legacy web WhatsApp
export function sendWhatsAppMessage(phoneNumber: string, message?: string) {
  const cleanPhone = phoneNumber.replace(/\D/g, "");
  let whatsappUrl = `https://wa.me/${cleanPhone}`;

  if (message) {
    whatsappUrl += `?text=${encodeURIComponent(message)}`;
  }

  if (typeof window !== "undefined") {
    window.open(whatsappUrl, "_blank");
  }

  // Log communication
  logCommunication({
    customerId: "",
    type: "WHATSAPP",
    direction: "OUTGOING",
    phone: cleanPhone,
    content: message,
  });
}

// WhatsApp Business API - Server-side function
export async function sendWhatsAppBusinessMessage(
  customer: Customer,
  message: string,
  orderId?: string,
  templateName?: string,
  templateParams?: Array<{ type: string; text: string }>
): Promise<WhatsAppBusinessMessage> {
  try {
    if (!customer.businessId) {
      return {
        success: false,
        error: "Business ID required for WhatsApp Business API",
      };
    }

    // This should be called on the server side with proper Prisma instance
    const prisma = new PrismaClient();
    const whatsappService = await createWhatsAppService(
      customer.businessId,
      prisma
    );

    if (!whatsappService) {
      // Fallback to web WhatsApp
      sendWhatsAppMessage(customer.whatsapp || customer.phone, message);
      return { success: true, isBusinessAPI: false };
    }

    const phoneNumber = customer.whatsapp || customer.phone;

    let result;
    if (templateName) {
      result = await whatsappService.sendTemplateMessage(
        phoneNumber,
        templateName,
        "tr",
        templateParams || [],
        customer.id,
        orderId,
        customer.businessId
      );
    } else {
      result = await whatsappService.sendTextMessage(
        phoneNumber,
        message,
        customer.id,
        orderId,
        customer.businessId
      );
    }

    await prisma.$disconnect();

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      isBusinessAPI: true,
    };
  } catch (error: any) {
    console.error("WhatsApp Business API error:", error);
    // Fallback to web WhatsApp
    sendWhatsAppMessage(customer.whatsapp || customer.phone, message);
    return { success: true, isBusinessAPI: false, error: error.message };
  }
}

// Email functionality
export function sendEmail(email: string, subject?: string, body?: string) {
  let mailtoUrl = `mailto:${email}`;
  const params = [];

  if (subject) {
    params.push(`subject=${encodeURIComponent(subject)}`);
  }

  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }

  if (params.length > 0) {
    mailtoUrl += `?${params.join("&")}`;
  }

  if (typeof window !== "undefined") {
    window.location.href = mailtoUrl;
  }

  // Log communication
  logCommunication({
    customerId: "",
    type: "EMAIL",
    direction: "OUTGOING",
    email: email,
    content: body,
    subject: subject,
  });
}

// Communication templates with WhatsApp Business API template support
export const communicationTemplates = {
  orderReady: {
    whatsapp: (customerName: string, orderNumber: string) =>
      `Merhaba ${customerName}, ${orderNumber} numaralı siparişiniz hazır! Teslim almak için mağazamıza gelebilirsiniz. Teşekkürler!`,
    whatsappTemplate: {
      name: "order_ready",
      params: (customerName: string, orderNumber: string) => [
        { type: "text", text: customerName },
        { type: "text", text: orderNumber },
      ],
    },
    email: {
      subject: (orderNumber: string) => `Siparişiniz Hazır - ${orderNumber}`,
      body: (customerName: string, orderNumber: string) =>
        `Merhaba ${customerName},\n\n${orderNumber} numaralı siparişiniz hazırlandı ve teslim almaya hazır durumda.\n\nMağazamıza gelerek siparişinizi teslim alabilirsiniz.\n\nTeşekkür ederiz.`,
    },
  },
  orderPickup: {
    whatsapp: (customerName: string, orderNumber: string, pickupTime: string) =>
      `Merhaba ${customerName}, ${orderNumber} numaralı siparişinizi ${pickupTime} saatinde almaya geleceğiz. Teşekkürler!`,
    whatsappTemplate: {
      name: "order_pickup",
      params: (
        customerName: string,
        orderNumber: string,
        pickupTime: string
      ) => [
        { type: "text", text: customerName },
        { type: "text", text: orderNumber },
        { type: "text", text: pickupTime },
      ],
    },
    email: {
      subject: (orderNumber: string) =>
        `Sipariş Alma Randevusu - ${orderNumber}`,
      body: (customerName: string, orderNumber: string, pickupTime: string) =>
        `Merhaba ${customerName},\n\n${orderNumber} numaralı siparişiniz için ${pickupTime} saatinde evinizden alma işlemi yapılacaktır.\n\nLütfen siparişinizi hazır bulundurun.\n\nTeşekkür ederiz.`,
    },
  },
  orderDelivery: {
    whatsapp: (
      customerName: string,
      orderNumber: string,
      deliveryTime: string
    ) =>
      `Merhaba ${customerName}, ${orderNumber} numaralı siparişiniz ${deliveryTime} saatinde teslim edilecek. Teşekkürler!`,
    whatsappTemplate: {
      name: "order_delivery",
      params: (
        customerName: string,
        orderNumber: string,
        deliveryTime: string
      ) => [
        { type: "text", text: customerName },
        { type: "text", text: orderNumber },
        { type: "text", text: deliveryTime },
      ],
    },
    email: {
      subject: (orderNumber: string) => `Sipariş Teslimi - ${orderNumber}`,
      body: (customerName: string, orderNumber: string, deliveryTime: string) =>
        `Merhaba ${customerName},\n\n${orderNumber} numaralı siparişiniz ${deliveryTime} saatinde adresinize teslim edilecektir.\n\nLütfen teslim almaya hazır olun.\n\nTeşekkür ederiz.`,
    },
  },
  orderUpdate: {
    whatsapp: (customerName: string, orderNumber: string, status: string) =>
      `Merhaba ${customerName}, ${orderNumber} numaralı siparişinizin durumu: ${status}. Bilgilendirme için teşekkürler!`,
    whatsappTemplate: {
      name: "order_status_update",
      params: (customerName: string, orderNumber: string, status: string) => [
        { type: "text", text: customerName },
        { type: "text", text: orderNumber },
        { type: "text", text: status },
      ],
    },
    email: {
      subject: (orderNumber: string) =>
        `Sipariş Durumu Güncellendi - ${orderNumber}`,
      body: (customerName: string, orderNumber: string, status: string) =>
        `Merhaba ${customerName},\n\n${orderNumber} numaralı siparişinizin durumu güncellendi.\n\nYeni durum: ${status}\n\nTeşekkür ederiz.`,
    },
  },
  orderConfirmation: {
    whatsapp: (
      customerName: string,
      orderNumber: string,
      totalAmount: string
    ) =>
      `Merhaba ${customerName}, ${orderNumber} numaralı siparişiniz onaylandı. Toplam tutar: ${totalAmount} TL. Teşekkürler!`,
    whatsappTemplate: {
      name: "order_confirmation",
      params: (
        customerName: string,
        orderNumber: string,
        totalAmount: string
      ) => [
        { type: "text", text: customerName },
        { type: "text", text: orderNumber },
        { type: "text", text: totalAmount },
      ],
    },
    email: {
      subject: (orderNumber: string) => `Sipariş Onayı - ${orderNumber}`,
      body: (customerName: string, orderNumber: string, totalAmount: string) =>
        `Merhaba ${customerName},\n\n${orderNumber} numaralı siparişiniz başarıyla oluşturuldu ve onaylandı.\n\nToplam tutar: ${totalAmount} TL\n\nTeşekkür ederiz.`,
    },
  },
  paymentReceived: {
    whatsapp: (customerName: string, orderNumber: string, amount: string) =>
      `Merhaba ${customerName}, ${orderNumber} numaralı siparişiniz için ${amount} TL ödemeniz alınmıştır. Teşekkürler!`,
    whatsappTemplate: {
      name: "payment_received",
      params: (customerName: string, orderNumber: string, amount: string) => [
        { type: "text", text: customerName },
        { type: "text", text: orderNumber },
        { type: "text", text: amount },
      ],
    },
    email: {
      subject: (orderNumber: string) => `Ödeme Alındı - ${orderNumber}`,
      body: (customerName: string, orderNumber: string, amount: string) =>
        `Merhaba ${customerName},\n\n${orderNumber} numaralı siparişiniz için ${amount} TL ödemeniz başarıyla alınmıştır.\n\nTeşekkür ederiz.`,
    },
  },
  customerWelcome: {
    whatsapp: (customerName: string, businessName: string) =>
      `Merhaba ${customerName}, ${businessName}'e hoş geldiniz! Size nasıl yardımcı olabiliriz?`,
    whatsappTemplate: {
      name: "customer_welcome",
      params: (customerName: string, businessName: string) => [
        { type: "text", text: customerName },
        { type: "text", text: businessName },
      ],
    },
    email: {
      subject: () => "Hoş Geldiniz!",
      body: (customerName: string, businessName: string) =>
        `Merhaba ${customerName},\n\n${businessName} ailesine hoş geldiniz!\n\nSize en iyi hizmeti sunmak için buradayız.\n\nTeşekkür ederiz.`,
    },
  },
};

// Communication logging (for database)
interface CommunicationLog {
  customerId: string;
  orderId?: string;
  type: "CALL" | "SMS" | "WHATSAPP" | "EMAIL";
  direction: "INCOMING" | "OUTGOING";
  phone?: string;
  email?: string;
  content?: string;
  subject?: string;
  status?: "SENT" | "DELIVERED" | "FAILED";
}

export function logCommunication(log: CommunicationLog) {
  // This will be implemented when we have database connection
  console.log("Communication logged:", log);

  // TODO: Save to database
  // await prisma.communicationLog.create({ data: log })
}

// Enhanced communication actions with WhatsApp Business API support
export function createCustomerCommunicationActions(customer: Customer) {
  return {
    call: () => makePhoneCall(customer.phone),
    whatsapp: (message?: string) => {
      const phone = customer.whatsapp || customer.phone;
      sendWhatsAppMessage(phone, message);
    },
    whatsappBusiness: async (
      message: string,
      orderId?: string,
      templateName?: string,
      templateParams?: Array<{ type: string; text: string }>
    ) => {
      return await sendWhatsAppBusinessMessage(
        customer,
        message,
        orderId,
        templateName,
        templateParams
      );
    },
    email: (subject?: string, body?: string) => {
      if (customer.email) {
        sendEmail(customer.email, subject, body);
      }
    },
    sendOrderReady: async (orderNumber: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.orderReady;

      // Try WhatsApp Business API first
      if (customer.businessId) {
        const result = await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, orderNumber),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(customerName, orderNumber)
        );
        return result;
      } else {
        // Fallback to web WhatsApp
        const message = template.whatsapp(customerName, orderNumber);
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
    sendOrderPickup: async (orderNumber: string, pickupTime: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.orderPickup;

      if (customer.businessId) {
        return await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, orderNumber, pickupTime),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(
            customerName,
            orderNumber,
            pickupTime
          )
        );
      } else {
        const message = template.whatsapp(
          customerName,
          orderNumber,
          pickupTime
        );
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
    sendOrderDelivery: async (orderNumber: string, deliveryTime: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.orderDelivery;

      if (customer.businessId) {
        return await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, orderNumber, deliveryTime),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(
            customerName,
            orderNumber,
            deliveryTime
          )
        );
      } else {
        const message = template.whatsapp(
          customerName,
          orderNumber,
          deliveryTime
        );
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
    sendOrderUpdate: async (orderNumber: string, status: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.orderUpdate;

      if (customer.businessId) {
        return await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, orderNumber, status),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(customerName, orderNumber, status)
        );
      } else {
        const message = template.whatsapp(customerName, orderNumber, status);
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
    sendOrderConfirmation: async (orderNumber: string, totalAmount: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.orderConfirmation;

      if (customer.businessId) {
        return await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, orderNumber, totalAmount),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(
            customerName,
            orderNumber,
            totalAmount
          )
        );
      } else {
        const message = template.whatsapp(
          customerName,
          orderNumber,
          totalAmount
        );
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
    sendPaymentReceived: async (orderNumber: string, amount: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.paymentReceived;

      if (customer.businessId) {
        return await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, orderNumber, amount),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(customerName, orderNumber, amount)
        );
      } else {
        const message = template.whatsapp(customerName, orderNumber, amount);
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
    sendWelcomeMessage: async (businessName: string) => {
      const customerName = `${customer.firstName} ${customer.lastName}`;
      const template = communicationTemplates.customerWelcome;

      if (customer.businessId) {
        return await sendWhatsAppBusinessMessage(
          customer,
          template.whatsapp(customerName, businessName),
          undefined,
          template.whatsappTemplate.name,
          template.whatsappTemplate.params(customerName, businessName)
        );
      } else {
        const message = template.whatsapp(customerName, businessName);
        const phone = customer.whatsapp || customer.phone;
        sendWhatsAppMessage(phone, message);
        return { success: true, isBusinessAPI: false };
      }
    },
  };
}

// Utility function to get WhatsApp message status
export async function getWhatsAppMessageStatus(
  businessId: string,
  customerId: string,
  limit: number = 10
) {
  try {
    const prisma = new PrismaClient();
    const whatsappService = await createWhatsAppService(businessId, prisma);

    if (!whatsappService) {
      return [];
    }

    const messages = await whatsappService.getCustomerMessages(
      customerId,
      limit
    );
    await prisma.$disconnect();

    return messages;
  } catch (error) {
    console.error("Error getting WhatsApp message status:", error);
    return [];
  }
}

// Utility function to check if WhatsApp Business API is available for business
export async function isWhatsAppBusinessAvailable(
  businessId: string
): Promise<boolean> {
  try {
    const prisma = new PrismaClient();
    const settings = await prisma.whatsAppSettings.findUnique({
      where: { businessId },
    });
    await prisma.$disconnect();

    return !!(
      settings?.isEnabled &&
      settings?.accessToken &&
      settings?.phoneNumberId
    );
  } catch (error) {
    console.error("Error checking WhatsApp Business availability:", error);
    return false;
  }
}
