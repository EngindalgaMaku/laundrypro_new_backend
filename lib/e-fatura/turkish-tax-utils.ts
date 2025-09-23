/**
 * Turkish Tax Utilities
 * Handles Turkish tax calculations and validations for E-Fatura
 */

// Turkish VAT rates (KDV oranları)
export const TURKISH_VAT_RATES = {
  VAT_0: 0, // İstisna/Muafiyetler
  VAT_1: 1, // Temel gıda, ilaç, kitap vb.
  VAT_8: 8, // Belirli ürün grupları (kitap, gazete, dergi vb.)
  VAT_18: 18, // Standart oran
  VAT_20: 20, // Lüks ürünler (2024 sonrası bazı kategoriler)
} as const;

// Service categories and their typical VAT rates in Turkey
export const SERVICE_VAT_MAPPING = {
  CARPET_CLEANING: TURKISH_VAT_RATES.VAT_18,
  UPHOLSTERY_CLEANING: TURKISH_VAT_RATES.VAT_18,
  CURTAIN_CLEANING: TURKISH_VAT_RATES.VAT_18,
  LAUNDRY: TURKISH_VAT_RATES.VAT_18,
  DRY_CLEANING: TURKISH_VAT_RATES.VAT_18,
  IRONING: TURKISH_VAT_RATES.VAT_18,
  STAIN_REMOVAL: TURKISH_VAT_RATES.VAT_18,
  OTHER: TURKISH_VAT_RATES.VAT_18,
} as const;

// Turkish tax exemption codes
export const TAX_EXEMPTION_CODES = {
  "301": "KDV Kanunu madde 13/a-1",
  "302": "KDV Kanunu madde 13/a-2",
  "303": "KDV Kanunu madde 13/a-3",
  "350": "Diğer KDV istisnası",
  "351": "İhracat istisnası",
} as const;

// Turkish cities and districts mapping
export const TURKISH_PROVINCES = {
  "01": "Adana",
  "02": "Adıyaman",
  "03": "Afyonkarahisar",
  "04": "Ağrı",
  "05": "Amasya",
  "06": "Ankara",
  "07": "Antalya",
  "08": "Artvin",
  "09": "Aydın",
  "10": "Balıkesir",
  "11": "Bilecik",
  "12": "Bingöl",
  "13": "Bitlis",
  "14": "Bolu",
  "15": "Burdur",
  "16": "Bursa",
  "17": "Çanakkale",
  "18": "Çankırı",
  "19": "Çorum",
  "20": "Denizli",
  "21": "Diyarbakır",
  "22": "Edirne",
  "23": "Elazığ",
  "24": "Erzincan",
  "25": "Erzurum",
  "26": "Eskişehir",
  "27": "Gaziantep",
  "28": "Giresun",
  "29": "Gümüşhane",
  "30": "Hakkâri",
  "31": "Hatay",
  "32": "Isparta",
  "33": "Mersin",
  "34": "İstanbul",
  "35": "İzmir",
  "36": "Kars",
  "37": "Kastamonu",
  "38": "Kayseri",
  "39": "Kırklareli",
  "40": "Kırşehir",
  "41": "Kocaeli",
  "42": "Konya",
  "43": "Kütahya",
  "44": "Malatya",
  "45": "Manisa",
  "46": "Kahramanmaraş",
  "47": "Mardin",
  "48": "Muğla",
  "49": "Muş",
  "50": "Nevşehir",
  "51": "Niğde",
  "52": "Ordu",
  "53": "Rize",
  "54": "Sakarya",
  "55": "Samsun",
  "56": "Siirt",
  "57": "Sinop",
  "58": "Sivas",
  "59": "Tekirdağ",
  "60": "Tokat",
  "61": "Trabzon",
  "62": "Tunceli",
  "63": "Şanlıurfa",
  "64": "Uşak",
  "65": "Van",
  "66": "Yozgat",
  "67": "Zonguldak",
  "68": "Aksaray",
  "69": "Bayburt",
  "70": "Karaman",
  "71": "Kırıkkale",
  "72": "Batman",
  "73": "Şırnak",
  "74": "Bartın",
  "75": "Ardahan",
  "76": "Iğdır",
  "77": "Yalova",
  "78": "Karabük",
  "79": "Kilis",
  "80": "Osmaniye",
  "81": "Düzce",
} as const;

export interface TaxCalculationResult {
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  roundedVatAmount: number;
  roundedGrossAmount: number;
}

export interface TaxNumberValidationResult {
  isValid: boolean;
  type: "VKN" | "TCKN" | "INVALID";
  formatted: string;
  errors: string[];
}

/**
 * Calculate Turkish VAT for given amount and rate
 */
