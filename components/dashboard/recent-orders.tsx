"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Clock } from "lucide-react";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { useRouter } from "next/navigation";

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  orderItems: Array<{
    serviceName?: string | null;
    service?: {
      name: string;
    } | null;
  }>;
  status: string;
  totalAmount: number;
  createdAt: string;
}

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

  // Manual order items have no catalogue service, only a name
  const getMainService = (orderItems: Order["orderItems"] = []) => {
    if (orderItems.length === 0) return null;
    const first = orderItems[0].serviceName || orderItems[0].service?.name || "Hizmet";
    return orderItems.length === 1 ? first : `${first} ve ${orderItems.length - 1} diğer`;
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Son Siparişler</h2>
        <Button variant="ghost" size="sm" onClick={handleViewAll} className="text-primary">
          Tümünü Gör
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">Siparişler yükleniyor...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Henüz sipariş bulunmuyor</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push("/orders/create")}>
              İlk Siparişi Oluştur
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => {
              const { date, time } = formatDate(order.createdAt);
              const mainService = getMainService(order.orderItems);

              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => handleOrderClick(order.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {order.customer.firstName} {order.customer.lastName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[order.orderNumber, mainService, `${date} ${time}`].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(Number(order.totalAmount))}
                      </span>
                      <OrderStatusBadge status={String(order.status).toUpperCase()} />
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
