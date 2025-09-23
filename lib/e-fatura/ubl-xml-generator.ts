/**
 * UBL XML Generator for GIB E-Fatura
 * Generates UBL 2.1 compliant XML for Turkish e-invoices
 */

import { create } from "xmlbuilder2";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

// Turkish VAT rates
export const TURKISH_VAT_RATES = {
  VAT_0: 0,
  VAT_1: 1,
  VAT_8: 8,
  VAT_18: 18,
} as const;

// UBL Unit Codes (UN/ECE Recommendation 20)
export const UBL_UNIT_CODES = {
  C62: "C62", // Adet (Piece)
  KGM: "KGM", // Kilogram
  MTR: "MTR", // Metre
  MTK: "MTK", // Metrekare
  HUR: "HUR", // Saat (Hour)
  DAY: "DAY", // Gün
  MON: "MON", // Ay
  LTR: "LTR", // Litre
} as const;

// Invoice Types
export const INVOICE_TYPES = {
  SATIS: "SATIS",
  IADE: "IADE",
  TEVKIFAT: "TEVKIFAT",
  ISTISNA: "ISTISNA",
} as const;

export interface EInvoiceData {
  // Invoice Header
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceTime: Date;
  invoiceType: keyof typeof INVOICE_TYPES;
  currencyCode: string;

  // Supplier (Company) Information
  supplier: {
    vkn: string;
    title: string;
    address: string;
    district: string;
    city: string;
    country: string;
    postalCode?: string;
    email?: string;
    phone?: string;
    website?: string;
  };

  // Customer Information
  customer: {
    vknTckn: string;
    title: string;
    name?: string;
    surname?: string;
    address: string;
    district: string;
    city: string;
    country: string;
    email?: string;
    phone?: string;
  };

  // Invoice Lines
  invoiceLines: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitCode: keyof typeof UBL_UNIT_CODES;
    unitPrice: number;
    lineAmount: number;
    vatRate: number;
    vatAmount: number;
    discountAmount?: number;
    lineTotal: number;
  }>;

  // Invoice Totals
  subtotalAmount: number;
  totalVatAmount: number;
  totalAmount: number;
  payableAmount: number;
}

export class UBLXMLGenerator {
  private static readonly UBL_VERSION = "2.1";
  private static readonly NAMESPACE_URI =
    "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
  private static readonly CAC_URI =
    "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2";
  private static readonly CBC_URI =
    "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2";
  private static readonly UDT_URI =
    "urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2";

  /**
   * Generate UBL XML for e-invoice
   */
  static generateInvoiceXML(data: EInvoiceData): string {
    const invoiceUUID = uuidv4();
    const ettn = this.generateETTN();

    const doc = create({
      encoding: "UTF-8",
      standalone: true,
    });

    const invoice = doc.ele("Invoice", {
      xmlns: this.NAMESPACE_URI,
      "xmlns:cac": this.CAC_URI,
      "xmlns:cbc": this.CBC_URI,
      "xmlns:udt": this.UDT_URI,
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      "xsi:schemaLocation": `${this.NAMESPACE_URI} UBL-Invoice-2.1.xsd`,
    });

    // UBL Version
    invoice.ele("cbc:UBLVersionID").txt(this.UBL_VERSION);

    // Customization ID
    invoice.ele("cbc:CustomizationID").txt("TR1.2");

    // Profile ID
    invoice.ele("cbc:ProfileID").txt("TICARIFATURA");

    // Invoice ID
    invoice.ele("cbc:ID").txt(data.invoiceNumber);

    // Copy Indicator
    invoice.ele("cbc:CopyIndicator").txt("false");

    // UUID
    invoice.ele("cbc:UUID").txt(invoiceUUID);

    // Issue Date
    invoice.ele("cbc:IssueDate").txt(format(data.invoiceDate, "yyyy-MM-dd"));

    // Issue Time
    invoice.ele("cbc:IssueTime").txt(format(data.invoiceTime, "HH:mm:ss"));

    // Invoice Type Code
    invoice.ele("cbc:InvoiceTypeCode").txt("SATIS");

    // Note
    invoice.ele("cbc:Note").txt("Laundry Pro ile oluşturulmuştur");

    // Document Currency Code
    invoice.ele("cbc:DocumentCurrencyCode").txt(data.currencyCode);

    // Line Count Numeric
    invoice
      .ele("cbc:LineCountNumeric")
      .txt(data.invoiceLines.length.toString());

    // Additional Document Reference (ETTN)
    const additionalDocRef = invoice.ele("cac:AdditionalDocumentReference");
    additionalDocRef.ele("cbc:ID").txt(ettn);
    additionalDocRef
      .ele("cbc:IssueDate")
      .txt(format(data.invoiceDate, "yyyy-MM-dd"));
    additionalDocRef.ele("cbc:DocumentType").txt("ETTN");

    // Supplier Party
    this.addSupplierParty(invoice, data.supplier);

    // Customer Party
    this.addCustomerParty(invoice, data.customer);

    // Tax Total
    this.addTaxTotal(invoice, data);

    // Legal Monetary Total
    this.addLegalMonetaryTotal(invoice, data);

    // Invoice Lines
    data.invoiceLines.forEach((line, index) => {
      this.addInvoiceLine(invoice, line, index + 1);
    });

    return doc.end({ prettyPrint: true });
  }

