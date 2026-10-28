"use client";

import { useState, useEffect, useMemo } from "react";
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
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
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
import { saveFile } from "@/lib/save-file";

/** Text from the database goes into the generated HTML file; keep it from becoming markup */
const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

interface EInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerTitle: string;
  totalAmount: number;
  gibStatus: string;
  createdAt: string;
  ettn?: string;
  orderId?: string;
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
  const [createOpen, setCreateOpen] = useState(false);
  const invoicedOrderIds = useMemo(
    () => new Set(invoices.map((inv) => inv.orderId).filter(Boolean) as string[]),
    [invoices]
  );

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

const response = await fetch("/api/invoices", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      // /api/invoices returns basic invoices; map them onto the list's fields
      const rows: EInvoice[] = (data.invoices || []).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        buyerTitle: inv.customerName,
        totalAmount: Number(inv.totalAmount || 0),
        gibStatus: inv.status,
        createdAt: inv.createdAt,
        orderId: inv.orderId || undefined,
        order: inv.order || undefined,
      }));

      setInvoices(rows);
      setFilteredInvoices(rows);
    } catch (error) {
      console.error("Error loading invoices:", error);
      toast.error("Faturalar yüklenirken hata oluştu");
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
      PAID: { variant: "default" as const, icon: CheckCircle, label: "Ödendi" },
      OVERDUE: { variant: "destructive" as const, icon: AlertCircle, label: "Gecikmiş" },
      CANCELLED: { variant: "secondary" as const, icon: AlertCircle, label: "İptal" },
      REFUNDED: { variant: "secondary" as const, icon: Clock, label: "İade edildi" },
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
    setCreateOpen(true);
  };

  const handleViewInvoice = (invoice: EInvoice) => {
    router.push(`/invoices/${invoice.id}`);
  };

  const handleDownloadInvoice = async (invoice: EInvoice) => {
    try {
      toast.info("Fatura belgesi hazırlanıyor...");

      const token = localStorage.getItem("token");
      const detailResp = await fetch(`/api/invoices/${invoice.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const detailJson = detailResp.ok ? await detailResp.json() : null;
      const inv = detailJson?.invoice;
      if (!inv) {
        toast.error("Fatura bilgileri alınamadı");
        return;
      }

      // Seller is always the invoicing business; never fall back to anyone else's details
      const sellerTitle = esc(inv.business?.name || "—");
      const sellerTaxNumber = esc(inv.business?.taxNumber || "—");
      const sellerAddress = esc(
        [inv.business?.address, inv.business?.district, inv.business?.city].filter(Boolean).join(", ") || "—"
      );
      if (!inv.business?.taxNumber || !inv.business?.address) {
        toast.warning("İşletmenin vergi numarası veya adresi eksik; Ayarlar > İşletme'den tamamlayın");
      }
      const items: any[] = Array.isArray(inv?.items) ? inv.items : [];

      const itemsTableHtml =
        items.length > 0
          ? `<table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <thead>
                <tr style="background:#f2f2f2;">
                  <th style="border:1px solid #ddd;padding:8px;text-align:left;">Açıklama</th>
                  <th style="border:1px solid #ddd;padding:8px;text-align:right;">Miktar</th>
                  <th style="border:1px solid #ddd;padding:8px;text-align:right;">Birim Fiyat</th>
                  <th style="border:1px solid #ddd;padding:8px;text-align:right;">KDV %</th>
                  <th style="border:1px solid #ddd;padding:8px;text-align:right;">Toplam</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (it) => `<tr>
                      <td style="border:1px solid #ddd;padding:8px;">${esc(it.name || it.description || "Hizmet")}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:right;">${Number(it.quantity || 1)}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:right;">₺${Number(it.unitPrice || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:right;">%${Number(it.taxRate || 0)}</td>
                      <td style="border:1px solid #ddd;padding:8px;text-align:right;">₺${Number(it.lineTotal || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`
          : "";

      const pdfContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Fatura - ${esc(invoice.invoiceNumber)}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.6; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .company-info { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 20px; }
        .invoice-details { margin-bottom: 20px; }
        .totals { text-align: right; margin-top: 20px; font-size: 16px; }
        .signature { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>FATURA BELGESİ</h1>
        <p>Fatura No: ${esc(invoice.invoiceNumber)}</p>
        ${invoice.ettn ? `<p>ETTN: ${esc(invoice.ettn)}</p>` : ""}
    </div>

    <div class="company-info">
        <div>
            <h3>SATICI BİLGİLERİ</h3>
            <p><strong>${sellerTitle}</strong></p>
            <p>VKN / TCKN: ${sellerTaxNumber}</p>
            <p>${sellerAddress}</p>
        </div>
        <div>
            <h3>ALICI BİLGİLERİ</h3>
            <p><strong>${esc(invoice.buyerTitle)}</strong></p>
            <p>Fatura Tarihi: ${new Date(
              invoice.invoiceDate
            ).toLocaleDateString("tr-TR")}</p>
            ${
              invoice.order
                ? `<p>Sipariş No: ${esc(invoice.order.orderNumber)}</p>`
                : ""
            }
            ${
              invoice.order
                ? `<p>Müşteri: ${esc(invoice.order.customer.firstName)} ${esc(invoice.order.customer.lastName)}</p>`
                : ""
            }
        </div>
    </div>

    <div class="invoice-details">
        <h3>FATURA BİLGİLERİ</h3>
        <p><strong>Fatura No:</strong> ${esc(invoice.invoiceNumber)}</p>
        <p><strong>Fatura Tarihi:</strong> ${new Date(
          invoice.invoiceDate
        ).toLocaleDateString("tr-TR")}</p>
        <p><strong>Durum:</strong> ${getStatusText(invoice.gibStatus)}</p>
        <p><strong>Para Birimi:</strong> TRY</p>
    </div>

    ${itemsTableHtml}

    <div class="totals">
        ${
          inv?.subtotalAmount !== undefined
            ? `<p>Ara Toplam: ₺${Number(inv.subtotalAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>`
            : ""
        }
        ${
          inv?.taxAmount !== undefined
            ? `<p>KDV: ₺${Number(inv.taxAmount).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</p>`
            : ""
        }
        <p><strong>GENEL TOPLAM: ₺${invoice.totalAmount.toLocaleString(
          "tr-TR",
          { minimumFractionDigits: 2 }
        )}</strong></p>
    </div>

    <div class="signature">
        <p>Bu belge elektronik olarak oluşturulmuştur.</p>
        <p>Oluşturma Tarihi: ${new Date(invoice.createdAt).toLocaleString(
          "tr-TR"
        )}</p>
        <p>${sellerTitle}</p>
    </div>
</body>
</html>
      `;

      const result = await saveFile({
        fileName: `Fatura-${invoice.invoiceNumber}.html`,
        content: pdfContent,
        mimeType: "text/html;charset=utf-8",
      });
      if (result !== "cancelled") toast.success("Fatura belgesi hazırlandı");
    } catch (error) {
      console.error("PDF generation error:", error);
      toast.error("Fatura belgesi oluşturulurken hata oluştu");
    }
  };

  const getStatusText = (status: string) => {
    const statusTexts = {
      DRAFT: "Taslak",
      CREATED: "Oluşturuldu",
      SENT: "Gönderildi",
      ACCEPTED: "Kabul Edildi",
      REJECTED: "Reddedildi",
      PAID: "Ödendi",
      OVERDUE: "Gecikmiş",
      CANCELLED: "İptal",
      REFUNDED: "İade edildi",
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  if (!user) {
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>;
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
                  Faturalar
                </h1>
                <p className="text-muted-foreground mt-1">
                  Siparişlerinizin faturaları; e-Fatura gönderimi PRO planda
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
                          inv.gibStatus === "PAID" ||
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
                      <SelectItem value="SENT">Gönderildi</SelectItem>
                      <SelectItem value="PAID">Ödendi</SelectItem>
                      <SelectItem value="OVERDUE">Gecikmiş</SelectItem>
                      <SelectItem value="CANCELLED">İptal</SelectItem>
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
                <CardTitle>Fatura Listesi</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {filteredInvoices.length} fatura bulundu
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p>Faturalar yükleniyor...</p>
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
                               aria-label="Görüntüle">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadInvoice(invoice)}
                               aria-label="İndir">
                                <Download className="h-4 w-4" />
                              </Button>
                              {invoice.gibStatus === "DRAFT" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  title="GİB'e gönderim henüz etkin değil: PRO plan ve E-Fatura ayarları gerekir"
                                  aria-label="GİB'e gönderim henüz etkin değil: PRO plan ve E-Fatura ayarları gerekir"
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
                    <h3 className="text-lg font-medium">Fatura bulunamadı</h3>
                    <p className="text-muted-foreground">
                      Henüz fatura oluşturulmamış veya arama
                      kriterlerinize uygun fatura bulunmuyor.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
      <CreateInvoiceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        invoicedOrderIds={invoicedOrderIds}
        onCreated={(invoiceId) => router.push(`/invoices/${invoiceId}`)}
      />
    </div>
  );
}