export function calculateTurkishVAT(
  netAmount: number,
  vatRate: number,
  precision: number = 2
): TaxCalculationResult {
  if (netAmount < 0) {
    throw new Error("Net amount cannot be negative");
  }

  if (vatRate < 0 || vatRate > 100) {
    throw new Error("VAT rate must be between 0 and 100");
  }

  const vatAmount = (netAmount * vatRate) / 100;
  const grossAmount = netAmount + vatAmount;

  // Turkish tax law requires rounding to 2 decimal places
  const roundedVatAmount =
    Math.round(vatAmount * Math.pow(10, precision)) / Math.pow(10, precision);
  const roundedGrossAmount =
    Math.round(grossAmount * Math.pow(10, precision)) / Math.pow(10, precision);

  return {
    netAmount:
      Math.round(netAmount * Math.pow(10, precision)) / Math.pow(10, precision),
    vatRate,
    vatAmount,
    grossAmount,
    roundedVatAmount,
    roundedGrossAmount,
  };
}

/**
 * Get appropriate VAT rate for service category
 */
export function getVATRateForService(serviceCategory: string): number {
  const category =
    serviceCategory.toUpperCase() as keyof typeof SERVICE_VAT_MAPPING;
  return SERVICE_VAT_MAPPING[category] || TURKISH_VAT_RATES.VAT_18;
}

/**
 * Validate Turkish Tax Number (VKN - Vergi Kimlik Numarası)
 */
export function validateVKN(vkn: string): boolean {
  // Remove all non-digit characters
  const cleaned = vkn.replace(/\D/g, "");

  // VKN must be exactly 10 digits
  if (cleaned.length !== 10) {
    return false;
  }

  // VKN cannot be all zeros
  if (cleaned === "0000000000") {
    return false;
  }

  const digits = cleaned.split("").map(Number);

  // Calculate check digit using VKN algorithm
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const temp = (digits[i] + (9 - i)) % 10;
    const multiplier = temp !== 9 ? temp : 9;
    sum += (multiplier * Math.pow(2, 9 - i)) % 9;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === digits[9];
}

/**
 * Validate Turkish Citizen Number (TCKN - TC Kimlik Numarası)
 */
export function validateTCKN(tckn: string): boolean {
  // Remove all non-digit characters
  const cleaned = tckn.replace(/\D/g, "");

  // TCKN must be exactly 11 digits
  if (cleaned.length !== 11) {
    return false;
  }

  // TCKN cannot be all zeros
  if (cleaned === "00000000000") {
    return false;
  }

  const digits = cleaned.split("").map(Number);

  // First digit cannot be 0
  if (digits[0] === 0) {
    return false;
  }

  // Calculate 10th digit
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = (oddSum * 7 - evenSum) % 10;

  if (check10 !== digits[9]) {
    return false;
  }

  // Calculate 11th digit
  const totalSum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
  const check11 = totalSum % 10;

  return check11 === digits[10];
}

/**
 * Comprehensive tax number validation
 */
export function validateTurkishTaxNumber(
  taxNumber: string
): TaxNumberValidationResult {
  const cleaned = taxNumber.replace(/\D/g, "");
  const errors: string[] = [];

  if (cleaned.length === 10) {
    const isValidVKN = validateVKN(cleaned);
    if (!isValidVKN) {
      errors.push("Geçersiz VKN format veya kontrol hanesi");
    }
    return {
      isValid: isValidVKN,
      type: "VKN",
      formatted: cleaned,
      errors,
    };
  } else if (cleaned.length === 11) {
    const isValidTCKN = validateTCKN(cleaned);
    if (!isValidTCKN) {
      errors.push("Geçersiz TCKN format veya kontrol hanesi");
    }
    return {
      isValid: isValidTCKN,
      type: "TCKN",
      formatted: cleaned,
      errors,
    };
  } else {
    errors.push(
      "Vergi numarası 10 haneli (VKN) veya 11 haneli (TCKN) olmalıdır"
    );
    return {
      isValid: false,
      type: "INVALID",
      formatted: cleaned,
      errors,
    };
  }
}

/**
 * Format Turkish tax number with appropriate separators
 */
export function formatTurkishTaxNumber(taxNumber: string): string {
  const validation = validateTurkishTaxNumber(taxNumber);

  if (!validation.isValid) {
    return taxNumber;
  }

  const cleaned = validation.formatted;

  if (validation.type === "VKN") {
    // Format VKN as XXX XXX XX XX
    return cleaned.replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, "$1 $2 $3 $4");
  } else if (validation.type === "TCKN") {
    // Format TCKN as XXX XXX XXX XX
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1 $2 $3 $4");
  }

  return cleaned;
}

