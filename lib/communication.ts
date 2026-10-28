// Customer communication utilities. Imported by client components, so nothing here may pull
// in Prisma or other server-only code; the WhatsApp Business API helpers are in lib/whatsapp-business.ts

/**
  * Normalizes a phone number for WhatsApp (wa.me) links and WhatsApp Business API.
  * Converts Turkish formats (e.g. "0532 123 45 67", "532 123 45 67", "+90 532...")
  * into international format without "+" or leading zeros: "905321234567".
  */
export function normalizePhoneForWhatsApp(phoneNumber: string): string {
  let digits = (phoneNumber || "").replace(/\D/g, "");
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `90${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("5")) {
    return `90${digits}`;
  }
  return digits;
}

/**
  * Normalizes a phone number for tel: and sms: links (e.g. "+905321234567").
  */
export function normalizePhoneForCall(phoneNumber: string): string {
  const waPhone = normalizePhoneForWhatsApp(phoneNumber);
  if (!waPhone) return "";
  return `+${waPhone}`;
}

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
  const cleanPhone = normalizePhoneForCall(phoneNumber);
  if (!cleanPhone) return;
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
  const cleanPhone = normalizePhoneForWhatsApp(phoneNumber);
  if (!cleanPhone) return;
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

// SMS functionality (opens native SMS app on Android / iOS)
export function sendSMS(phoneNumber: string, message?: string) {
  const cleanPhone = normalizePhoneForCall(phoneNumber);
  if (!cleanPhone) return;
  let smsUrl = `sms:${cleanPhone}`;

  if (message) {
    smsUrl += `?body=${encodeURIComponent(message)}`;
  }

  if (typeof window !== "undefined") {
    window.location.href = smsUrl;
  }

  logCommunication({
    customerId: "",
    type: "SMS",
    direction: "OUTGOING",
    phone: cleanPhone,
    content: message,
  });
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

// Google Maps location viewer (intercepted by Android to open native Maps app)
export function openGoogleMapsLocation(options: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}) {
  if (typeof window === "undefined") return;
  const { latitude, longitude, address } = options;
  if (typeof latitude === "number" && typeof longitude === "number") {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      "_blank"
    );
  } else if (address && address.trim()) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        address.trim()
      )}`,
      "_blank"
    );
  }
}

// Google Maps turn-by-turn directions
export function openGoogleMapsDirections(options: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}) {
  if (typeof window === "undefined") return;
  const { latitude, longitude, address } = options;
  if (typeof latitude === "number" && typeof longitude === "number") {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
      "_blank"
    );
  } else if (address && address.trim()) {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        address.trim()
      )}`,
      "_blank"
    );
  }
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
  console.log("Communication logged:", log);
}
