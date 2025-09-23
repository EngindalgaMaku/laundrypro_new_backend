import { PrismaClient } from "@prisma/client";

export interface WhatsAppTemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO";
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

export interface WhatsAppTemplateStructure {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: WhatsAppTemplateComponent[];
}

// Predefined templates for laundry businesses
export const PREDEFINED_TEMPLATES: Record<string, WhatsAppTemplateStructure> = {
  order_confirmation: {
    name: "order_confirmation",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişiniz onaylandı. Toplam tutar: {{3}} TL. Teşekkürler!",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001", "250"]],
        },
      },
    ],
  },
  order_ready: {
    name: "order_ready",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişiniz hazır! Teslim almak için mağazamıza gelebilirsiniz. Teşekkürler!",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001"]],
        },
      },
    ],
  },
  order_pickup: {
    name: "order_pickup",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişinizi {{3}} saatinde almaya geleceğiz. Teşekkürler!",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001", "14:00"]],
        },
      },
    ],
  },
  order_delivery: {
    name: "order_delivery",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişiniz {{3}} saatinde teslim edilecek. Teşekkürler!",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001", "16:00"]],
        },
      },
    ],
  },
  order_status_update: {
    name: "order_status_update",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişinizin durumu: {{3}}. Bilgilendirme için teşekkürler!",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001", "Yıkama aşamasında"]],
        },
      },
    ],
  },
  payment_received: {
    name: "payment_received",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişiniz için {{3}} TL ödemeniz alınmıştır. Teşekkürler!",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001", "250"]],
        },
      },
    ],
  },
  customer_welcome: {
    name: "customer_welcome",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}}'e hoş geldiniz! Size nasıl yardımcı olabiliriz?",
        example: {
          body_text: [["Mehmet Yılmaz", "Temizlik Plus"]],
        },
      },
    ],
  },
  appointment_reminder: {
    name: "appointment_reminder",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, yarın {{2}} saatinde {{3}} için randevunuz bulunmaktadır. Lütfen hazır olunuz.",
        example: {
          body_text: [["Mehmet Yılmaz", "10:00", "halı teslim alma"]],
        },
      },
    ],
  },
  promotion_message: {
    name: "promotion_message",
    language: "tr",
    category: "MARKETING",
    components: [
      {
        type: "HEADER",
        format: "TEXT",
        text: "🎉 Özel Kampanya!",
      },
      {
        type: "BODY",
        text: "Merhaba {{1}}, bu ay özel kampanyamızdan faydalanın! {{2}} hizmetinde %{{3}} indirim. Son tarih: {{4}}",
        example: {
          body_text: [["Mehmet Yılmaz", "Halı yıkama", "20", "31 Aralık"]],
        },
      },
      {
        type: "FOOTER",
        text: "Detaylar için mağazamızı arayın.",
      },
    ],
  },
  feedback_request: {
    name: "feedback_request",
    language: "tr",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Merhaba {{1}}, {{2}} numaralı siparişiniz tamamlandı. Hizmetimizi değerlendirmek için bize geri bildirim verebilir misiniz?",
        example: {
          body_text: [["Mehmet Yılmaz", "SIP001"]],
        },
      },
      {
        type: "BUTTONS",
        buttons: [
          {
            type: "QUICK_REPLY",
            text: "⭐⭐⭐⭐⭐ Mükemmel",
          },
          {
            type: "QUICK_REPLY",
            text: "⭐⭐⭐⭐ İyi",
          },
          {
            type: "QUICK_REPLY",
            text: "⭐⭐⭐ Orta",
          },
        ],
      },
    ],
  },
};

export class WhatsAppTemplateManager {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize predefined templates for a business
   */
  async initializePredefinedTemplates(businessId: string): Promise<void> {
    try {
      for (const [key, template] of Object.entries(PREDEFINED_TEMPLATES)) {
        await this.prisma.whatsAppTemplate.upsert({
          where: {
            businessId_name: {
              businessId,
              name: template.name,
            },
          },
          update: {
            components: JSON.stringify(template.components),
            category: template.category,
            language: template.language,
            updatedAt: new Date(),
          },
          create: {
            businessId,
            name: template.name,
            displayName: this.generateDisplayName(template.name),
            category: template.category,
            language: template.language,
            components: JSON.stringify(template.components),
            status: "pending",
          },
        });
      }
    } catch (error) {
      console.error("Error initializing predefined templates:", error);
      throw error;
    }
  }