/**
 * Validate Turkish postal code
 */
export function validateTurkishPostalCode(postalCode: string): boolean {
  const cleaned = postalCode.replace(/\D/g, "");

  // Turkish postal codes are 5 digits
  if (cleaned.length !== 5) {
    return false;
  }

  // First two digits represent the province code
  const provinceCode = cleaned.substring(0, 2);
  return Object.hasOwnProperty.call(TURKISH_PROVINCES, provinceCode);
}

/**
 * Get province name from postal code
 */
export function getProvinceFromPostalCode(postalCode: string): string | null {
  if (!validateTurkishPostalCode(postalCode)) {
    return null;
  }

  const cleaned = postalCode.replace(/\D/g, "");
  const provinceCode = cleaned.substring(0, 2);

  return (
    TURKISH_PROVINCES[provinceCode as keyof typeof TURKISH_PROVINCES] || null
  );
}

/**
 * Calculate service tax totals for an order
 */
export function calculateOrderTaxTotals(
  items: Array<{
    quantity: number;
    unitPrice: number;
    vatRate?: number;
    serviceCategory?: string;
  }>
): {
  subtotal: number;
  totalVat: number;
  total: number;
  vatBreakdown: Record<string, { amount: number; vatAmount: number }>;
} {
  let subtotal = 0;
  let totalVat = 0;
  const vatBreakdown: Record<string, { amount: number; vatAmount: number }> =
    {};

  items.forEach((item) => {
    const vatRate =
      item.vatRate || getVATRateForService(item.serviceCategory || "OTHER");
    const lineAmount = item.quantity * item.unitPrice;
    const taxCalc = calculateTurkishVAT(lineAmount, vatRate);

    subtotal += taxCalc.netAmount;
    totalVat += taxCalc.roundedVatAmount;

    const vatKey = `${vatRate}%`;
    if (!vatBreakdown[vatKey]) {
      vatBreakdown[vatKey] = { amount: 0, vatAmount: 0 };
    }
    vatBreakdown[vatKey].amount += taxCalc.netAmount;
    vatBreakdown[vatKey].vatAmount += taxCalc.roundedVatAmount;
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalVat: Math.round(totalVat * 100) / 100,
    total: Math.round((subtotal + totalVat) * 100) / 100,
    vatBreakdown,
  };
}

/**
 * Validate Turkish address components
 */
export function validateTurkishAddress(address: {
  street?: string;
  district?: string;
  city?: string;
  postalCode?: string;
}): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!address.street || address.street.trim().length < 5) {
    errors.push("Sokak adresi en az 5 karakter olmalıdır");
  }

  if (!address.district || address.district.trim().length < 2) {
    errors.push("İlçe bilgisi gereklidir");
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push("Şehir bilgisi gereklidir");
  }

  if (address.postalCode && !validateTurkishPostalCode(address.postalCode)) {
    errors.push("Geçersiz posta kodu formatı");
  }

  // Check if city matches postal code if both provided
  if (address.postalCode && address.city) {
    const provinceFromPostal = getProvinceFromPostalCode(address.postalCode);
    if (
      provinceFromPostal &&
      provinceFromPostal.toLowerCase() !== address.city.toLowerCase()
    ) {
      errors.push("Posta kodu ile şehir bilgisi uyuşmuyor");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate invoice series based on business settings
 */
export function generateInvoiceNumber(
  prefix: string = "EMU",
  currentNumber: number = 1,
  length: number = 8
): string {
  const paddedNumber = currentNumber.toString().padStart(length, "0");
  return `${prefix}${paddedNumber}`;
}

/**
 * Check if VAT rate is valid for Turkish tax system
 */
export function isValidTurkishVATRate(rate: number): boolean {
  const validRates = Object.values(TURKISH_VAT_RATES) as number[];
  return validRates.includes(rate);
}

/**
 * Get tax exemption reason description
 */
export function getTaxExemptionDescription(code: string): string {
  return (
    TAX_EXEMPTION_CODES[code as keyof typeof TAX_EXEMPTION_CODES] ||
    "Bilinmeyen istisna kodu"
  );
}

/**
 * Format currency amount in Turkish Lira
 */
export function formatTurkishCurrency(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

/**
 * Calculate late payment interest (gecikme faizi) - Turkish commercial law
 */
export function calculateLatePaymentInterest(
  amount: number,
  daysPastDue: number,
  annualRate: number = 12 // Default 12% annual rate as per Turkish Commercial Code
): number {
  if (daysPastDue <= 0) return 0;

  const dailyRate = annualRate / 365 / 100;
  const interest = amount * dailyRate * daysPastDue;

  return Math.round(interest * 100) / 100;
}
