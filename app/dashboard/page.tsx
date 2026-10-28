"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { businessTypes } from "@/lib/business-types";
import { CalendarDays, ClipboardList, Clock, Plus, Users } from "lucide-react";

interface User {
  id: string;
  email: string;
  business: {
    name: string;
    businessType: string;
  };
  businessTypes?: string[];
  businessType?: string;
  businessName?: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingJobs: 0,
    totalCustomers: 0,
    monthlyOrders: 0,
    monthlyRevenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    fetchDashboardStats();
  }, [router]);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/");
        return;
      }

      const response = await fetch("/api/dashboard/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const dashboardStats = await response.json();
        setStats(dashboardStats);
      } else if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
      }
    } catch (error) {
      console.error("Dashboard stats error:", error);
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

  const getUserBusinessTypes = () => {
    const userTypes =
      user.businessTypes ||
      (user.business?.businessType ? [user.business.businessType] : []) ||
      (user.businessType ? [user.businessType] : []);
    return userTypes.map((type) => {
      const businessType = businessTypes.find((bt) => bt.value === type);
      return businessType ? businessType.label : type;
    });
  };

  const displayBusinessTypes = getUserBusinessTypes();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            {/* Welcome: the one brand-coloured surface on the screen, with the primary action */}
            <section className="rounded-xl bg-primary p-5 text-primary-foreground sm:p-6">
              <p className="text-sm text-white/75">
                {new Date().toLocaleDateString("tr-TR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <h1 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">
                Hoş geldiniz, {user.business?.name || user.businessName || "İşletme"}
              </h1>
              {displayBusinessTypes.length > 0 && (
                <p className="mt-1 text-sm text-white/75">{displayBusinessTypes.join(" • ")}</p>
              )}
              <Button
                onClick={() => router.push("/orders/create")}
                className="mt-4 w-full bg-white text-primary hover:bg-white/90 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Yeni Sipariş Ekle
              </Button>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Günlük Özet</h2>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatsCard title="Bugün" value={stats.todayOrders} description="Bugünkü siparişler" icon={ClipboardList} />
                <StatsCard title="Bekleyen" value={stats.pendingJobs} description="İşlemde olan" icon={Clock} />
                <StatsCard title="Müşteriler" value={stats.totalCustomers} description="Kayıtlı müşteri" icon={Users} />
                <StatsCard title="Bu Ay" value={stats.monthlyOrders} description="Bu ayki siparişler" icon={CalendarDays} />
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <RecentOrders />
              </div>
              <div>
                <QuickActions />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
