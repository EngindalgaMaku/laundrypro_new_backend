"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  Filter,
  Download,
  Shirt,
  Sofa,
  Waves,
  Sparkles,
  X,
  Clock,
  CheckCircle,
  Truck,
  Package,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  MoreHorizontal,
  Calendar,
  CreditCard,
  User,
  Star,
  TrendingUp,
  Zap,
  Target,
  Info,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const getServiceIcon = (serviceType: string) => {
  switch (serviceType) {
    case "dry_cleaning":
      return <Shirt className="h-5 w-5" />;
    case "laundry":
      return <Waves className="h-5 w-5" />;
    case "carpet_cleaning":
      return <Sparkles className="h-5 w-5" />;
    case "curtain_cleaning":
      return <Sparkles className="h-5 w-5" />;
    case "furniture_cleaning":
      return <Sofa className="h-5 w-5" />;
    default:
      return <Package className="h-5 w-5" />;
  }
};

const getServiceColor = (serviceType: string) => {
  switch (serviceType) {
    case "dry_cleaning":
      return "from-blue-500/20 to-indigo-500/20 border-blue-200";
    case "laundry":
      return "from-cyan-500/20 to-teal-500/20 border-cyan-200";
    case "carpet_cleaning":
      return "from-purple-500/20 to-pink-500/20 border-purple-200";
    case "curtain_cleaning":
      return "from-emerald-500/20 to-green-500/20 border-emerald-200";
    case "furniture_cleaning":
      return "from-orange-500/20 to-red-500/20 border-orange-200";
    default:
      return "from-gray-500/20 to-slate-500/20 border-gray-200";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING":
      return <Clock className="h-4 w-4" />;
    case "CONFIRMED":
      return <CheckCircle className="h-4 w-4" />;
    case "IN_PROGRESS":
      return <Sparkles className="h-4 w-4" />;
    case "READY_FOR_PICKUP":
      return <Package className="h-4 w-4" />;
    case "READY_FOR_DELIVERY":
      return <Truck className="h-4 w-4" />;
    case "OUT_FOR_DELIVERY":
      return <Truck className="h-4 w-4" />;
    case "DELIVERED":
      return <CheckCircle className="h-4 w-4" />;
    case "COMPLETED":
      return <CheckCircle className="h-4 w-4" />;
    case "CANCELLED":
      return <X className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const statusLabels: Record<
  string,
  {
    label: string;
    color: string;
    bgColor: string;
  }
> = {
  PENDING: {
    label: "Beklemede",
    color: "text-amber-700",
    bgColor: "bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200",
  },
  CONFIRMED: {
    label: "Onaylandı",
    color: "text-blue-700",
    bgColor: "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-200",
  },
  IN_PROGRESS: {
    label: "İşlemde",
    color: "text-purple-700",
    bgColor: "bg-gradient-to-r from-purple-100 to-purple-50 border-purple-200",
  },
  READY_FOR_PICKUP: {
    label: "Alınmaya Hazır",
    color: "text-green-700",
    bgColor: "bg-gradient-to-r from-green-100 to-green-50 border-green-200",
  },
  READY_FOR_DELIVERY: {
    label: "Dağıtıma Hazır",
    color: "text-cyan-700",
    bgColor: "bg-gradient-to-r from-cyan-100 to-cyan-50 border-cyan-200",
  },
  OUT_FOR_DELIVERY: {
    label: "Dağıtımda",
    color: "text-indigo-700",
    bgColor: "bg-gradient-to-r from-indigo-100 to-indigo-50 border-indigo-200",
  },
  DELIVERED: {
    label: "Teslim Edildi",
    color: "text-emerald-700",
    bgColor:
      "bg-gradient-to-r from-emerald-100 to-emerald-50 border-emerald-200",
  },
  COMPLETED: {
    label: "Tamamlandı",
    color: "text-green-700",
    bgColor: "bg-gradient-to-r from-green-100 to-green-50 border-green-200",
  },
  CANCELLED: {
    label: "İptal",
    color: "text-red-700",
    bgColor: "bg-gradient-to-r from-red-100 to-red-50 border-red-200",
  },
};

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return {
        color: "text-red-700",
        bgColor: "bg-gradient-to-r from-red-100 to-red-50 border-red-300",
        icon: <Zap className="h-3 w-3" />,
        label: "ACIL",
      };
    case "HIGH":
      return {
        color: "text-orange-700",
        bgColor:
          "bg-gradient-to-r from-orange-100 to-orange-50 border-orange-300",
        icon: <TrendingUp className="h-3 w-3" />,
        label: "YÜKSEK",
      };
    case "NORMAL":
      return {
        color: "text-blue-700",
        bgColor: "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300",
        icon: <Target className="h-3 w-3" />,
        label: "NORMAL",
      };
    case "LOW":
      return {
        color: "text-gray-700",
        bgColor: "bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300",
        icon: <Target className="h-3 w-3" />,
        label: "DÜŞÜK",
      };
    default:
      return {
        color: "text-blue-700",
        bgColor: "bg-gradient-to-r from-blue-100 to-blue-50 border-blue-300",
        icon: <Target className="h-3 w-3" />,
        label: "NORMAL",
      };
  }
};

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
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
    // Load last used status filter (fallback to PENDING)
    try {
      const savedStatus = localStorage.getItem("ordersActiveStatus");
      if (savedStatus) {
        setActiveTab(savedStatus);
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
  }, [user, currentPage, activeTab, searchQuery]);

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
      order.id,
      statusLabels[order.status]?.label || order.status
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

    const subject = `Sipariş Durumu - ${order.id}`;
    const body = communicationTemplates.orderUpdate.email.body(
      order.customer,
      order.id,
      statusLabels[order.status]?.label || order.status
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

  // Calculate status counts
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Premium Header */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl -m-2"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Siparişler
                        </h1>
                        <p className="text-gray-600 font-medium">
                          Toplam {total} sipariş •{" "}
                          {activeTab === "ALL"
                            ? total
                            : statusCounts[activeTab] || 0}{" "}
                          görüntüleniyor
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push("/orders/create")}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full lg:w-auto"
                  >
                    <Sparkles className="h-5 w-5 mr-2" />
                    Yeni Sipariş
                  </Button>
                </div>
              </div>
            </div>

            {/* Premium Search and Filters */}
            <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="relative flex-1 w-full lg:max-w-md">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    className="pl-12 h-12 border-gray-200 rounded-xl bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    placeholder="Sipariş no, müşteri adı ara..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 w-full lg:w-auto">
                  <Button
                    variant="outline"
                    className="flex-1 lg:flex-initial h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    <Filter className="h-5 w-5 mr-2" />
                    Filtrele
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 lg:flex-initial h-12 rounded-xl border-gray-200 hover:bg-gray-50"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Dışa Aktar
                  </Button>
                </div>
              </div>
            </div>

            {/* Ultra Premium Status Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <div className="bg-white/90 backdrop-blur-sm border border-white/50 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600 font-medium">Durum Filtresi</div>
                  <Button
                    variant="ghost"
                    className="h-8 px-2 text-gray-700 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => setIsLegendOpen(true)}
                  >
                    <Info className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Kartela</span>
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <TabsList className="flex w-max min-w-full gap-2 bg-gradient-to-r from-slate-100 to-gray-100 p-2 rounded-xl">
                    {/* ALL TAB */}
                    <TabsTrigger
                      value="ALL"
                      className={`rounded-xl px-4 py-3 font-bold text-sm transition-all duration-300 ${
                        activeTab === "ALL"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:scale-105 shadow-md border border-blue-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>Tümü</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "ALL"
                              ? "bg-white/20 text-white"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {total}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* PENDING */}
                    <TabsTrigger
                      value="PENDING"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "PENDING"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-amber-50 hover:text-amber-700 hover:scale-105 shadow-md border border-amber-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="hidden sm:inline">Beklemede</span>
                        <span className="sm:hidden">B</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "PENDING"
                              ? "bg-white/20 text-white"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {statusCounts.PENDING || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* CONFIRMED */}
                    <TabsTrigger
                      value="CONFIRMED"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "CONFIRMED"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-green-50 hover:text-green-700 hover:scale-105 shadow-md border border-green-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Onaylandı</span>
                        <span className="sm:hidden">O</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "CONFIRMED"
                              ? "bg-white/20 text-white"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {statusCounts.CONFIRMED || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* READY_FOR_PICKUP */}
                    <TabsTrigger
                      value="READY_FOR_PICKUP"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "READY_FOR_PICKUP"
                          ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 hover:scale-105 shadow-md border border-cyan-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span className="hidden lg:inline">Alınmaya Hazır</span>
                        <span className="lg:hidden hidden sm:inline">
                          Hazır
                        </span>
                        <span className="sm:hidden">A</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "READY_FOR_PICKUP"
                              ? "bg-white/20 text-white"
                              : "bg-cyan-100 text-cyan-700"
                          }`}
                        >
                          {statusCounts.READY_FOR_PICKUP || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* IN_PROGRESS */}
                    <TabsTrigger
                      value="IN_PROGRESS"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "IN_PROGRESS"
                          ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-purple-50 hover:text-purple-700 hover:scale-105 shadow-md border border-purple-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="hidden sm:inline">İşlemde</span>
                        <span className="sm:hidden">İ</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "IN_PROGRESS"
                              ? "bg-white/20 text-white"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {statusCounts.IN_PROGRESS || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* READY_FOR_DELIVERY */}
                    <TabsTrigger
                      value="READY_FOR_DELIVERY"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "READY_FOR_DELIVERY"
                          ? "bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 hover:scale-105 shadow-md border border-indigo-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="hidden lg:inline">Dağıtıma Hazır</span>
                        <span className="lg:hidden hidden sm:inline">
                          Dağıt.
                        </span>
                        <span className="sm:hidden">D</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "READY_FOR_DELIVERY"
                              ? "bg-white/20 text-white"
                              : "bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {statusCounts.READY_FOR_DELIVERY || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* OUT_FOR_DELIVERY */}
                    <TabsTrigger
                      value="OUT_FOR_DELIVERY"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "OUT_FOR_DELIVERY"
                          ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-rose-50 hover:text-rose-700 hover:scale-105 shadow-md border border-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        <span className="hidden sm:inline">Dağıtımda</span>
                        <span className="sm:hidden">Y</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "OUT_FOR_DELIVERY"
                              ? "bg-white/20 text-white"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {statusCounts.OUT_FOR_DELIVERY || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* DELIVERED */}
                    <TabsTrigger
                      value="DELIVERED"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "DELIVERED"
                          ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 hover:scale-105 shadow-md border border-emerald-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Teslim Edildi</span>
                        <span className="sm:hidden">T</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "DELIVERED"
                              ? "bg-white/20 text-white"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {statusCounts.DELIVERED || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>

                    {/* CANCELLED */}
                    <TabsTrigger
                      value="CANCELLED"
                      className={`rounded-xl px-3 py-2 font-bold text-sm transition-all duration-300 ${
                        activeTab === "CANCELLED"
                          ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 transform scale-105"
                          : "bg-white/80 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:scale-105 shadow-md border border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        <span className="hidden sm:inline">İptal</span>
                        <span className="sm:hidden">İ</span>
                        <Badge
                          className={`text-xs font-bold ${
                            activeTab === "CANCELLED"
                              ? "bg-white/20 text-white"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {statusCounts.CANCELLED || 0}
                        </Badge>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              <TabsContent value={activeTab} className="mt-6">
                {loading ? (
                  <div className="flex justify-center py-20">
                    <div className="text-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500/20 border-t-blue-500 mx-auto"></div>
                      <p className="text-gray-500 font-medium">
                        Siparişler yükleniyor...
                      </p>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-12 shadow-xl text-center">
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl w-fit mx-auto">
                        <Sparkles className="h-12 w-12 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Sipariş bulunamadı
                        </h3>
                        <p className="text-gray-600">
                          Arama kriterlerinize uygun sipariş bulunmuyor.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Premium Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {orders.map((order) => {
                        const statusConfig = statusLabels[order.status];
                        const priorityConfig = getPriorityConfig(
                          order.priority
                        );
                        const serviceColor = getServiceColor(order.serviceType);

                        return (
                          <div
                            key={order.id}
                            className="group relative bg-white/90 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] cursor-pointer"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            {/* Premium Gradient Background */}
                            <div
                              className={`absolute inset-0 bg-gradient-to-br ${serviceColor} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}
                            ></div>

                            {/* Content */}
                            <div className="relative z-10">
                              {/* Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-3 bg-gradient-to-br ${serviceColor} rounded-xl shadow-lg`}
                                  >
                                    {getServiceIcon(order.serviceType)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 text-lg">
                                      #{order.id}
                                    </p>
                                    <p className="text-sm text-gray-600 font-medium">
                                      {new Date(order.date).toLocaleDateString(
                                        "tr-TR"
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  <Badge
                                    className={`${priorityConfig.bgColor} ${priorityConfig.color} border font-semibold px-3 py-1 text-xs`}
                                  >
                                    <div className="flex items-center gap-1">
                                      {priorityConfig.icon}
                                      {priorityConfig.label}
                                    </div>
                                  </Badge>
                                  <Badge
                                    className={`${statusConfig.bgColor} ${statusConfig.color} border font-semibold px-3 py-1`}
                                  >
                                    <div className="flex items-center gap-1">
                                      {getStatusIcon(order.status)}
                                      {statusConfig.label}
                                    </div>
                                  </Badge>
                                </div>
                              </div>

                              {/* Customer Info */}
                              <div className="space-y-3 mb-4">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-500" />
                                  <p className="font-semibold text-gray-900">
                                    {order.customer}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-gray-500" />
                                  <p className="text-gray-700 font-medium">
                                    {order.service}
                                  </p>
                                </div>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                                  {order.description}
                                </p>
                              </div>

                              {/* Amount */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-gray-500" />
                                  <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                    {order.amount}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-yellow-500">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className="h-3 w-3 fill-current"
                                    />
                                  ))}
                                </div>
                              </div>

                              {/* Communication Buttons */}
                              <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 w-10 p-0 rounded-xl border-2 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all duration-300 hover:scale-110"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      callCustomer(order);
                                    }}
                                    title="Ara"
                                  >
                                    <Phone className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 w-10 p-0 rounded-xl border-2 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300 hover:scale-110"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      whatsappCustomer(order);
                                    }}
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                  {order.email && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-10 w-10 p-0 rounded-xl border-2 border-orange-200 hover:bg-orange-50 hover:border-orange-300 transition-all duration-300 hover:scale-110"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        emailCustomer(order);
                                      }}
                                      title="E-posta"
                                    >
                                      <Mail className="h-4 w-4 text-orange-600" />
                                    </Button>
                                  )}
                                </div>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="h-10 w-10 p-0 rounded-xl hover:bg-gray-100"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="end"
                                    className="w-56"
                                  >
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

                    {/* Premium Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-xl">
                        <Pagination>
                          <PaginationContent className="gap-2">
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  setCurrentPage(Math.max(1, currentPage - 1))
                                }
                                className={`${
                                  currentPage === 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer hover:bg-blue-50 hover:text-blue-600"
                                } rounded-xl border border-gray-200`}
                              />
                            </PaginationItem>

                            {Array.from(
                              { length: Math.min(5, totalPages) },
                              (_, i) => {
                                const page = i + 1;
                                return (
                                  <PaginationItem key={page}>
                                    <PaginationLink
                                      onClick={() => setCurrentPage(page)}
                                      isActive={currentPage === page}
                                      className={`cursor-pointer rounded-xl border ${
                                        currentPage === page
                                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent"
                                          : "border-gray-200 hover:bg-gray-50"
                                      }`}
                                    >
                                      {page}
                                    </PaginationLink>
                                  </PaginationItem>
                                );
                              }
                            )}

                            {totalPages > 5 && (
                              <>
                                <PaginationItem>
                                  <PaginationEllipsis />
                                </PaginationItem>
                                <PaginationItem>
                                  <PaginationLink
                                    onClick={() => setCurrentPage(totalPages)}
                                    isActive={currentPage === totalPages}
                                    className={`cursor-pointer rounded-xl border ${
                                      currentPage === totalPages
                                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white border-transparent"
                                        : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                  >
                                    {totalPages}
                                  </PaginationLink>
                                </PaginationItem>
                              </>
                            )}

                            <PaginationItem>
                              <PaginationNext
                                onClick={() =>
                                  setCurrentPage(
                                    Math.min(totalPages, currentPage + 1)
                                  )
                                }
                                className={`${
                                  currentPage === totalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer hover:bg-blue-50 hover:text-blue-600"
                                } rounded-xl border border-gray-200`}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>

                        <div className="text-center mt-4">
                          <p className="text-gray-600 font-medium">
                            Sayfa{" "}
                            <span className="font-bold text-blue-600">
                              {currentPage}
                            </span>{" "}
                            / <span className="font-bold">{totalPages}</span>
                            <span className="mx-2">•</span>
                            Toplam{" "}
                            <span className="font-bold text-blue-600">
                              {total}
                            </span>{" "}
                            sipariş
                          </p>
                        </div>
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
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      "PENDING",
                      "CONFIRMED",
                      "READY_FOR_PICKUP",
                      "IN_PROGRESS",
                      "READY_FOR_DELIVERY",
                      "OUT_FOR_DELIVERY",
                      "DELIVERED",
                      "COMPLETED",
                      "CANCELLED",
                    ].map((s) => (
                      <div key={s} className={`flex items-center gap-3 p-3 rounded-xl border ${statusLabels[s]?.bgColor || "bg-gray-50 border-gray-200"}`}>
                        <div className="shrink-0">
                          {getStatusIcon(s)}
                        </div>
                        <div>
                          <div className={`font-semibold ${statusLabels[s]?.color || "text-gray-700"}`}>
                            {statusLabels[s]?.label || s}
                          </div>
                          <div className="text-xs text-gray-600">
                            {s === "PENDING" && "Yeni oluşturulan veya onay bekleyen siparişler."}
                            {s === "CONFIRMED" && "Onaylanan, işleme alınmaya hazır siparişler."}
                            {s === "IN_PROGRESS" && "Temizlik/işlem aşamasındaki siparişler."}
                            {s === "READY_FOR_PICKUP" && "Müşteriden alınmaya hazır (pickup planlanacak)."}
                            {s === "READY_FOR_DELIVERY" && "Teslimata hazır; rota planlamasına dahil edilebilir."}
                            {s === "OUT_FOR_DELIVERY" && "Aktif dağıtımda; kurye üzerinde."}
                            {s === "DELIVERED" && "Müşteriye teslim edildi."}
                            {s === "COMPLETED" && "Muhasebesi kapanmış/tamamen tamamlanmış."}
                            {s === "CANCELLED" && "İptal edilen siparişler."}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
