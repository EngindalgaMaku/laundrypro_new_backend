/**
 * GIB Portal Communication Service
 * Handles communication with GIB E-Fatura Portal API
 */

import soap from "soap";
import { readFileSync } from "fs";
import { join } from "path";
import forge from "node-forge";

export interface GIBCredentials {
  username: string;
  password: string;
  testMode: boolean;
  portalUrl: string;
}

export interface CertificateConfig {
  certificatePath: string;
  certificatePassword: string;
}

export interface SendInvoiceRequest {
  invoiceUuid: string;
  invoiceNumber: string;
  ettn: string;
  signedXmlContent: string;
  receiverIdentifier: string; // VKN/TCKN
}

export interface InvoiceStatusResponse {
  invoiceUuid: string;
  status: "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED";
  statusDate: Date;
  errorCode?: string;
  errorMessage?: string;
}

export interface SendInvoiceResponse {
  success: boolean;
  invoiceUuid?: string;
  errorCode?: string;
  errorMessage?: string;
  transactionId?: string;
}

export class GIBPortalService {
  private credentials: GIBCredentials;
  private certificateConfig?: CertificateConfig;
  private soapClient?: any;

  // GIB Portal WSDL URLs
  private static readonly TEST_WSDL_URL =
    "https://efaturaportaltest.gib.gov.tr/FaturaBilgiService.svc?wsdl";
  private static readonly PROD_WSDL_URL =
    "https://efaturaportal.gib.gov.tr/FaturaBilgiService.svc?wsdl";

  constructor(
    credentials: GIBCredentials,
    certificateConfig?: CertificateConfig
  ) {
    this.credentials = credentials;
    this.certificateConfig = certificateConfig;
  }

  /**
   * Initialize SOAP client with GIB Portal
   */
  async initializeClient(): Promise<void> {
    const wsdlUrl = this.credentials.testMode
      ? GIBPortalService.TEST_WSDL_URL
      : GIBPortalService.PROD_WSDL_URL;

    try {
      this.soapClient = await soap.createClientAsync(wsdlUrl, {
        wsdl_options: {
          timeout: 30000,
          headers: {
            "User-Agent": "LaundryPro-EFatura/1.0",
          },
        },
      });

      // Set basic authentication
      this.soapClient.setSecurity(
        new soap.BasicAuthSecurity(
          this.credentials.username,
          this.credentials.password
        )
      );

      console.log("GIB Portal SOAP client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize GIB Portal client:", error);
      throw new Error(`GIB Portal connection failed: ${error}`);
    }
  }

  /**
   * Send invoice to GIB Portal
   */
  async sendInvoice(request: SendInvoiceRequest): Promise<SendInvoiceResponse> {
    if (!this.soapClient) {
      await this.initializeClient();
    }

    try {
      // Prepare SOAP request
      const soapRequest = {
        request: {
          ETTN: request.ettn,
          FATURA_UUID: request.invoiceUuid,
          BELGE_NO: request.invoiceNumber,
          ALICI_VKN: request.receiverIdentifier,
          FATURA_ICERIK: Buffer.from(request.signedXmlContent, "utf8").toString(
            "base64"
          ),
        },
      };

      // Send invoice
      const [result] = await this.soapClient.sendInvoiceAsync(soapRequest);

      if (result.return.SONUC === "0") {
        return {
          success: true,
          invoiceUuid: request.invoiceUuid,
          transactionId: result.return.TRANSACTION_ID,
        };
      } else {
        return {
          success: false,
          errorCode: result.return.HATA_KODU,
          errorMessage: result.return.HATA_ACIKLAMA,
        };
      }
    } catch (error) {
      console.error("Error sending invoice to GIB:", error);
      return {
        success: false,
        errorCode: "SOAP_ERROR",
        errorMessage: `SOAP communication error: ${error}`,
      };
    }
  }

