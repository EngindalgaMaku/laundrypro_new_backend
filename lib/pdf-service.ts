import puppeteer, { Browser, Page } from "puppeteer";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

export interface InvoicePDFData {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerVknTckn?: string;
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  business: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
    taxNumber?: string;
  };
  items: {
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    lineAmount: number;
    taxRate: number;
    taxAmount: number;
    lineTotal: number;
  }[];
}

export class PDFService {
  private static browser: Browser | null = null;

  static async initializeBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--window-size=1920x1080",
        ],
      });
    }
    return this.browser;
  }

  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  static async generateInvoicePDF(
    invoiceId: string,
    businessId: string
  ): Promise<string> {
    try {
      // Get invoice data
      const invoiceData = await this.getInvoiceData(invoiceId, businessId);
      if (!invoiceData) {
        throw new Error("Invoice not found");
      }

      // Generate HTML content
      const htmlContent = this.generateInvoiceHTML(invoiceData);

      // Create PDF
      const browser = await this.initializeBrowser();
      const page = await browser.newPage();

      await page.setContent(htmlContent, {
        waitUntil: "networkidle0",
        timeout: 30000,
      });

      // Configure PDF options
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
        printBackground: true,
        displayHeaderFooter: false,
      });

      await page.close();

      // Save PDF to temporary directory
      const fileName = `invoice-${invoiceData.invoiceNumber}-${Date.now()}.pdf`;
      const filePath = await this.savePDFFile(fileName, Buffer.from(pdfBuffer));

      // Update invoice with PDF URL
      await (prisma as any).invoice.update({
        where: { id: invoiceId },
        data: { pdfUrl: `/temp/invoices/${fileName}` },
      });

      return filePath;
    } catch (error) {
      console.error("PDF generation error:", error);
      throw error;
    }
  }

  private static async getInvoiceData(
    invoiceId: string,
    businessId: string
  ): Promise<InvoicePDFData | null> {
    const invoice = await (prisma as any).invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
        business: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            district: true,
            taxNumber: true,
          },
        },
      },
    });

    if (!invoice || invoice.businessId !== businessId) {
      return null;
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      customerEmail: invoice.customerEmail,
      customerAddress: invoice.customerAddress,
      customerVknTckn: invoice.customerVknTckn,
      subtotalAmount: parseFloat(invoice.subtotalAmount.toString()),
      taxAmount: parseFloat(invoice.taxAmount.toString()),
      totalAmount: parseFloat(invoice.totalAmount.toString()),
      paymentStatus: invoice.paymentStatus,
      paymentMethod: invoice.paymentMethod,
      business: invoice.business,
      items: invoice.items.map((item: any) => ({
        name: item.name,
        description: item.description,
        quantity: parseFloat(item.quantity.toString()),
        unitPrice: parseFloat(item.unitPrice.toString()),
        lineAmount: parseFloat(item.lineAmount.toString()),
        taxRate: parseFloat(item.taxRate.toString()),
        taxAmount: parseFloat(item.taxAmount.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
      })),
    };
  }

  private static generateInvoiceHTML(data: InvoicePDFData): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 2,
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("tr-TR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    };

    return `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fatura ${data.invoiceNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .invoice {
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }
        
        .company-info {
            font-size: 11px;
            color: #666;
            line-height: 1.5;
        }
        
        .invoice-info {
            text-align: right;
            flex: 1;
        }
        
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        
        .invoice-details {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
        }
        
        .invoice-details div {
            margin-bottom: 5px;
        }
        
        .invoice-details strong {
            color: #374151;
        }
        
        .parties {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
            gap: 30px;
        }
        
        .party {
            flex: 1;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .party-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #2563eb;
        }
        
        .party-info {
            font-size: 11px;
            line-height: 1.6;
        }
        
        .party-info div {
            margin-bottom: 4px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .items-table th {
            background: #2563eb;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .items-table th.center {
            text-align: center;
        }
        
        .items-table th.right {
            text-align: right;
        }
        
        .items-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 11px;
        }
        
        .items-table tr:last-child td {
            border-bottom: none;
        }
        
        .items-table tr:nth-child(even) {
            background: #f9fafb;
        }
        
        .items-table .center {
            text-align: center;
        }
        
        .items-table .right {
            text-align: right;
            font-weight: 500;
        }
        
        .totals {
            display: flex;
            justify-content: flex-end;
            margin: 30px 0;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .totals-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 12px;
        }
        
        .totals-table tr:last-child td {
            border-bottom: none;
            background: #2563eb;
            color: white;
            font-weight: bold;
            font-size: 14px;
        }
        
        .totals-table .label {
            text-align: left;
            font-weight: 500;
        }
        
        .totals-table .amount {
            text-align: right;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 10px;
            color: #666;
        }
        
        .payment-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .payment-status.paid {
            background: #dcfce7;
            color: #166534;
        }
        
        .payment-status.pending {
            background: #fef3c7;
            color: #92400e;
        }
        
        .payment-status.cancelled {
            background: #fee2e2;
            color: #991b1b;
        }

        @media print {
            body { margin: 0; }
            .invoice { padding: 0; }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <div class="logo-section">
                <div class="company-name">${data.business.name}</div>
                <div class="company-info">
                    ${
                      data.business.address
                        ? `<div>${data.business.address}</div>`
                        : ""
                    }
                    ${
                      data.business.city && data.business.district
                        ? `<div>${data.business.district}, ${data.business.city}</div>`
                        : ""
                    }
                    ${
                      data.business.phone
                        ? `<div>Tel: ${data.business.phone}</div>`
                        : ""
                    }
                    ${
                      data.business.email
                        ? `<div>Email: ${data.business.email}</div>`
                        : ""
                    }
                    ${
                      data.business.taxNumber
                        ? `<div>Vergi No: ${data.business.taxNumber}</div>`
                        : ""
                    }
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-title">FATURA</div>
                <div class="invoice-details">
                    <div><strong>Fatura No:</strong> ${data.invoiceNumber}</div>
                    <div><strong>Tarih:</strong> ${formatDate(
                      data.invoiceDate
                    )}</div>
                    <div><strong>Durum:</strong> 
                        <span class="payment-status ${data.paymentStatus.toLowerCase()}">
                            ${
                              data.paymentStatus === "PAID"
                                ? "ÖDENDİ"
                                : data.paymentStatus === "PENDING"
                                ? "BEKLİYOR"
                                : data.paymentStatus === "CANCELLED"
                                ? "İPTAL"
                                : data.paymentStatus
                            }
                        </span>
                    </div>
                    ${
                      data.paymentMethod
                        ? `<div><strong>Ödeme:</strong> ${
                            data.paymentMethod === "CASH"
                              ? "Nakit"
                              : data.paymentMethod === "CREDIT_CARD"
                              ? "Kredi Kartı"
                              : data.paymentMethod
                          }</div>`
                        : ""
                    }
                </div>
            </div>
        </div>

        <div class="parties">
            <div class="party">
                <div class="party-title">SATICI BİLGİLERİ</div>
                <div class="party-info">
                    <div><strong>${data.business.name}</strong></div>
                    ${
                      data.business.address
                        ? `<div>${data.business.address}</div>`
                        : ""
                    }
                    ${
                      data.business.city && data.business.district
                        ? `<div>${data.business.district}, ${data.business.city}</div>`
                        : ""
                    }
                    ${
                      data.business.phone
                        ? `<div>Tel: ${data.business.phone}</div>`
                        : ""
                    }
                    ${
                      data.business.email
                        ? `<div>Email: ${data.business.email}</div>`
                        : ""
                    }
                    ${
                      data.business.taxNumber
                        ? `<div>Vergi No: ${data.business.taxNumber}</div>`
                        : ""
                    }
                </div>
            </div>
            
            <div class="party">
                <div class="party-title">ALICI BİLGİLERİ</div>
                <div class="party-info">
                    <div><strong>${data.customerName}</strong></div>
                    ${
                      data.customerAddress
                        ? `<div>${data.customerAddress}</div>`
                        : ""
                    }
                    ${
                      data.customerPhone
                        ? `<div>Tel: ${data.customerPhone}</div>`
                        : ""
                    }
                    ${
                      data.customerEmail
                        ? `<div>Email: ${data.customerEmail}</div>`
                        : ""
                    }
                    ${
                      data.customerVknTckn
                        ? `<div>VKN/TCKN: ${data.customerVknTckn}</div>`
                        : ""
                    }
                </div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Ürün/Hizmet</th>
                    <th class="center">Miktar</th>
                    <th class="right">Birim Fiyat</th>
                    <th class="right">Tutar</th>
                    <th class="center">KDV %</th>
                    <th class="right">KDV Tutarı</th>
                    <th class="right">Toplam</th>
                </tr>
            </thead>
            <tbody>
                ${data.items
                  .map(
                    (item) => `
                <tr>
                    <td>
                        <div style="font-weight: 500;">${item.name}</div>
                        ${
                          item.description
                            ? `<div style="color: #666; font-size: 10px;">${item.description}</div>`
                            : ""
                        }
                    </td>
                    <td class="center">${item.quantity}</td>
                    <td class="right">${formatCurrency(item.unitPrice)}</td>
                    <td class="right">${formatCurrency(item.lineAmount)}</td>
                    <td class="center">${item.taxRate}%</td>
                    <td class="right">${formatCurrency(item.taxAmount)}</td>
                    <td class="right">${formatCurrency(item.lineTotal)}</td>
                </tr>
                `
                  )
                  .join("")}
            </tbody>
        </table>

        <div class="totals">
            <table class="totals-table">
                <tr>
                    <td class="label">Ara Toplam:</td>
                    <td class="amount">${formatCurrency(
                      data.subtotalAmount
                    )}</td>
                </tr>
                <tr>
                    <td class="label">KDV Tutarı:</td>
                    <td class="amount">${formatCurrency(data.taxAmount)}</td>
                </tr>
                <tr>
                    <td class="label">GENEL TOPLAM:</td>
                    <td class="amount">${formatCurrency(data.totalAmount)}</td>
                </tr>
            </table>
        </div>

        <div class="footer">
            <p>Bu fatura elektronik ortamda oluşturulmuş olup, yasal geçerliliğe sahiptir.</p>
            <p>Fatura tarihi: ${formatDate(new Date())}</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  private static async savePDFFile(
    fileName: string,
    pdfBuffer: Buffer
  ): Promise<string> {
    // Create directory if it doesn't exist
    const tempDir = path.join(process.cwd(), "public", "temp", "invoices");

    try {
      await fs.access(tempDir);
    } catch (error) {
      await fs.mkdir(tempDir, { recursive: true });
    }

    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    return filePath;
  }

  static async cleanupOldPDFs(olderThanHours: number = 24): Promise<number> {
    try {
      const tempDir = path.join(process.cwd(), "public", "temp", "invoices");
      const files = await fs.readdir(tempDir);

      let deletedCount = 0;
      const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;

      for (const file of files) {
        if (file.endsWith(".pdf")) {
          const filePath = path.join(tempDir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("PDF cleanup error:", error);
      return 0;
    }
  }
}
