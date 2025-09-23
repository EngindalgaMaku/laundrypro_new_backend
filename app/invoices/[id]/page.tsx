"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Send,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Eye,
  Building,
  User,
  Calendar,
  Hash,
  CreditCard,
  ShoppingCart,
  MapPin,
  Phone,
  Mail,
  Printer,
} from "lucide-react";
import jsPDF from "jspdf";

interface EInvoiceDetail {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  issueDate: string;
  dueDate: string;
  buyerTitle: string;
  buyerTaxNumber: string;
  buyerTaxOffice: string;
  buyerAddress: string;
  buyerEmail?: string;
  buyerPhone?: string;
  sellerTitle: string;
  sellerTaxNumber: string;
  sellerTaxOffice: string;
  sellerAddress: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  currency: string;
  gibStatus: string;
  ettn?: string;
  createdAt: string;
  sentAt?: string;
  acceptedAt?: string;
  order?: {
    orderNumber: string;
    orderDate: string;
    customer: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
    };
  };
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  notes?: string;
}

interface User {
  id: string;
  email: string;
  businessName: string;
  business: {
    name: string;
    businessType: string;
  };
}

export default function EInvoiceDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [invoice, setInvoice] = useState<EInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (!parsedUser.business) {
      parsedUser.business = {
        name: parsedUser.businessName || "LaundryPro",
        businessType: parsedUser.businessType || "LAUNDRY",
      };
    }
    setUser(parsedUser);
    loadInvoiceDetail();
  }, [params.id, router]);

  const loadInvoiceDetail = async () => {
    try {
      setLoading(true);
      const invoiceId = params.id as string;

      // Demo data - gerçek uygulamada API'dan gelir
      const demoInvoiceDetail: EInvoiceDetail = {
        id: invoiceId,
        invoiceNumber: "EMU202400001",
        invoiceDate: "2024-01-15",
        issueDate: "2024-01-15",
        dueDate: "2024-01-30",
        buyerTitle: "Test Müşteri A.Ş.",
        buyerTaxNumber: "1234567890",
        buyerTaxOffice: "İstanbul Vergi Dairesi",
        buyerAddress: "Atatürk Mah. İnönü Cad. No:123 Beşiktaş/İSTANBUL",
        buyerEmail: "muhasebe@testmusteri.com.tr",
        buyerPhone: "+90 212 123 45 67",
        sellerTitle: "LaundryPro Temizlik Hizmetleri Ltd. Şti.",
        sellerTaxNumber: "9876543210",
        sellerTaxOffice: "İstanbul Vergi Dairesi",
        sellerAddress: "Merkez Mah. İş Cad. No:456 Şişli/İSTANBUL",
        totalAmount: 1770.0,
        taxAmount: 270.0,
        netAmount: 1500.0,
        currency: "TRY",
        gibStatus: "SENT",
        ettn: "12345678-1234-1234-1234-123456789012",
        createdAt: "2024-01-15T10:30:00",
        sentAt: "2024-01-15T11:00:00",
        order: {
          orderNumber: "ORD-001",
          orderDate: "2024-01-14",
          customer: {
            firstName: "Ahmet",
            lastName: "Yılmaz",
            email: "ahmet.yilmaz@testmusteri.com.tr",
            phone: "+90 532 123 45 67",
          },
        },
        items: [
          {
            id: "1",
            description: "Kuru Temizleme - Takım Elbise",
            quantity: 2,
            unitPrice: 350.0,
            taxRate: 18,
            taxAmount: 126.0,
            totalAmount: 826.0,
          },
          {
            id: "2",
            description: "Ütü Hizmeti - Gömlek",
            quantity: 5,
            unitPrice: 20.0,
            taxRate: 18,
            taxAmount: 18.0,
            totalAmount: 118.0,
          },
          {
            id: "3",
            description: "Halı Yıkama - 3x4 m",
            quantity: 1,
            unitPrice: 800.0,
            taxRate: 18,
            taxAmount: 144.0,
            totalAmount: 944.0,
          },
        ],
        notes:
          "Teslimat adresi: Atatürk Mah. İnönü Cad. No:123 Beşiktaş/İSTANBUL\nTeslimat zamanı: 16:00-18:00 arası",
      };

      setInvoice(demoInvoiceDetail);
    } catch (error) {
      console.error("Error loading invoice detail:", error);
      toast.error("Fatura detayları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { variant: "secondary" as const, icon: Clock, label: "Taslak" },
      CREATED: {
        variant: "default" as const,
        icon: FileText,
        label: "Oluşturuldu",
      },
      SENT: { variant: "default" as const, icon: Send, label: "Gönderildi" },
      ACCEPTED: {
        variant: "default" as const,
        icon: CheckCircle,
        label: "Kabul Edildi",
      },
      REJECTED: {
        variant: "destructive" as const,
        icon: AlertCircle,
        label: "Reddedildi",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleDownloadPDF = () => {
    if (invoice) {
      generatePDF(invoice);
    }
  };

  const generatePDF = async (invoice: EInvoiceDetail) => {
    try {
      toast.info("PDF oluşturuluyor...");

      // PDF içeriği oluştur
      const pdfContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>E-Fatura - ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .company-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .invoice-details { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-top: 20px; }
        .signature { margin-top: 50px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>ELEKTRONİK FATURA</h1>
        <p>ETTN: ${invoice.ettn || "Belirtilmemiş"}</p>
    </div>

    <div class="company-info">
        <div>
            <h3>SATICI BİLGİLERİ</h3>
            <p><strong>${invoice.sellerTitle}</strong></p>
            <p>VKN: ${invoice.sellerTaxNumber}</p>
            <p>Vergi Dairesi: ${invoice.sellerTaxOffice}</p>
            <p>${invoice.sellerAddress}</p>
        </div>
        <div>
            <h3>ALICI BİLGİLERİ</h3>
            <p><strong>${invoice.buyerTitle}</strong></p>
            <p>VKN: ${invoice.buyerTaxNumber}</p>
            <p>Vergi Dairesi: ${invoice.buyerTaxOffice}</p>
            <p>${invoice.buyerAddress}</p>
            ${invoice.buyerEmail ? `<p>E-posta: ${invoice.buyerEmail}</p>` : ""}
            ${invoice.buyerPhone ? `<p>Telefon: ${invoice.buyerPhone}</p>` : ""}
        </div>
    </div>

    <div class="invoice-details">
        <p><strong>Fatura No:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Fatura Tarihi:</strong> ${new Date(
          invoice.invoiceDate
        ).toLocaleDateString("tr-TR")}</p>
        <p><strong>Vade Tarihi:</strong> ${new Date(
          invoice.dueDate
        ).toLocaleDateString("tr-TR")}</p>
        ${
          invoice.order
            ? `<p><strong>Sipariş No:</strong> ${invoice.order.orderNumber}</p>`
            : ""
        }
        <p><strong>Para Birimi:</strong> ${invoice.currency}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Açıklama</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>KDV Oranı</th>
                <th>KDV Tutarı</th>
                <th>Toplam</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items
              .map(
                (item) => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>₺${item.unitPrice.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}</td>
                    <td>%${item.taxRate}</td>
                    <td>₺${item.taxAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}</td>
                    <td>₺${item.totalAmount.toLocaleString("tr-TR", {
                      minimumFractionDigits: 2,
                    })}</td>
                </tr>
            `
              )
              .join("")}
        </tbody>
    </table>

    <div class="totals">
        <p><strong>Ara Toplam: ₺${invoice.netAmount.toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
        })}</strong></p>
        <p><strong>KDV Toplam: ₺${invoice.taxAmount.toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
        })}</strong></p>
        <p><strong>GENEL TOPLAM: ₺${invoice.totalAmount.toLocaleString(
          "tr-TR",
          { minimumFractionDigits: 2 }
        )}</strong></p>
    </div>

    ${
      invoice.notes
        ? `
        <div style="margin-top: 20px;">
            <h4>Notlar:</h4>
            <p>${invoice.notes.replace(/\n/g, "<br>")}</p>
        </div>
    `
        : ""
    }

    <div class="signature">
        <p>Bu belge elektronik olarak imzalanmıştır.</p>
        <p>Oluşturma Tarihi: ${new Date(invoice.createdAt).toLocaleString(
          "tr-TR"
        )}</p>
    </div>
</body>
</html>
      `;

      // PDF indirmek için blob oluştur ve indir
      const blob = new Blob([pdfContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `E-Fatura-${invoice.invoiceNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF başarıyla indirildi");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("PDF oluşturulurken hata oluştu");
    }
  };

  const handleSendToGIB = () => {
    toast.info("GIB'e gönderme işlemi başlatılıyor...");
    // GIB Portal entegrasyonu burada olacak
  };

  const handlePrint = () => {
    window.print();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        Yükleniyor...
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            onMenuClick={() => setIsMobileMenuOpen(true)}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Fatura detayları yükleniyor...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            user={user}
            onMenuClick={() => setIsMobileMenuOpen(true)}
            isMobileMenuOpen={isMobileMenuOpen}
          />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
              <h3 className="text-lg font-medium">Fatura Bulunamadı</h3>
              <p className="text-muted-foreground mb-4">
                Aradığınız fatura bulunamadı veya erişim izniniz bulunmuyor.
              </p>
              <Button onClick={() => router.push("/invoices")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Fatura Listesine Dön
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/invoices")}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Geri
                </Button>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileText className="h-8 w-8 text-blue-600" />
                    E-Fatura Detayı
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    {invoice.invoiceNumber} - {invoice.buyerTitle}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Yazdır
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF İndir
                </Button>
                {invoice.gibStatus === "DRAFT" && (
                  <Button onClick={handleSendToGIB}>
                    <Send className="h-4 w-4 mr-2" />
                    GIB'e Gönder
                  </Button>
                )}
              </div>
            </div>

            {/* Status and Basic Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Fatura Bilgileri</CardTitle>
                    {getStatusBadge(invoice.gibStatus)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Fatura No</p>
                      <p className="font-mono font-medium">
                        {invoice.invoiceNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ETTN</p>
                      <p className="font-mono text-sm">
                        {invoice.ettn || "Belirtilmemiş"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Fatura Tarihi
                      </p>
                      <p className="font-medium">
                        {new Date(invoice.invoiceDate).toLocaleDateString(
                          "tr-TR"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Vade Tarihi
                      </p>
                      <p className="font-medium">
                        {new Date(invoice.dueDate).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    {invoice.order && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Sipariş No
                          </p>
                          <p className="font-medium">
                            {invoice.order.orderNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Sipariş Tarihi
                          </p>
                          <p className="font-medium">
                            {new Date(
                              invoice.order.orderDate
                            ).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tutar Özeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ara Toplam:</span>
                    <span className="font-medium">
                      ₺
                      {invoice.netAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KDV:</span>
                    <span className="font-medium">
                      ₺
                      {invoice.taxAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Genel Toplam:</span>
                    <span>
                      ₺
                      {invoice.totalAmount.toLocaleString("tr-TR", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Satıcı Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{invoice.sellerTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VKN / TCKN</p>
                    <p className="font-mono">{invoice.sellerTaxNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Vergi Dairesi
                    </p>
                    <p>{invoice.sellerTaxOffice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Adres
                    </p>
                    <p className="text-sm">{invoice.sellerAddress}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Alıcı Bilgileri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="font-medium">{invoice.buyerTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VKN / TCKN</p>
                    <p className="font-mono">{invoice.buyerTaxNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Vergi Dairesi
                    </p>
                    <p>{invoice.buyerTaxOffice}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Adres
                    </p>
                    <p className="text-sm">{invoice.buyerAddress}</p>
                  </div>
                  {invoice.buyerEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        E-posta
                      </p>
                      <p className="text-sm">{invoice.buyerEmail}</p>
                    </div>
                  )}
                  {invoice.buyerPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefon
                      </p>
                      <p className="text-sm">{invoice.buyerPhone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Fatura Kalemleri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Açıklama</th>
                        <th className="text-right py-3 px-2">Miktar</th>
                        <th className="text-right py-3 px-2">Birim Fiyat</th>
                        <th className="text-right py-3 px-2">KDV %</th>
                        <th className="text-right py-3 px-2">KDV Tutarı</th>
                        <th className="text-right py-3 px-2">Toplam</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-3 px-2">
                            <p className="font-medium">{item.description}</p>
                          </td>
                          <td className="text-right py-3 px-2">
                            {item.quantity}
                          </td>
                          <td className="text-right py-3 px-2">
                            ₺
                            {item.unitPrice.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right py-3 px-2">
                            {item.taxRate}%
                          </td>
                          <td className="text-right py-3 px-2">
                            ₺
                            {item.taxAmount.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right py-3 px-2 font-medium">
                            ₺
                            {item.totalAmount.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-sm">{invoice.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            <Card>
              <CardHeader>
                <CardTitle>Durum Geçmişi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium">Fatura Oluşturuldu</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                  {invoice.sentAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">GIB'e Gönderildi</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.sentAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  )}
                  {invoice.acceptedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">Kabul Edildi</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(invoice.acceptedAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
