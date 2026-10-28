// WhatsApp Business API helpers (server only)
import { prisma } from "./db";
import { createWhatsAppService } from "./whatsapp-service";
import {
  communicationTemplates,
  makePhoneCall,
  normalizePhoneForWhatsApp,
  sendEmail,
  sendWhatsAppMessage,
  type Customer,
  type WhatsAppBusinessMessage,
} from "./communication";

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

    const whatsappService = await createWhatsAppService(
      customer.businessId,
      prisma
    );

    if (!whatsappService) {
      // Fallback to web WhatsApp
      sendWhatsAppMessage(customer.whatsapp || customer.phone, message);
      return { success: true, isBusinessAPI: false };
    }

    const phoneNumber = normalizePhoneForWhatsApp(
      customer.whatsapp || customer.phone
    );

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

// Utility function to get WhatsApp message status
export async function getWhatsAppMessageStatus(
  businessId: string,
  customerId: string,
  limit: number = 10
) {
  try {
    const whatsappService = await createWhatsAppService(businessId, prisma);

    if (!whatsappService) {
      return [];
    }

    const messages = await whatsappService.getCustomerMessages(
      customerId,
      limit
    );

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
    const settings = await prisma.whatsAppSettings.findUnique({
      where: { businessId },
    });

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
