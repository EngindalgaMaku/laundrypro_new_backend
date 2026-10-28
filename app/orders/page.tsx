"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ORDER_STATUS_FLOW, orderStatusInfo, orderStatusLabel } from "@/lib/order-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  Download,
  Plus,
  Package,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  MoreHorizontal,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  makePhoneCall,
  sendWhatsAppMessage,
  sendEmail,
  communicationTemplates,
} from "@/lib/communication";
import { toast } from "sonner";
import { buildCsv } from "@/lib/csv";
import { saveFile } from "@/lib/save-file";

interface User {
  id: string;
  email: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface Order {
  id: string;
  orderNumber?: string;
  customer: string;
  service: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "READY_FOR_PICKUP"
    | "READY_FOR_DELIVERY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED";
  amount: string;
  totalAmount?: number;
  paymentStatus?: string;
  date: string;
  phone: string;
  whatsapp: string;
  email?: string;
  description: string;
  serviceType: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  address?: string;
  customerId: string;
}

// Status filter chips in workflow order (the list never had a COMPLETED filter)
const STATUS_FILTERS = ORDER_STATUS_FLOW.filter((status) => status !== "COMPLETED");

// Only non-normal priorities are shown on the order card
const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return { color: "text-red-700", label: "Acil" };
    case "HIGH":
      return { color: "text-amber-700", label: "Yüksek öncelik" };
    case "LOW":
      return { color: "text-muted-foreground", label: "Düşük öncelik" };
    default:
      return { color: "text-muted-foreground", label: "Normal" };
  }
};

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState<"ALL" | "UNPAID" | "PAID">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "URGENT" | "HIGH">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Counts across all orders (the list itself is filtered and paginated)
  const [statusTotals, setStatusTotals] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const router = useRouter();

  // DEBUG: Log sidebar state changes
  console.log("OrdersPage - Sidebar States:", {
    isMobileMenuOpen,
    isSidebarCollapsed,
  });

  const limit = 12;

  useEffect(() => {
    // Load last used status filter or URL search params
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSearch = urlParams.get("search");
      const urlStatus = urlParams.get("status");
      if (urlSearch) {
        setSearchQuery(urlSearch);
      }
      if (urlStatus) {
        setActiveTab(urlStatus);
      } else {
        const savedStatus = localStorage.getItem("ordersActiveStatus");
        if (savedStatus) {
          setActiveTab(savedStatus);
        }
      }
    } catch (e) {
      console.warn("OrdersPage: unable to read saved status filter");
    }

    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.businessName && !parsedUser.business) {
      parsedUser.business = {
        name: parsedUser.businessName || parsedUser.businessType,
        businessType: parsedUser.businessType,
      };
    }
    setUser(parsedUser);
  }, [router]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (activeTab !== "ALL") {
        params.append("status", activeTab);
      }

      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      if (paymentFilter !== "ALL") {
        params.append("paymentStatus", paymentFilter);
      }

      if (priorityFilter !== "ALL") {
        params.append("priority", priorityFilter);
      }

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      const statsResponse = await fetch("/api/orders/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsResponse.ok) {
        const s = await statsResponse.json();
        setStatusTotals({
          total: s.total || 0,
          byStatus: {
            PENDING: s.pending || 0,
            CONFIRMED: s.confirmed || 0,
            READY_FOR_PICKUP: s.readyForPickup || 0,
            IN_PROGRESS: s.inProgress || 0,
            READY_FOR_DELIVERY: s.readyForDelivery || 0,
            OUT_FOR_DELIVERY: s.outForDelivery || 0,
            DELIVERED: s.delivered || 0,
            COMPLETED: s.completed || 0,
            CANCELLED: s.cancelled || 0,
          },
        });
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Siparişler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, currentPage, activeTab, searchQuery, paymentFilter, priorityFilter]);

  const handleExportOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const params = new URLSearchParams({ page: "1", limit: "500" });
      if (activeTab !== "ALL") params.append("status", activeTab);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (paymentFilter !== "ALL") params.append("paymentStatus", paymentFilter);
      if (priorityFilter !== "ALL") params.append("priority", priorityFilter);

      const res = await fetch(`/api/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const exportList: Order[] = data.orders || orders;

      if (exportList.length === 0) {
        toast.error("Dışa aktarılacak sipariş bulunamadı");
        return;
      }

      const csv = buildCsv(
        ["Sipariş No", "Müşteri", "Telefon", "Tarih", "Durum", "Ödeme Durumu", "Tutar", "Açıklama"],
        exportList.map((o) => [
          o.orderNumber || o.id,
          o.customer,
          o.phone,
          o.date,
          orderStatusLabel(o.status),
          o.paymentStatus === "PAID" ? "Ödendi" : o.paymentStatus === "PARTIAL" ? "Kısmi Ödeme" : "Ödeme Bekliyor",
          o.amount,
          o.description,
        ])
      );
      const result = await saveFile({
        fileName: `Siparisler-${new Date().toISOString().slice(0, 10)}.csv`,
        content: csv,
        mimeType: "text/csv;charset=utf-8",
      });
      if (result === "cancelled") return;
      toast.success(`${exportList.length} sipariş dışa aktarıldı`);
    } catch {
      toast.error("Dışa aktarma sırasında hata oluştu");
    }
  };

  // Persist selected status filter
  useEffect(() => {
    try {
      localStorage.setItem("ordersActiveStatus", activeTab);
    } catch (e) {
      // noop
    }
  }, [activeTab]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  };

  // Communication functions
  const callCustomer = (order: Order) => {
    makePhoneCall(order.phone);
    toast.success(`${order.customer} aranıyor...`);
  };

  const whatsappCustomer = (order: Order) => {
    const message = communicationTemplates.orderUpdate.whatsapp(
      order.customer,
      order.orderNumber || order.id,
      orderStatusLabel(order.status)
    );
    sendWhatsAppMessage(order.whatsapp, message);
    toast.success(
      `${order.customer} adlı müşteriye WhatsApp mesajı gönderildi`
    );
  };

  const emailCustomer = (order: Order) => {
    if (!order.email) {
      toast.error("Müşteri e-posta adresi bulunamadı");
      return;
    }

    const subject = `Sipariş Durumu - ${order.orderNumber || order.id}`;
    const body = communicationTemplates.orderUpdate.email.body(
      order.customer,
      order.orderNumber || order.id,
      orderStatusLabel(order.status)
    );

    sendEmail(order.email, subject, body);
    toast.success(`${order.customer} adlı müşteriye e-posta gönderildi`);
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Status counts: server totals when available, else the loaded page
  const statusCounts =
    statusTotals?.byStatus ??
    orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  const allOrdersTotal = statusTotals?.total ?? total;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => {
          console.log("DEBUG: Sidebar closing");
          setIsMobileMenuOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          console.log("DEBUG: Sidebar collapse toggling");
          setIsSidebarCollapsed(!isSidebarCollapsed);
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => {
            console.log("DEBUG: Menu button clicked");
            setIsMobileMenuOpen(true);
          }}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-5">
            <PageHeader
              title="Siparişler"
              description={`Toplam ${allOrdersTotal} sipariş • ${total} görüntüleniyor`}
              actions={
                <Button onClick={() => router.push("/orders/create")} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" />
                  Yeni Sipariş
                </Button>
              }
            />

            {/* Search and tools */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Sipariş no, müşteri adı ara..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Filter className="h-4 w-4" />
                      Filtrele
                      {(paymentFilter !== "ALL" || priorityFilter !== "ALL") && (
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                          Aktif
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>Tahsilat / Cari Durumu</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setPaymentFilter("ALL");
                        setCurrentPage(1);
                      }}
                    >
                      {paymentFilter === "ALL" ? "✓ " : ""}Tüm Siparişler
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setPaymentFilter("UNPAID");
                        setCurrentPage(1);
                      }}
                    >
                      {paymentFilter === "UNPAID" ? "✓ " : ""}Ödemesi Kalanlar (Veresiye)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setPaymentFilter("PAID");
                        setCurrentPage(1);
                      }}
                    >
                      {paymentFilter === "PAID" ? "✓ " : ""}Ödemesi Tamamlananlar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Öncelik</DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => {
                        setPriorityFilter("ALL");
                        setCurrentPage(1);
                      }}
                    >
                      {priorityFilter === "ALL" ? "✓ " : ""}Tüm Öncelikler
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setPriorityFilter("URGENT");
                        setCurrentPage(1);
                      }}
                    >
                      {priorityFilter === "URGENT" ? "✓ " : ""}Sadece Acil Siparişler
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setPriorityFilter("HIGH");
                        setCurrentPage(1);
                      }}
                    >
                      {priorityFilter === "HIGH" ? "✓ " : ""}Yüksek Öncelikli
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={handleExportOrders}>
                  <Download className="h-4 w-4" />
                  Dışa Aktar
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange}>
              {/* Status filter: one chip style; the coloured dot is the only status colour */}
              <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
                <TabsList className="h-auto gap-2 bg-transparent p-0">
                  {(["ALL", ...STATUS_FILTERS] as const).map((value) => {
                    const isActive = activeTab === value;
                    const count = value === "ALL" ? allOrdersTotal : statusCounts[value] || 0;
                    const info = value === "ALL" ? null : orderStatusInfo(value);
                    return (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className={`h-9 gap-2 rounded-full border px-3.5 text-sm font-medium shadow-none data-[state=active]:shadow-none ${
                          isActive
                            ? "border-primary bg-primary text-primary-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                            : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {info && !isActive && (
                          <span className={`h-2 w-2 rounded-full ${info.classes.dot}`} aria-hidden="true" />
                        )}
                        {info ? info.label : "Tümü"}
                        <span
                          className={`min-w-5 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                            isActive ? "bg-white/20" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  onClick={() => setIsLegendOpen(true)}
                  aria-label="Durum kartelası"
                >
                  <Info className="h-4 w-4" />
                  <span className="hidden sm:inline">Kartela</span>
                </Button>
              </div>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="text-center space-y-3">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground">Siparişler yükleniyor...</p>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                    <Package className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-3 font-semibold text-foreground">Sipariş bulunamadı</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Arama kriterlerinize uygun sipariş bulunmuyor.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
                      {orders.map((order) => {
                        const priorityConfig = getPriorityConfig(order.priority);
                        const showPriority = order.priority && order.priority !== "NORMAL";
                        const detail = [order.service, order.description]
                          .filter((text) => text && text !== "Hizmet belirtilmedi")
                          .join(" • ");

                        return (
                          <div
                            key={order.id}
                            className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{order.customer}</p>
                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {order.orderNumber || order.id} •{" "}
                                  {new Date(order.date).toLocaleDateString("tr-TR")}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <OrderStatusBadge status={order.status} />
                                {showPriority && (
                                  <span className={`text-xs font-semibold ${priorityConfig.color}`}>
                                    {priorityConfig.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            {detail && (
                              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{detail}</p>
                            )}

                            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                              <span className="text-lg font-bold tabular-nums text-foreground">
                                {order.amount}
                              </span>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    callCustomer(order);
                                  }}
                                  aria-label="Müşteriyi ara"
                                >
                                  <Phone className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-muted-foreground hover:text-foreground"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    whatsappCustomer(order);
                                  }}
                                  aria-label="WhatsApp gönder"
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                                {order.email && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-foreground"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      emailCustomer(order);
                                    }}
                                    aria-label="E-posta gönder"
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={(e) => e.stopPropagation()}
                                      aria-label="Diğer işlemler"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56">
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/orders/${order.id}`);
                                      }}
                                    >
                                      <MapPin className="mr-2 h-4 w-4" />
                                      Detaylı Görünüm
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        callCustomer(order);
                                      }}
                                    >
                                      <Phone className="mr-2 h-4 w-4" />
                                      Müşteriyi Ara
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        whatsappCustomer(order);
                                      }}
                                    >
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      WhatsApp Gönder
                                    </DropdownMenuItem>
                                    {order.email && (
                                      <DropdownMenuItem
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          emailCustomer(order);
                                        }}
                                      >
                                        <Mail className="mr-2 h-4 w-4" />
                                        E-posta Gönder
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="mt-6 flex items-center justify-between gap-3">
                        <Button
                          variant="outline"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        >
                          Önceki
                        </Button>
                        <p className="text-sm text-muted-foreground tabular-nums">
                          Sayfa {currentPage} / {totalPages} • {total} sipariş
                        </p>
                        <Button
                          variant="outline"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        >
                          Sonraki
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>

            {/* Legend Modal */}
            <Dialog open={isLegendOpen} onOpenChange={setIsLegendOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Durum Kartelası</DialogTitle>
                  <DialogDescription>
                    Sipariş durumlarının anlamları. Rota modülü, dağıtım durumları ile entegredir.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ORDER_STATUS_FLOW.map((s) => (
                    <div key={s} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <OrderStatusBadge status={s} className="shrink-0" />
                      <p className="text-xs text-muted-foreground">{orderStatusInfo(s).description}</p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