  /**
   * Add Supplier Party (Company) to XML
   */
  private static addSupplierParty(
    invoice: any,
    supplier: EInvoiceData["supplier"]
  ): void {
    const accountingSupplierParty = invoice.ele("cac:AccountingSupplierParty");
    const party = accountingSupplierParty.ele("cac:Party");

    // Party Identification (VKN)
    const partyId = party.ele("cac:PartyIdentification");
    partyId.ele("cbc:ID", { schemeID: "VKN" }).txt(supplier.vkn);

    // Party Name
    const partyName = party.ele("cac:PartyName");
    partyName.ele("cbc:Name").txt(supplier.title);

    // Postal Address
    const postalAddress = party.ele("cac:PostalAddress");
    postalAddress.ele("cbc:StreetName").txt(supplier.address);
    postalAddress.ele("cbc:CitySubdivisionName").txt(supplier.district);
    postalAddress.ele("cbc:CityName").txt(supplier.city);
    if (supplier.postalCode) {
      postalAddress.ele("cbc:PostalZone").txt(supplier.postalCode);
    }

    const country = postalAddress.ele("cac:Country");
    country.ele("cbc:Name").txt(supplier.country);

    // Party Tax Scheme
    const partyTaxScheme = party.ele("cac:PartyTaxScheme");
    partyTaxScheme.ele("cbc:TaxLevelCode").txt("0015");

    const taxScheme = partyTaxScheme.ele("cac:TaxScheme");
    taxScheme.ele("cbc:Name").txt("Gelir Vergisi");

    // Contact (if available)
    if (supplier.phone || supplier.email) {
      const contact = party.ele("cac:Contact");
      if (supplier.phone) {
        contact.ele("cbc:Telephone").txt(supplier.phone);
      }
      if (supplier.email) {
        contact.ele("cbc:ElectronicMail").txt(supplier.email);
      }
    }
  }

  /**
   * Add Customer Party to XML
   */
  private static addCustomerParty(
    invoice: any,
    customer: EInvoiceData["customer"]
  ): void {
    const accountingCustomerParty = invoice.ele("cac:AccountingCustomerParty");
    const party = accountingCustomerParty.ele("cac:Party");

    // Party Identification (VKN/TCKN)
    const partyId = party.ele("cac:PartyIdentification");
    const schemeId = customer.vknTckn.length === 10 ? "VKN" : "TCKN";
    partyId.ele("cbc:ID", { schemeID: schemeId }).txt(customer.vknTckn);

    // Party Name
    const partyName = party.ele("cac:PartyName");
    if (customer.name && customer.surname) {
      partyName.ele("cbc:Name").txt(`${customer.name} ${customer.surname}`);
    } else {
      partyName.ele("cbc:Name").txt(customer.title);
    }

    // Postal Address
    const postalAddress = party.ele("cac:PostalAddress");
    postalAddress.ele("cbc:StreetName").txt(customer.address);
    postalAddress.ele("cbc:CitySubdivisionName").txt(customer.district);
    postalAddress.ele("cbc:CityName").txt(customer.city);

    const country = postalAddress.ele("cac:Country");
    country.ele("cbc:Name").txt(customer.country);

    // Contact (if available)
    if (customer.phone || customer.email) {
      const contact = party.ele("cac:Contact");
      if (customer.phone) {
        contact.ele("cbc:Telephone").txt(customer.phone);
      }
      if (customer.email) {
        contact.ele("cbc:ElectronicMail").txt(customer.email);
      }
    }
  }

