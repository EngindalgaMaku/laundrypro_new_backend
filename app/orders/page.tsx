"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/layout/page-header";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ORDER_GROUPS, groupForStatusList, nextStep, orderStatusLabel, statusPath, TONE_CLASSES } from "@/lib/order-status";
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
  Check,
  Loader2,
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
  district?: string;
  orderInfo?: string | null;
  remainingAmount?: number;
  items?: Array<{ serviceName?: string; quantity: number }>;
  customerId: string;
}

// Filter chips: the stages of the field work, not the nine raw statuses
const STATUS_FILTERS: Array<{ value: string; label: string; statuses: string[] }> = [
  { value: "ALL", label: "Tümü", statuses: [] },
  { value: ORDER_GROUPS.pickup.statuses.join(","), label: "Alınacak", statuses: [...ORDER_GROUPS.pickup.statuses] },
  { value: "IN_PROGRESS", label: "Yıkamada", statuses: ["IN_PROGRESS"] },
  { value: "READY_FOR_DELIVERY,OUT_FOR_DELIVERY", label: "Dağıtılacak", statuses: ["READY_FOR_DELIVERY", "OUT_FOR_DELIVERY"] },
  { value: "DELIVERED,COMPLETED", label: "Biten", statuses: ["DELIVERED", "COMPLETED"] },
  { value: "CANCELLED", label: "İptal", statuses: ["CANCELLED"] },
];

/** What the order is, in the shop's words: "2 halı" rather than "1 hizmet" */
function orderSummary(order: Order) {
  if (order.orderInfo) return order.orderInfo;
  const items = (order.items || []).filter((i) => i.serviceName);
  if (items.length) return items.map((i) => (i.quantity > 1 ? `${i.quantity} × ${i.serviceName}` : i.serviceName)).join(", ");
  return order.service || "";
}

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
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "URGENT" | "HIGH" | "URGENT,HIGH">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Counts across all orders (the list itself is filtered and paginated)
  const [statusTotals, setStatusTotals] = useState<{ total: number; byStatus: Record<string, number> } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const router = useRouter();

  const limit = 20;

  useEffect(() => {
    // Load last used status filter or URL search params
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSearch = urlParams.get("search");
      const urlStatus = urlParams.get("status");
      if (urlSearch) {
        setSearchQuery(urlSearch);
      }
      // Links from the home board (e.g. Veresiye, Acil)
      const urlPayment = urlParams.get("paymentStatus");
      if (urlPayment === "UNPAID" || urlPayment === "PAID") setPaymentFilter(urlPayment);
      const urlPriority = urlParams.get("priority");
      if (urlPriority === "URGENT" || urlPriority === "HIGH" || urlPriority === "URGENT,HIGH") {
        setPriorityFilter(urlPriority);
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
      setOrders((prev) => (currentPage > 1 ? [...prev, ...(data.orders || [])] : data.orders || []));
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

  /** The card's quick button: moves the order one stage on (through any steps in between) */
  const advanceOrder = async (order: Order) => {
    const step = nextStep(order.status);
    if (!step) return;
    setAdvancing(order.id);
    try {
      const token = localStorage.getItem("token");
      for (const status of statusPath(order.status, step.target)) {
        const response = await fetch(`/api/orders/${order.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status, notes: "Sipariş listesinden" }),
        });
        if (!response.ok) throw new Error();
      }
      const target = step.target as Order["status"];
      const stillShown =
        activeTab === "ALL" || activeTab.split(",").includes(target);
      setOrders((prev) =>
        stillShown ? prev.map((o) => (o.id === order.id ? { ...o, status: target } : o)) : prev.filter((o) => o.id !== order.id)
      );
      if (!stillShown) setTotal((t) => Math.max(0, t - 1));
      setStatusTotals((prev) =>
        prev
          ? {
              ...prev,
              byStatus: {
                ...prev.byStatus,
                [order.status]: Math.max(0, (prev.byStatus[order.status] || 0) - 1),
                [target]: (prev.byStatus[target] || 0) + 1,
              },
            }
          : prev
      );
      toast.success(`${order.customer}: ${orderStatusLabel(target)}`, {
        action: order.whatsapp
          ? {
              label: "WhatsApp",
              onClick: () =>
                sendWhatsAppMessage(
                  order.whatsapp,
                  `Merhaba ${order.customer}, ${order.orderNumber || ""} numaralı siparişinizin durumu "${orderStatusLabel(target)}" olarak güncellendi.`
                ),
            }
          : undefined,
      });
    } catch {
      toast.error("Sipariş güncellenemedi");
      fetchOrders();
    } finally {
      setAdvancing(null);
    }
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

            {/* A home-board group (several statuses) has no chip of its own */}
            {activeTab !== "ALL" && !STATUS_FILTERS.some((f) => f.value === activeTab) && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {(() => {
                    const group = groupForStatusList(activeTab);
                    return group ? ORDER_GROUPS[group].label : activeTab.split(",").map(orderStatusLabel).join(", ");
                  })()}
                  <span className="ml-2 font-normal text-muted-foreground">{total} sipariş</span>
                </p>
                <Button variant="ghost" size="sm" onClick={() => handleTabChange("ALL")}>
                  Tümünü göster
                </Button>
              </div>
            )}

            {/* Stage filter: wraps onto two rows on phones, nothing to scroll sideways */}
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap" role="tablist" aria-label="Sipariş aşaması">
              {STATUS_FILTERS.map(({ value, label, statuses }) => {
                const isActive = activeTab === value;
                const count =
                  value === "ALL" ? allOrdersTotal : statuses.reduce((sum, st) => sum + (statusCounts[st] || 0), 0);
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabChange(value)}
                    className={`flex h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {label}
                    <span
                      className={`min-w-5 rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                        isActive ? "bg-white/20" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div>

                {loading && currentPage === 1 ? (
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
                        const summary = orderSummary(order);
                        const step = nextStep(order.status);
                        const remaining = order.remainingAmount ?? 0;

                        return (
                          <div
                            key={order.id}
                            className="cursor-pointer rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-foreground">{order.customer}</p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {[order.district, new Date(order.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </p>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1">
                                <OrderStatusBadge status={order.status} />
                                {showPriority && (
                                  <span className={`text-xs font-semibold ${priorityConfig.color}`}>
                                    {priorityConfig.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            {summary && <p className="mt-2 line-clamp-2 text-sm text-foreground">{summary}</p>}

                            <div className="mt-2 flex items-baseline gap-2">
                              <span className="font-bold tabular-nums text-foreground">{order.amount}</span>
                              {remaining > 0 && (
                                <span className={`text-xs font-medium ${TONE_CLASSES.danger.text}`}>
                                  {`₺${remaining.toLocaleString("tr-TR")}`} kalan
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                              {step ? (
                                <Button
                                  size="sm"
                                  className="h-9"
                                  disabled={advancing === order.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    advanceOrder(order);
                                  }}
                                >
                                  {advancing === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                  {step.label}
                                </Button>
                              ) : (
                                <span className="font-mono text-xs text-muted-foreground">{order.orderNumber}</span>
                              )}
                              <div className="flex items-center gap-0.5">
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

                    {currentPage < totalPages && (
                      <Button variant="outline" className="mt-4 w-full" onClick={() => setCurrentPage(currentPage + 1)}>
                        Daha fazla göster ({total - orders.length} sipariş daha)
                      </Button>
                    )}
                  </>
                )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
