import { NextRequest, NextResponse } from "next/server";

export interface WhatsAppApiSetupGuide {
  steps: {
    id: string;
    title: string;
    description: string;
    completed: boolean;
    optional?: boolean;
  }[];
  requirements: {
    id: string;
    name: string;
    description: string;
    fulfilled: boolean;
  }[];
  links: {
    documentation: string;
    facebookDevelopers: string;
    whatsappBusiness: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    const setupGuide: WhatsAppApiSetupGuide = {
      steps: [
        {
          id: "business-account",
          title: "WhatsApp Business Account Oluştur",
          description:
            "Meta Business hesabı oluşturun ve WhatsApp Business API'ye erişim sağlayın",
          completed: false,
        },
        {
          id: "phone-number",
          title: "Telefon Numarası Doğrulama",
          description:
            "İş telefon numaranızı doğrulayın ve WhatsApp Business ile bağlayın",
          completed: false,
        },
        {
          id: "webhook",
          title: "Webhook Kurulumu",
          description: "Mesaj alımı için webhook URL'ini yapılandırın",
          completed: false,
        },
        {
          id: "access-token",
          title: "Erişim Token'ı",
          description:
            "API erişimi için geçici veya kalıcı erişim token'ı alın",
          completed: false,
        },
        {
          id: "test-message",
          title: "Test Mesajı Gönder",
          description:
            "Kurulumun doğru çalıştığını test etmek için bir mesaj gönderin",
          completed: false,
        },
        {
          id: "template-approval",
          title: "Mesaj Şablonu Onayı",
          description: "İş mesajları için şablonları Meta'ya onaya gönderin",
          completed: false,
          optional: true,
        },
      ],
      requirements: [
        {
          id: "meta-business-account",
          name: "Meta Business Hesabı",
          description: "Aktif bir Meta Business hesabına sahip olmanız gerekir",
          fulfilled: false,
        },
        {
          id: "verified-business",
          name: "Doğrulanmış İşletme",
          description:
            "İşletmenizin Meta tarafından doğrulanmış olması gerekir",
          fulfilled: false,
        },
        {
          id: "phone-number-available",
          name: "Uygun Telefon Numarası",
          description: "WhatsApp'ta kayıtlı olmayan bir iş telefon numarası",
          fulfilled: false,
        },
        {
          id: "webhook-endpoint",
          name: "Webhook Endpoint",
          description: "HTTPS üzerinden erişilebilir webhook URL'i",
          fulfilled: false,
        },
      ],
      links: {
        documentation: "https://developers.facebook.com/docs/whatsapp",
        facebookDevelopers: "https://developers.facebook.com/",
        whatsappBusiness: "https://business.whatsapp.com/",
      },
    };

    return NextResponse.json(setupGuide);
  } catch (error) {
    console.error("Error fetching WhatsApp setup guide:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