  /**
   * Add Tax Total to XML
   */
  private static addTaxTotal(invoice: any, data: EInvoiceData): void {
    const taxTotal = invoice.ele("cac:TaxTotal");
    taxTotal
      .ele("cbc:TaxAmount", { currencyID: data.currencyCode })
      .txt(data.totalVatAmount.toFixed(2));

    // Group VAT by rate
    const vatGroups = this.groupVatByRate(data.invoiceLines);

    vatGroups.forEach((group) => {
      const taxSubtotal = taxTotal.ele("cac:TaxSubtotal");
      taxSubtotal
        .ele("cbc:TaxableAmount", { currencyID: data.currencyCode })
        .txt(group.taxableAmount.toFixed(2));
      taxSubtotal
        .ele("cbc:TaxAmount", { currencyID: data.currencyCode })
        .txt(group.taxAmount.toFixed(2));

      const taxCategory = taxSubtotal.ele("cac:TaxCategory");
      taxCategory.ele("cbc:Percent").txt(group.vatRate.toFixed(2));

      const taxScheme = taxCategory.ele("cac:TaxScheme");
      taxScheme.ele("cbc:Name").txt("KDV");
      taxScheme.ele("cbc:TaxTypeCode").txt("0015");
    });
  }

  /**
   * Add Legal Monetary Total to XML
   */
  private static addLegalMonetaryTotal(invoice: any, data: EInvoiceData): void {
    const legalMonetaryTotal = invoice.ele("cac:LegalMonetaryTotal");

    legalMonetaryTotal
      .ele("cbc:LineExtensionAmount", { currencyID: data.currencyCode })
      .txt(data.subtotalAmount.toFixed(2));
    legalMonetaryTotal
      .ele("cbc:TaxExclusiveAmount", { currencyID: data.currencyCode })
      .txt(data.subtotalAmount.toFixed(2));
    legalMonetaryTotal
      .ele("cbc:TaxInclusiveAmount", { currencyID: data.currencyCode })
      .txt(data.totalAmount.toFixed(2));
    legalMonetaryTotal
      .ele("cbc:PayableAmount", { currencyID: data.currencyCode })
      .txt(data.payableAmount.toFixed(2));
  }

  /**
   * Add Invoice Line to XML
   */
  private static addInvoiceLine(
    invoice: any,
    line: EInvoiceData["invoiceLines"][0],
    lineNumber: number
  ): void {
    const invoiceLine = invoice.ele("cac:InvoiceLine");

    invoiceLine.ele("cbc:ID").txt(lineNumber.toString());
    invoiceLine
      .ele("cbc:InvoicedQuantity", { unitCode: line.unitCode })
      .txt(line.quantity.toFixed(3));
    invoiceLine
      .ele("cbc:LineExtensionAmount", { currencyID: "TRY" })
      .txt(line.lineAmount.toFixed(2));

    // Tax Total for line
    const taxTotal = invoiceLine.ele("cac:TaxTotal");
    taxTotal
      .ele("cbc:TaxAmount", { currencyID: "TRY" })
      .txt(line.vatAmount.toFixed(2));

    const taxSubtotal = taxTotal.ele("cac:TaxSubtotal");
    taxSubtotal
      .ele("cbc:TaxableAmount", { currencyID: "TRY" })
      .txt(line.lineAmount.toFixed(2));
    taxSubtotal
      .ele("cbc:TaxAmount", { currencyID: "TRY" })
      .txt(line.vatAmount.toFixed(2));

    const taxCategory = taxSubtotal.ele("cac:TaxCategory");
    taxCategory.ele("cbc:Percent").txt(line.vatRate.toFixed(2));

    const taxScheme = taxCategory.ele("cac:TaxScheme");
    taxScheme.ele("cbc:Name").txt("KDV");
    taxScheme.ele("cbc:TaxTypeCode").txt("0015");

    // Item
    const item = invoiceLine.ele("cac:Item");
    item.ele("cbc:Name").txt(line.name);
    if (line.description) {
      item.ele("cbc:Description").txt(line.description);
    }

    // Price
    const price = invoiceLine.ele("cac:Price");
    price
      .ele("cbc:PriceAmount", { currencyID: "TRY" })
      .txt(line.unitPrice.toFixed(4));
  }

