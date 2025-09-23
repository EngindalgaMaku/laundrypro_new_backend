"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { EnhancedNavigation } from "@/components/layout/enhanced-navigation";
import { businessTypes } from "@/lib/business-types";
import { Plus, ArrowRight } from "lucide-react";

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
        <main className="flex-1 overflow-y-auto bg-muted/20 custom-scrollbar">
          {/* Enhanced Navigation */}
          <div className="px-3 sm:px-4 lg:px-6 pt-4">
            <EnhancedNavigation />
          </div>
          {/* Enhanced Hero Section */}
          <div className="gradient-hero mx-3 mt-3 mb-6 sm:mx-4 sm:mt-4 sm:mb-8 lg:mx-6 lg:mt-6 rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>

            {/* Animated Background Elements */}
            <div className="absolute top-5 right-5 w-16 h-16 bg-white/10 rounded-full blur-xl animate-float"></div>
            <div
              className="absolute bottom-5 left-5 w-12 h-12 bg-white/5 rounded-full blur-lg animate-float"
              style={{ animationDelay: "1s" }}
            ></div>

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 lg:gap-8">
                <div className="flex-1 space-y-4">
                  {/* Welcome Message */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                      <span className="text-white/70 text-sm font-medium">
                        {new Date().toLocaleDateString("tr-TR", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                      Hoş geldiniz,{" "}
                      <span className="block sm:inline bg-gradient-to-r from-white to-white/90 bg-clip-text">
                        {user.business?.name || user.businessName || "İşletme"}
                      </span>
                    </h1>
                    <p className="text-white/90 text-base sm:text-lg lg:text-xl leading-relaxed max-w-2xl">
                      İşletmenizi yönetmek için gereken tüm araçlar burada.
                      Bugün nasıl başlamak istersiniz?
                    </p>
                  </div>

                  {/* Business Types */}
                  <div className="flex flex-wrap gap-2">
                    {displayBusinessTypes.map((type, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-white/20 text-white border-white/30 text-sm hover:bg-white/30 transition-all duration-200 backdrop-blur-sm"
                      >
                        ✨ {type}
                      </Badge>
                    ))}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold">
                        {stats.todayOrders}
                      </div>
                      <div className="text-white/70 text-xs sm:text-sm">
                        Bugün
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl sm:text-3xl font-bold">
                        {stats.pendingJobs}
                      </div>
                      <div className="text-white/70 text-xs sm:text-sm">
                        Bekleyen
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-center">
                      <div className="text-2xl sm:text-3xl font-bold">
                        {stats.totalCustomers}
                      </div>
                      <div className="text-white/70 text-xs sm:text-sm">
                        Müşteri
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced CTA Section */}
                <div className="flex-shrink-0 space-y-3">
                  <Button
                    onClick={() => router.push("/orders/create")}
                    size="lg"
                    className="w-full sm:w-auto bg-white text-primary hover:bg-white/95 font-bold px-6 py-3 text-base shadow-2xl backdrop-blur-sm transition-all duration-300 hover:shadow-3xl hover:scale-105 active:scale-95 rounded-xl focus-ring"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Yeni Sipariş Ekle
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/customers/create")}
                      className="flex-1 sm:flex-none text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus-ring"
                    >
                      👤 Müşteri
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/delivery/route-planner")}
                      className="flex-1 sm:flex-none text-white hover:bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl focus-ring"
                    >
                      🚚 Rota
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Content Container */}
          <div className="px-3 sm:px-4 lg:px-6 pb-6 sm:pb-8 space-y-6 sm:space-y-8">
            {/* Enhanced Stats Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  📊 Günlük Özet
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Detayları Gör
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <StatsCard
                  title="Bugünkü Siparişler"
                  value={stats.todayOrders}
                  description="Son 24 saat"
                  trend="+12%"
                  icon="📋"
                  color="primary"
                />
                <StatsCard
                  title="Bekleyen İşler"
                  value={stats.pendingJobs}
                  description="İşlemde olan"
                  trend="-2%"
                  icon="⏳"
                  color="warning"
                />
                <StatsCard
                  title="Toplam Müşteri"
                  value={stats.totalCustomers}
                  description="Kayıtlı müşteri"
                  trend="+8%"
                  icon="👥"
                  color="success"
                />
                <StatsCard
                  title="Bu Ay Sipariş"
                  value={stats.monthlyOrders}
                  description="Bu ay toplam"
                  trend="+15%"
                  icon="📈"
                  color="info"
                />
              </div>
            </section>

            {/* Enhanced Bottom Section */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
              <div className="xl:col-span-1 order-2 xl:order-1 space-y-6">
                <QuickActions />

                {/* Additional Widget - Recent Activity */}
                <div className="bg-gradient-card rounded-2xl p-6 shadow-lg border border-border/50">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    🔔 Son Aktiviteler
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        text: "Yeni sipariş alındı",
                        time: "5 dk önce",
                        color: "text-success",
                      },
                      {
                        text: "Müşteri mesajı",
                        time: "12 dk önce",
                        color: "text-warning",
                      },
                      {
                        text: "Sipariş tamamlandı",
                        time: "28 dk önce",
                        color: "text-primary",
                      },
                    ].map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                      >
                        <span className="text-sm text-foreground">
                          {activity.text}
                        </span>
                        <span
                          className={`text-xs ${activity.color} font-medium`}
                        >
                          {activity.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-2 order-1 xl:order-2">
                <RecentOrders />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
