import axios, { AxiosInstance, AxiosResponse } from "axios";
import RateLimiterMemory from "rate-limiter-flexible/lib/RateLimiterMemory";
import { PrismaClient } from "@prisma/client";

// WhatsApp Business API interfaces
export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  baseUrl?: string;
}

export interface WhatsAppTextMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "text";
  text: {
    body: string;
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text?: {
            body: string;
          };
          type: string;
        }>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WhatsAppBusinessService {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiterMemory;
  private config: WhatsAppConfig;
  private prisma: PrismaClient;

  constructor(config: WhatsAppConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;

    // Initialize axios instance
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl || "https://graph.facebook.com/v17.0",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    // Initialize rate limiter (100 requests per second as per WhatsApp limits)
    this.rateLimiter = new RateLimiterMemory({
      keyPrefix: "whatsapp_api",
      points: 80, // Conservative limit
      duration: 1, // Per second
    });

    // Setup request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      try {
        await this.rateLimiter.consume("api_call");
        return config;
      } catch (rateLimiterRes: any) {
        throw new Error(
          `Rate limit exceeded. Retry after ${Math.round(
            rateLimiterRes.msBeforeNext || 1000
          )} ms`
        );
      }
    });
  }

  /**
   * Send a text message via WhatsApp Business API
   */
  async sendTextMessage(
    to: string,
    message: string,
    customerId?: string,
    orderId?: string,
    businessId?: string
  ): Promise<{ messageId: string; success: boolean; error?: string }> {
    try {
      const payload: WhatsAppTextMessage = {
        messaging_product: "whatsapp",
        to: this.formatPhoneNumber(to),
        type: "text",
        text: {
          body: message,
        },
      };

      const response: AxiosResponse<WhatsAppMessageResponse> =
        await this.axiosInstance.post(
          `/${this.config.phoneNumberId}/messages`,
          payload
        );

      const messageId = response.data.messages[0].id;
      const waId = response.data.contacts[0].wa_id;

      // Log message to database
      if (businessId) {
        await this.logMessage({
          businessId,
          customerId,
          orderId,
          messageId,
          waId,
          direction: "OUTGOING",
          type: "text",
          content: message,
          status: "sent",
        });
      }

      return { messageId, success: true };
    } catch (error: any) {
      const errorMessage = this.extractErrorMessage(error);

      // Log failed message
      if (businessId) {
        await this.logMessage({
          businessId,
          customerId,
          orderId,
          waId: to,
          direction: "OUTGOING",
          type: "text",
          content: message,
          status: "failed",
          errorMessage,
        });
      }

      return { messageId: "", success: false, error: errorMessage };
    }
  }

  /**
   * Send a template message via WhatsApp Business API
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "tr",
    parameters: Array<{ type: string; text: string }> = [],
    customerId?: string,
    orderId?: string,
    businessId?: string
  ): Promise<{ messageId: string; success: boolean; error?: string }> {
    try {
      const payload: WhatsAppTemplateMessage = {
        messaging_product: "whatsapp",
        to: this.formatPhoneNumber(to),
        type: "template",
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      // Add parameters if provided
      if (parameters.length > 0) {
        payload.template.components = [
          {
            type: "body",
            parameters,
          },
        ];
      }

      const response: AxiosResponse<WhatsAppMessageResponse> =
        await this.axiosInstance.post(
          `/${this.config.phoneNumberId}/messages`,
          payload
        );

      const messageId = response.data.messages[0].id;
      const waId = response.data.contacts[0].wa_id;

      // Log message to database
      if (businessId) {
        await this.logMessage({
          businessId,
          customerId,
          orderId,
          messageId,
          waId,
          direction: "OUTGOING",
          type: "template",
          templateName,
          templateData: JSON.stringify({ parameters }),
          status: "sent",
        });
      }

      return { messageId, success: true };
    } catch (error: any) {
      const errorMessage = this.extractErrorMessage(error);

      // Log failed message
      if (businessId) {
        await this.logMessage({
          businessId,
          customerId,
          orderId,
          waId: to,
          direction: "OUTGOING",
          type: "template",
          templateName,
          templateData: JSON.stringify({ parameters }),
          status: "failed",
          errorMessage,
        });
      }

      return { messageId: "", success: false, error: errorMessage };
    }
  }

  /**
   * Get available message templates
   */
  async getMessageTemplates(): Promise<any[]> {
    try {
      const response = await this.axiosInstance.get(
        `/${this.config.businessAccountId}/message_templates`
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching templates:", error);
      return [];
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    appSecret: string
  ): boolean {
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${expectedSignature}`)
    );
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    payload: WhatsAppWebhookPayload,
    businessId: string
  ): Promise<void> {
    try {
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          const { value } = change;

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              await this.processIncomingMessage(
                message,
                value.metadata,
                businessId
              );
            }
          }

          // Process message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await this.processMessageStatus(status, businessId);
            }
          }
        }
      }

      // Log webhook processing
      await this.prisma.whatsAppWebhook.create({
        data: {
          event: "webhook_processed",
          payload: JSON.stringify(payload),
          processed: true,
        },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);

      // Log failed webhook
      await this.prisma.whatsAppWebhook.create({
        data: {
          event: "webhook_failed",
          payload: JSON.stringify(payload),
          processed: false,
        },
      });
    }
  }

  /**
   * Process incoming message
   */
  private async processIncomingMessage(
    message: any,
    metadata: any,
    businessId: string
  ): Promise<void> {
    try {
      // Find customer by WhatsApp ID
      const customer = await this.prisma.customer.findFirst({
        where: {
          businessId,
          OR: [{ whatsapp: message.from }, { phone: message.from }],
        },
      });

      // Log incoming message
      await this.logMessage({
        businessId,
        customerId: customer?.id,
        messageId: message.id,
        waId: message.from,
        direction: "INCOMING",
        type: message.type,
        content: message.text?.body,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        status: "received",
      });

      // If customer not found, create a new prospect
      if (!customer && message.text?.body) {
        await this.handleNewProspect(
          message.from,
          message.text.body,
          businessId
        );
      }
    } catch (error) {
      console.error("Error processing incoming message:", error);
    }
  }

  /**
   * Process message status updates
   */
  private async processMessageStatus(
    status: any,
    businessId: string
  ): Promise<void> {
    try {
      await this.prisma.whatsAppMessage.updateMany({
        where: {
          businessId,
          messageId: status.id,
        },
        data: {
          status: status.status,
          timestamp: new Date(parseInt(status.timestamp) * 1000),
          ...(status.errors && {
            errorCode: status.errors[0]?.code?.toString(),
            errorMessage: status.errors[0]?.message,
          }),
        },
      });
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  }

  /**
   * Handle new prospect from incoming message
   */
  private async handleNewProspect(
    waId: string,
    message: string,
    businessId: string
  ): Promise<void> {
    // This is where you can implement logic to handle new prospects
    // For now, just log it
    console.log(`New WhatsApp prospect: ${waId} - ${message}`);
  }

  /**
   * Log message to database
   */
  private async logMessage(data: {
    businessId: string;
    customerId?: string;
    orderId?: string;
    messageId?: string;
    waId: string;
    direction: "INCOMING" | "OUTGOING";
    type: string;
    content?: string;
    templateName?: string;
    templateData?: string;
    status: string;
    timestamp?: Date;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.prisma.whatsAppMessage.create({
        data: {
          businessId: data.businessId,
          customerId: data.customerId,
          orderId: data.orderId,
          messageId: data.messageId,
          waId: data.waId,
          direction: data.direction,
          type: data.type,
          status: data.status,
          content: data.content,
          templateName: data.templateName,
          templateData: data.templateData,
          timestamp: data.timestamp,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage,
        },
      });
    } catch (error) {
      console.error("Error logging WhatsApp message:", error);
    }
  }

  /**
   * Format phone number for WhatsApp API
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // If starts with 0 and is Turkish number, replace with 90
    if (cleaned.startsWith("0") && cleaned.length === 11) {
      cleaned = "90" + cleaned.substring(1);
    }

    // If doesn't start with country code, assume Turkish
    if (cleaned.length === 10) {
      cleaned = "90" + cleaned;
    }

    return cleaned;
  }

  /**
   * Extract error message from API response
   */
  private extractErrorMessage(error: any): string {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    if (error.response?.data?.error?.error_user_msg) {
      return error.response.data.error.error_user_msg;
    }
    if (error.message) {
      return error.message;
    }
    return "Unknown WhatsApp API error";
  }

  /**
   * Get business WhatsApp settings
   */
  async getBusinessSettings(businessId: string) {
    return await this.prisma.whatsAppSettings.findUnique({
      where: { businessId },
    });
  }

  /**
   * Update business WhatsApp settings
   */
  async updateBusinessSettings(
    businessId: string,
    settings: {
      isEnabled?: boolean;
      accessToken?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
      webhookToken?: string;
      displayPhoneNumber?: string;
      qualityRating?: string;
      rateLimitHit?: boolean;
    }
  ) {
    return await this.prisma.whatsAppSettings.upsert({
      where: { businessId },
      update: {
        ...settings,
        updatedAt: new Date(),
        lastSync: new Date(),
      },
      create: {
        businessId,
        ...settings,
      },
    });
  }

  /**
   * Get message history for a customer
   */
  async getCustomerMessages(customerId: string, limit: number = 50) {
    return await this.prisma.whatsAppMessage.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            whatsapp: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Get all business templates
   */
  async getBusinessTemplates(businessId: string) {
    return await this.prisma.whatsAppTemplate.findMany({
      where: {
        businessId,
        isActive: true,
      },
      orderBy: { displayName: "asc" },
    });
  }
}

/**
 * Create WhatsApp service instance
 */
export function createWhatsAppService(
  businessId: string,
  prisma: PrismaClient
): Promise<WhatsAppBusinessService | null> {
  return new Promise(async (resolve) => {
    try {
      const settings = await prisma.whatsAppSettings.findUnique({
        where: { businessId },
      });

      if (
        !settings ||
        !settings.isEnabled ||
        !settings.accessToken ||
        !settings.phoneNumberId
      ) {
        resolve(null);
        return;
      }

      const config: WhatsAppConfig = {
        accessToken: settings.accessToken,
        phoneNumberId: settings.phoneNumberId,
        businessAccountId: settings.businessAccountId || "",
      };

      const service = new WhatsAppBusinessService(config, prisma);
      resolve(service);
    } catch (error) {
      console.error("Error creating WhatsApp service:", error);
      resolve(null);
    }
  });
}
