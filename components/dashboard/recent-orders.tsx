"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Clock, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  orderItems: Array<{
    service: {
      name: string;
    };
  }>;
  status: string;
  totalAmount: number;
  createdAt: string;
}

const statusLabels: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    color: string;
    icon: string;
  }
> = {
  pending: {
    label: "Beklemede",
    variant: "outline",
    color: "text-orange-600 bg-orange-50 border-orange-200",
    icon: "⏳",
  },
  confirmed: {
    label: "Onaylandı",
    variant: "default",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: "✔️",
  },
  in_progress: {
    label: "İşlemde",
    variant: "default",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    icon: "🔄",
  },
  ready_for_pickup: {
    label: "Teslim Hazır",
    variant: "secondary",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: "✅",
  },
  delivered: {
    label: "Teslim Edildi",
    variant: "secondary",
    color: "text-cyan-600 bg-cyan-50 border-cyan-200",
    icon: "📦",
  },
  completed: {
    label: "Tamamlandı",
    variant: "secondary",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    icon: "🎉",
  },
  cancelled: {
    label: "İptal",
    variant: "destructive",
    color: "text-red-600 bg-red-50 border-red-200",
    icon: "❌",
  },
};

export function RecentOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  const fetchRecentOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/orders/recent", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const ordersData = await response.json();
        setOrders(ordersData);
      }
    } catch (error) {
      console.error("Fetch recent orders error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/orders/${orderId}`);
  };

  const handleViewAll = () => {
    router.push("/orders");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("tr-TR"),
      time: date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getMainService = (orderItems: Order["orderItems"]) => {
    if (orderItems.length === 0) return "Hizmet yok";
    if (orderItems.length === 1) return orderItems[0].service.name;
    return `${orderItems[0].service.name} ve ${orderItems.length - 1} diğer`;
  };

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50 overflow-hidden">
      <CardHeader className="pb-4 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              Son Siparişler
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              En son eklenen siparişler
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAll}
            className="w-full sm:w-auto touch-manipulation transition-all hover:scale-105 active:scale-95"
          >
            <Eye className="w-4 h-4 mr-2" />
            <span className="sm:hidden">Tüm Siparişleri Görüntüle</span>
            <span className="hidden sm:inline">Tümünü Gör</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-0 sm:px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">
                Siparişler yükleniyor...
              </span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Henüz sipariş bulunmuyor
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => router.push("/orders/create")}
              >
                İlk Siparişi Oluştur
              </Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-auto max-h-[400px] sm:max-h-[500px]">
            <div className="space-y-2 sm:space-y-3 px-6 sm:px-0">
              {orders.map((order) => {
                const status =
                  statusLabels[order.status] || statusLabels.pending;
                const { date, time } = formatDate(order.createdAt);
                const mainService = getMainService(order.orderItems);

                return (
                  <div
                    key={order.id}
                    onClick={() => handleOrderClick(order.id)}
                    className="flex items-center justify-between p-4 sm:p-5 border border-border/50 rounded-xl hover:bg-muted/50 hover:border-border transition-all duration-300 cursor-pointer touch-manipulation group hover:shadow-md active:scale-[0.98]"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <span className="font-semibold text-sm sm:text-base text-foreground">
                          {order.orderNumber}
                        </span>
                        <Badge
                          className={`${status.color} text-xs font-medium border w-fit`}
                        >
                          <span className="mr-1">{status.icon}</span>
                          {status.label}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground truncate">
                          {order.customer.firstName} {order.customer.lastName}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {mainService}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{date}</span>
                          <span>•</span>
                          <span>{time}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-base sm:text-lg text-foreground">
                          {formatCurrency(order.totalAmount)}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-200" />
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Show more button for mobile */}
        <div className="mt-4 sm:hidden px-6">
          <Button
            variant="ghost"
            className="w-full py-3 text-sm font-medium touch-manipulation"
            onClick={handleViewAll}
          >
            Daha fazla sipariş göster
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