  /**
   * Generate Electronic Tax Transaction Number (ETTN)
   */
  private static generateETTN(): string {
    return uuidv4().replace(/-/g, "").toUpperCase();
  }

  /**
   * Group VAT amounts by rate for tax total calculation
   */
  private static groupVatByRate(lines: EInvoiceData["invoiceLines"]): Array<{
    vatRate: number;
    taxableAmount: number;
    taxAmount: number;
  }> {
    const groups = new Map();

    lines.forEach((line) => {
      const key = line.vatRate;
      if (!groups.has(key)) {
        groups.set(key, {
          vatRate: line.vatRate,
          taxableAmount: 0,
          taxAmount: 0,
        });
      }

      const group = groups.get(key);
      group.taxableAmount += line.lineAmount;
      group.taxAmount += line.vatAmount;
    });

    return Array.from(groups.values());
  }

  /**
   * Validate Turkish tax number (VKN/TCKN)
   */
  static validateTurkishTaxNumber(taxNumber: string): {
    isValid: boolean;
    type: "VKN" | "TCKN" | "INVALID";
  } {
    const cleaned = taxNumber.replace(/\D/g, "");

    if (cleaned.length === 10) {
      return {
        isValid: this.validateVKN(cleaned),
        type: "VKN",
      };
    } else if (cleaned.length === 11) {
      return {
        isValid: this.validateTCKN(cleaned),
        type: "TCKN",
      };
    }

    return { isValid: false, type: "INVALID" };
  }

  /**
   * Validate Turkish VKN (Vergi Kimlik Numarası)
   */
  private static validateVKN(vkn: string): boolean {
    if (vkn.length !== 10) return false;

    const digits = vkn.split("").map(Number);
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      const temp = (digits[i] + (9 - i)) % 10;
      sum += (temp * Math.pow(2, 9 - i)) % 9;
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[9];
  }

  /**
   * Validate Turkish TCKN (TC Kimlik Numarası)
   */
  private static validateTCKN(tckn: string): boolean {
    if (tckn.length !== 11 || tckn === "00000000000") return false;

    const digits = tckn.split("").map(Number);

    // First digit cannot be 0
    if (digits[0] === 0) return false;

    // 10th digit check
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const check10 = (oddSum * 7 - evenSum) % 10;

    if (check10 !== digits[9]) return false;

    // 11th digit check
    const totalSum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);
    const check11 = totalSum % 10;

    return check11 === digits[10];
  }
}

/**
 * Calculate Turkish VAT for given amount and rate
 */
export function calculateTurkishVAT(
  amount: number,
  vatRate: number
): {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
} {
  const netAmount = amount;
  const vatAmount = (amount * vatRate) / 100;
  const grossAmount = netAmount + vatAmount;

  return {
    netAmount: Math.round(netAmount * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grossAmount: Math.round(grossAmount * 100) / 100,
  };
}

/**
 * Get VAT rate for service category
 */
export function getVATRateForService(serviceCategory: string): number {
  // Carpet and upholstery cleaning services typically use 18% VAT in Turkey
  switch (serviceCategory.toUpperCase()) {
    case "CARPET_CLEANING":
    case "UPHOLSTERY_CLEANING":
    case "CURTAIN_CLEANING":
    case "LAUNDRY":
    case "DRY_CLEANING":
      return TURKISH_VAT_RATES.VAT_18;
    default:
      return TURKISH_VAT_RATES.VAT_18;
  }
}