  /**
   * Create a custom template
   */
  async createTemplate(
    businessId: string,
    templateData: {
      name: string;
      displayName: string;
      category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
      language?: string;
      components: WhatsAppTemplateComponent[];
      variables?: Record<string, string>;
    }
  ) {
    try {
      return await this.prisma.whatsAppTemplate.create({
        data: {
          businessId,
          name: templateData.name,
          displayName: templateData.displayName,
          category: templateData.category,
          language: templateData.language || "tr",
          components: JSON.stringify(templateData.components),
          variables: templateData.variables
            ? JSON.stringify(templateData.variables)
            : null,
          status: "pending",
        },
      });
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  }

  /**
   * Get all templates for a business
   */
  async getBusinessTemplates(
    businessId: string,
    includeInactive: boolean = false
  ) {
    try {
      return await this.prisma.whatsAppTemplate.findMany({
        where: {
          businessId,
          ...(includeInactive ? {} : { isActive: true }),
        },
        orderBy: { displayName: "asc" },
      });
    } catch (error) {
      console.error("Error getting business templates:", error);
      throw error;
    }
  }

  /**
   * Update template status
   */
  async updateTemplateStatus(
    businessId: string,
    templateName: string,
    status: "pending" | "approved" | "rejected"
  ) {
    try {
      return await this.prisma.whatsAppTemplate.update({
        where: {
          businessId_name: {
            businessId,
            name: templateName,
          },
        },
        data: {
          status,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Error updating template status:", error);
      throw error;
    }
  }

  /**
   * Parse template variables from components
   */
  extractTemplateVariables(components: WhatsAppTemplateComponent[]): string[] {
    const variables: string[] = [];

    components.forEach((component) => {
      if (component.text) {
        const matches = component.text.match(/\{\{(\d+)\}\}/g);
        if (matches) {
          matches.forEach((match) => {
            const variable = match.replace(/[{}]/g, "");
            if (!variables.includes(variable)) {
              variables.push(variable);
            }
          });
        }
      }
    });

    return variables.sort((a, b) => parseInt(a) - parseInt(b));
  }

  /**
   * Validate template structure
   */
  validateTemplate(template: WhatsAppTemplateStructure): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!template.name) errors.push("Template name is required");
    if (!template.category) errors.push("Template category is required");
    if (!template.components || template.components.length === 0) {
      errors.push("Template must have at least one component");
    }

    // Validate components
    let hasBody = false;
    template.components?.forEach((component, index) => {
      if (component.type === "BODY") {
        hasBody = true;
        if (!component.text) {
          errors.push(`Body component at index ${index} must have text`);
        }
      }

      if (component.type === "HEADER" && component.format && !component.text) {
        errors.push(
          `Header component at index ${index} with format must have text`
        );
      }

      if (component.type === "BUTTONS") {
        if (!component.buttons || component.buttons.length === 0) {
          errors.push(`Button component at index ${index} must have buttons`);
        } else if (component.buttons.length > 10) {
          errors.push(
            `Button component at index ${index} cannot have more than 10 buttons`
          );
        }
      }
    });

    if (!hasBody) errors.push("Template must have a BODY component");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate display name from template name
   */
  private generateDisplayName(templateName: string): string {
    return templateName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Get template usage statistics
   */
  async getTemplateStats(businessId: string, days: number = 30) {
    try {
      const stats = await this.prisma.whatsAppMessage.groupBy({
        by: ["templateName"],
        where: {
          businessId,
          templateName: { not: null },
          createdAt: {
            gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
      });

      return stats;
    } catch (error) {
      console.error("Error getting template stats:", error);
      return [];
    }
  }
}

/**
 * Create template manager instance
 */
export function createTemplateManager(
  prisma: PrismaClient
): WhatsAppTemplateManager {
  return new WhatsAppTemplateManager(prisma);
}