  /**
   * Query invoice status from GIB Portal
   */
  async queryInvoiceStatus(
    invoiceUuid: string
  ): Promise<InvoiceStatusResponse | null> {
    if (!this.soapClient) {
      await this.initializeClient();
    }

    try {
      const soapRequest = {
        request: {
          FATURA_UUID: invoiceUuid,
        },
      };

      const [result] = await this.soapClient.getInvoiceStatusAsync(soapRequest);

      if (result.return.SONUC === "0") {
        return {
          invoiceUuid: invoiceUuid,
          status: this.mapGIBStatusToEnum(result.return.DURUM),
          statusDate: new Date(result.return.DURUM_TARIHI),
          errorCode: result.return.HATA_KODU,
          errorMessage: result.return.HATA_ACIKLAMA,
        };
      }

      return null;
    } catch (error) {
      console.error("Error querying invoice status:", error);
      throw new Error(`Status query failed: ${error}`);
    }
  }

  /**
   * Cancel invoice in GIB Portal
   */
  async cancelInvoice(invoiceUuid: string, reason: string): Promise<boolean> {
    if (!this.soapClient) {
      await this.initializeClient();
    }

    try {
      const soapRequest = {
        request: {
          FATURA_UUID: invoiceUuid,
          IPTAL_NEDENI: reason,
        },
      };

      const [result] = await this.soapClient.cancelInvoiceAsync(soapRequest);
      return result.return.SONUC === "0";
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      return false;
    }
  }

  /**
   * Get invoice list from GIB Portal (for archive purposes)
   */
  async getInvoiceList(startDate: Date, endDate: Date): Promise<any[]> {
    if (!this.soapClient) {
      await this.initializeClient();
    }

    try {
      const soapRequest = {
        request: {
          BASLANGIC_TARIHI: startDate.toISOString().split("T")[0],
          BITIS_TARIHI: endDate.toISOString().split("T")[0],
        },
      };

      const [result] = await this.soapClient.getInvoiceListAsync(soapRequest);

      if (result.return.SONUC === "0") {
        return result.return.FATURA_LISTESI || [];
      }

      return [];
    } catch (error) {
      console.error("Error getting invoice list:", error);
      throw new Error(`Invoice list query failed: ${error}`);
    }
  }

  /**
   * Sign XML content with certificate
   */
  async signXMLContent(xmlContent: string): Promise<string> {
    if (!this.certificateConfig) {
      throw new Error("Certificate configuration not provided");
    }

    try {
      // Read certificate file
      const certificateData = readFileSync(
        this.certificateConfig.certificatePath
      );

      // Parse PKCS#12 certificate
      const p12Der = forge.util.decode64(certificateData.toString("base64"));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(
        p12Asn1,
        this.certificateConfig.certificatePassword
      );

      // Get private key and certificate
      const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      });
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

      if (!keyBags || !certBags) {
        throw new Error("Invalid certificate file");
      }

      const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
      const certificate = certBags[forge.pki.oids.certBag][0].cert;

      // Create XML signature
      const md = forge.md.sha256.create();
      md.update(xmlContent, "utf8");

      // Sign the hash
      const signature = privateKey.sign(md);
      const signatureBase64 = forge.util.encode64(signature);

      // Create signed XML (simplified - in production, use proper XML-DSig)
      const signedXml = this.wrapWithSignature(
        xmlContent,
        signatureBase64,
        certificate
      );

