"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DeliveryRoutePlanner } from "@/components/delivery/delivery-route-planner";

interface User {
  id: string;
  email: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface DeliveryOrder {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    address: string;
    phone: string;
    whatsapp?: string;
    email?: string;
  };
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  status: "pending" | "in_route" | "delivered";
}

export default function RouteplannerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    // Ensure business field exists for Header component compatibility
    if (!parsedUser.business) {
      parsedUser.business = {
        name: parsedUser.businessName || "LaundryPro",
        businessType: parsedUser.businessType || "LAUNDRY",
      };
    }
    setUser(parsedUser);
    fetchDeliveryOrders();
  }, [router]);

  const fetchDeliveryOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/orders/delivery", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const orders = await response.json();
        setDeliveryOrders(orders);
      } else if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
      }
    } catch (error) {
      console.error("Delivery orders error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground">Yükleniyor...</span>
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="px-2 sm:px-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                🚚 Teslimat Rotası Planlayıcısı
              </h1>
              <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                Teslimat siparişlerinizi optimize edin, müşterilerle iletişim
                kurun ve en verimli rotayı planlayın
              </p>

              {/* Mobile-friendly stats */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-lg sm:text-xl font-bold text-blue-700">
                    {deliveryOrders.length}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-600">
                    Toplam Sipariş
                  </div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-lg sm:text-xl font-bold text-red-700">
                    {deliveryOrders.filter((o) => o.priority === "high").length}
                  </div>
                  <div className="text-xs sm:text-sm text-red-600">
                    Yüksek Öncelik
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-lg sm:text-xl font-bold text-green-700">
                    {deliveryOrders.reduce((sum, order) => {
                      const time = parseInt(order.estimatedTime);
                      return sum + (isNaN(time) ? 0 : time);
                    }, 0)}{" "}
                    dk
                  </div>
                  <div className="text-xs sm:text-sm text-green-600">
                    Toplam Süre
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-lg sm:text-xl font-bold text-purple-700">
                    {deliveryOrders.filter((o) => o.customer.whatsapp).length}
                  </div>
                  <div className="text-xs sm:text-sm text-purple-600">
                    WhatsApp
                  </div>
                </div>
              </div>
            </div>

            <DeliveryRoutePlanner orders={deliveryOrders} />
          </div>
        </main>
      </div>
    </div>
  );
}
