"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Filter,
  ExternalLink,
} from "lucide-react";
import jsPDF from "jspdf";

interface EInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerTitle: string;
  totalAmount: number;
  gibStatus: string;
  createdAt: string;
  ettn?: string;
  order?: {
    orderNumber: string;
    customer: {
      firstName: string;
      lastName: string;
    };
  };
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

export default function EInvoicesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<EInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<EInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

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
    loadInvoices();
  }, [router]);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      // Demo data for testing - in real app this would come from API
      const demoInvoices: EInvoice[] = [
        {
          id: "1",
          invoiceNumber: "EMU202400001",
          invoiceDate: "2024-01-15",
          buyerTitle: "Test Müşteri A.Ş.",
          totalAmount: 1500.0,
          gibStatus: "SENT",
          createdAt: "2024-01-15T10:30:00",
          ettn: "12345678-1234-1234-1234-123456789012",
          order: {
            orderNumber: "ORD-001",
            customer: {
              firstName: "Ahmet",
              lastName: "Yılmaz",
            },
          },
        },
        {
          id: "2",
          invoiceNumber: "EMU202400002",
          invoiceDate: "2024-01-16",
          buyerTitle: "Demo İşletme Ltd.",
          totalAmount: 2300.5,
          gibStatus: "ACCEPTED",
          createdAt: "2024-01-16T14:20:00",
          ettn: "87654321-4321-4321-4321-210987654321",
          order: {
            orderNumber: "ORD-002",
            customer: {
              firstName: "Fatma",
              lastName: "Kaya",
            },
          },
        },
        {
          id: "3",
          invoiceNumber: "EMU202400003",
          invoiceDate: "2024-01-17",
          buyerTitle: "Örnek Temizlik Hizmetleri",
          totalAmount: 850.75,
          gibStatus: "DRAFT",
          createdAt: "2024-01-17T09:15:00",
          order: {
            orderNumber: "ORD-003",
            customer: {
              firstName: "Mehmet",
              lastName: "Demir",
            },
          },
        },
        {
          id: "4",
          invoiceNumber: "EMU202400004",
          invoiceDate: "2024-01-18",
          buyerTitle: "ABC Tekstil San. Tic. Ltd. Şti.",
          totalAmount: 4200.0,
          gibStatus: "REJECTED",
          createdAt: "2024-01-18T16:45:00",
          ettn: "11111111-2222-3333-4444-555555555555",
          order: {
            orderNumber: "ORD-004",
            customer: {
              firstName: "Ayşe",
              lastName: "Öztürk",
            },
          },
        },
      ];

      setInvoices(demoInvoices);
      setFilteredInvoices(demoInvoices);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("E-Faturalar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    filterInvoices(term, statusFilter);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    filterInvoices(searchTerm, status);
  };

  const filterInvoices = (search: string, status: string) => {
    let filtered = invoices;

    if (search) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          invoice.buyerTitle.toLowerCase().includes(search.toLowerCase()) ||
          invoice.order?.orderNumber
            .toLowerCase()
            .includes(search.toLowerCase())
      );
    }

    if (status !== "all") {
      filtered = filtered.filter((invoice) => invoice.gibStatus === status);
    }

    setFilteredInvoices(filtered);
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

  const handleCreateInvoice = () => {
    toast.info("E-Fatura oluşturma özelliği yakında eklenecek");
  };

  const handleViewInvoice = (invoice: EInvoice) => {
    router.push(`/invoices/${invoice.id}`);
  };

  const handleDownloadInvoice = async (invoice: EInvoice) => {
    try {
      toast.info("PDF oluşturuluyor...");

      // Basit PDF içeriği oluştur
      const pdfContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>E-Fatura - ${invoice.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .company-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .invoice-details { margin-bottom: 20px; }
        .totals { text-align: right; margin-top: 20px; font-size: 18px; }
        .signature { margin-top: 50px; text-align: center; color: #666; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>ELEKTRONİK FATURA</h1>
        <p>Fatura No: ${invoice.invoiceNumber}</p>
        ${invoice.ettn ? `<p>ETTN: ${invoice.ettn}</p>` : ""}
    </div>

    <div class="company-info">
        <div>
            <h3>SATICI BİLGİLERİ</h3>
            <p><strong>LaundryPro Temizlik Hizmetleri Ltd. Şti.</strong></p>
            <p>VKN: 9876543210</p>
            <p>Vergi Dairesi: İstanbul Vergi Dairesi</p>
            <p>Merkez Mah. İş Cad. No:456 Şişli/İSTANBUL</p>
        </div>
        <div>
            <h3>ALICI BİLGİLERİ</h3>
            <p><strong>${invoice.buyerTitle}</strong></p>
            <p>Fatura Tarihi: ${new Date(
              invoice.invoiceDate
            ).toLocaleDateString("tr-TR")}</p>
            ${
              invoice.order
                ? `<p>Sipariş No: ${invoice.order.orderNumber}</p>`
                : ""
            }
            ${
              invoice.order
                ? `<p>Müşteri: ${invoice.order.customer.firstName} ${invoice.order.customer.lastName}</p>`
                : ""
            }
        </div>
    </div>

    <div class="invoice-details">
        <h3>FATURA BİLGİLERİ</h3>
        <p><strong>Fatura No:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Fatura Tarihi:</strong> ${new Date(
          invoice.invoiceDate
        ).toLocaleDateString("tr-TR")}</p>
        <p><strong>Durum:</strong> ${getStatusText(invoice.gibStatus)}</p>
        <p><strong>Para Birimi:</strong> TRY</p>
    </div>

    <div class="totals">
        <p><strong>TOPLAM TUTAR: ₺${invoice.totalAmount.toLocaleString(
          "tr-TR",
          { minimumFractionDigits: 2 }
        )}</strong></p>
    </div>

    <div class="signature">
        <p>Bu belge elektronik olarak oluşturulmuştur.</p>
        <p>Oluşturma Tarihi: ${new Date(invoice.createdAt).toLocaleString(
          "tr-TR"
        )}</p>
        <p>LaundryPro - Profesyonel Temizlik Çözümleri</p>
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

      toast.success("Fatura PDF'i başarıyla indirildi");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("PDF oluşturulurken hata oluştu");
    }
  };

  const getStatusText = (status: string) => {
    const statusTexts = {
      DRAFT: "Taslak",
      CREATED: "Oluşturuldu",
      SENT: "Gönderildi",
      ACCEPTED: "Kabul Edildi",
      REJECTED: "Reddedildi",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  const handleSendToGIB = (invoice: EInvoice) => {
    toast.info("GIB'e gönderme özelliği yakında eklenecek");
  };

  if (!user) {
    return <div>Loading...</div>;
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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <FileText className="h-8 w-8 text-blue-600" />
                  E-Faturalar
                </h1>
                <p className="text-muted-foreground mt-1">
                  Elektronik fatura yönetimi ve GIB Portal entegrasyonu
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => router.push("/settings/e-fatura")}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  E-Fatura Ayarları
                </Button>
                <Button
                  onClick={handleCreateInvoice}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Yeni Fatura
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Toplam Fatura
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{invoices.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Gönderildi
                  </CardTitle>
                  <Send className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {
                      invoices.filter(
                        (inv) =>
                          inv.gibStatus === "SENT" ||
                          inv.gibStatus === "ACCEPTED"
                      ).length
                    }
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taslak</CardTitle>
                  <Clock className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {invoices.filter((inv) => inv.gibStatus === "DRAFT").length}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Toplam Tutar
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">₺</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₺
                    {invoices
                      .reduce((sum, inv) => sum + inv.totalAmount, 0)
                      .toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtreler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        className="pl-10"
                        placeholder="Fatura no, müşteri adı veya sipariş no ara..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusFilter}
                  >
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Durumlar</SelectItem>
                      <SelectItem value="DRAFT">Taslak</SelectItem>
                      <SelectItem value="CREATED">Oluşturuldu</SelectItem>
                      <SelectItem value="SENT">Gönderildi</SelectItem>
                      <SelectItem value="ACCEPTED">Kabul Edildi</SelectItem>
                      <SelectItem value="REJECTED">Reddedildi</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={loadInvoices}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Yenile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Invoices Table */}
            <Card>
              <CardHeader>
                <CardTitle>E-Fatura Listesi</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredInvoices.length} fatura bulundu
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>E-Faturalar yükleniyor...</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fatura No</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead>Müşteri</TableHead>
                        <TableHead>Sipariş</TableHead>
                        <TableHead>Tutar</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            {new Date(invoice.invoiceDate).toLocaleDateString(
                              "tr-TR"
                            )}
                          </TableCell>
                          <TableCell>{invoice.buyerTitle}</TableCell>
                          <TableCell>
                            {invoice.order ? (
                              <div>
                                <div className="font-medium">
                                  {invoice.order.orderNumber}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {invoice.order.customer.firstName}{" "}
                                  {invoice.order.customer.lastName}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            ₺
                            {invoice.totalAmount.toLocaleString("tr-TR", {
                              minimumFractionDigits: 2,
                            })}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(invoice.gibStatus)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInvoice(invoice)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              {invoice.gibStatus === "DRAFT" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSendToGIB(invoice)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {!loading && filteredInvoices.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <h3 className="text-lg font-medium">E-Fatura bulunamadı</h3>
                    <p className="text-muted-foreground">
                      Henüz hiç E-Fatura oluşturulmamış veya arama
                      kriterlerinize uygun fatura bulunmuyor.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