      return signedXml;
    } catch (error) {
      console.error("Error signing XML:", error);
      throw new Error(`XML signing failed: ${error}`);
    }
  }

  /**
   * Validate GIB connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initializeClient();

      // Try to get a simple status or ping
      const testRequest = {
        request: {
          TEST: "1",
        },
      };

      const [result] = await this.soapClient.testConnectionAsync(testRequest);
      return result.return.SONUC === "0";
    } catch (error) {
      console.error("GIB connection test failed:", error);
      return false;
    }
  }

  /**
   * Map GIB status codes to internal enum
   */
  private mapGIBStatusToEnum(
    gibStatus: string
  ): "SENT" | "ACCEPTED" | "REJECTED" | "CANCELLED" {
    switch (gibStatus) {
      case "100":
        return "SENT";
      case "110":
        return "ACCEPTED";
      case "120":
        return "REJECTED";
      case "130":
        return "CANCELLED";
      default:
        return "SENT";
    }
  }

  /**
   * Wrap XML content with digital signature
   */
  private wrapWithSignature(
    xmlContent: string,
    signature: string,
    certificate: any
  ): string {
    // This is a simplified version - in production, implement proper XML-DSig
    const certPem = forge.pki.certificateToPem(certificate);

    return `<?xml version="1.0" encoding="UTF-8"?>
<SignedDocument>
  <Content>
    ${xmlContent}
  </Content>
  <Signature>
    <SignatureValue>${signature}</SignatureValue>
    <Certificate>
      ${certPem
        .replace(/-----BEGIN CERTIFICATE-----/, "")
        .replace(/-----END CERTIFICATE-----/, "")
        .replace(/\n/g, "")}
    </Certificate>
  </Signature>
</SignedDocument>`;
  }

  /**
   * Generate invoice serial number
   */
  static generateInvoiceNumber(
    prefix: string,
    currentNumber: number,
    length: number = 8
  ): string {
    const paddedNumber = currentNumber.toString().padStart(length, "0");
    return `${prefix}${paddedNumber}`;
  }

  /**
   * Validate VKN/TCKN format for GIB Portal
   */
  static validateTaxIdentifier(identifier: string): {
    isValid: boolean;
    type: "VKN" | "TCKN" | "INVALID";
    formatted: string;
  } {
    const cleaned = identifier.replace(/\D/g, "");

    if (cleaned.length === 10) {
      // VKN validation
      return {
        isValid: this.isValidVKN(cleaned),
        type: "VKN",
        formatted: cleaned,
      };
    } else if (cleaned.length === 11) {
      // TCKN validation
      return {
        isValid: this.isValidTCKN(cleaned),
        type: "TCKN",
        formatted: cleaned,
      };
    }

    return {
      isValid: false,
      type: "INVALID",
      formatted: cleaned,
    };
  }

  /**
   * VKN validation algorithm
   */
  private static isValidVKN(vkn: string): boolean {
    if (vkn.length !== 10) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(vkn[i]);
      const weight = (i + 1) % 8 || 8;
      sum += digit * weight;
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;

    return checkDigit === parseInt(vkn[9]);
  }

  /**
   * TCKN validation algorithm
   */
  private static isValidTCKN(tckn: string): boolean {
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
 * GIB Portal Error Codes
 */
export const GIB_ERROR_CODES = {
  SUCCESS: "0",
  INVALID_CREDENTIALS: "1001",
  INVALID_INVOICE_FORMAT: "1002",
  DUPLICATE_INVOICE: "1003",
  INVALID_TAX_NUMBER: "1004",
  CERTIFICATE_ERROR: "1005",
  SYSTEM_ERROR: "9999",
} as const;

/**
 * Helper function to check if error is retryable
 */
export function isRetryableError(errorCode: string): boolean {
  const retryableErrors = ["9999", "SOAP_ERROR"];
  return retryableErrors.includes(errorCode);
}

/**
 * Helper function to get user-friendly error message
 */
export function getErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case GIB_ERROR_CODES.INVALID_CREDENTIALS:
      return "GIB Portal kullanıcı bilgileri hatalı";
    case GIB_ERROR_CODES.INVALID_INVOICE_FORMAT:
      return "Fatura formatı geçersiz";
    case GIB_ERROR_CODES.DUPLICATE_INVOICE:
      return "Bu fatura numarası daha önce kullanılmış";
    case GIB_ERROR_CODES.INVALID_TAX_NUMBER:
      return "Vergi/TC kimlik numarası geçersiz";
    case GIB_ERROR_CODES.CERTIFICATE_ERROR:
      return "E-imza sertifikası hatası";
    case GIB_ERROR_CODES.SYSTEM_ERROR:
      return "GIB Portal sistem hatası";
    default:
      return "Bilinmeyen hata oluştu";
  }
}
