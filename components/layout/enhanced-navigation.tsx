"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Home,
  Package,
  Users,
  Settings,
  ClipboardList,
  UserCog,
  Bell,
  Route,
  DollarSign,
  Plus,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface EnhancedNavigationProps {
  className?: string;
}

const navigationMap: Record<string, NavigationItem[]> = {
  "/dashboard": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
  ],
  "/orders": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Siparişler",
      href: "/orders",
      icon: <Package className="w-4 h-4" />,
    },
  ],
  "/orders/create": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Siparişler",
      href: "/orders",
      icon: <Package className="w-4 h-4" />,
    },
    {
      label: "Yeni Sipariş",
      href: "/orders/create",
      icon: <Plus className="w-4 h-4" />,
    },
  ],
  "/customers": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Müşteriler",
      href: "/customers",
      icon: <Users className="w-4 h-4" />,
    },
  ],
  "/customers/create": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Müşteriler",
      href: "/customers",
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: "Yeni Müşteri",
      href: "/customers/create",
      icon: <Plus className="w-4 h-4" />,
    },
  ],
  "/services": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Hizmetler",
      href: "/services",
      icon: <DollarSign className="w-4 h-4" />,
    },
  ],
  "/routes": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Rota Planlama",
      href: "/routes",
      icon: <Route className="w-4 h-4" />,
    },
  ],
  "/delivery/route-planner": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Teslimat",
      href: "/delivery",
      icon: <Route className="w-4 h-4" />,
    },
    {
      label: "Rota Planlayıcı",
      href: "/delivery/route-planner",
      icon: <Route className="w-4 h-4" />,
    },
  ],
  "/notifications/templates": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Bildirimler",
      href: "/notifications",
      icon: <Bell className="w-4 h-4" />,
    },
    {
      label: "Şablonlar",
      href: "/notifications/templates",
      icon: <Bell className="w-4 h-4" />,
    },
  ],
  "/users": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Kullanıcı Yönetimi",
      href: "/users",
      icon: <UserCog className="w-4 h-4" />,
    },
  ],
  "/settings": [
    {
      label: "Ana Sayfa",
      href: "/dashboard",
      icon: <Home className="w-4 h-4" />,
    },
    {
      label: "Ayarlar",
      href: "/settings",
      icon: <Settings className="w-4 h-4" />,
    },
  ],
};

export function EnhancedNavigation({ className }: EnhancedNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Dynamic path matching for order and customer details
  const getNavigationItems = (): NavigationItem[] => {
    // Check for dynamic routes
    if (pathname.startsWith("/orders/") && pathname !== "/orders/create") {
      const orderId = pathname.split("/")[2];
      return [
        {
          label: "Ana Sayfa",
          href: "/dashboard",
          icon: <Home className="w-4 h-4" />,
        },
        {
          label: "Siparişler",
          href: "/orders",
          icon: <Package className="w-4 h-4" />,
        },
        {
          label: `Sipariş #${orderId}`,
          href: pathname,
          icon: <ClipboardList className="w-4 h-4" />,
        },
      ];
    }

    if (
      pathname.startsWith("/customers/") &&
      pathname !== "/customers/create"
    ) {
      const customerId = pathname.split("/")[2];
      return [
        {
          label: "Ana Sayfa",
          href: "/dashboard",
          icon: <Home className="w-4 h-4" />,
        },
        {
          label: "Müşteriler",
          href: "/customers",
          icon: <Users className="w-4 h-4" />,
        },
        {
          label: `Müşteri Detayı`,
          href: pathname,
          icon: <Users className="w-4 h-4" />,
        },
      ];
    }

    // Return exact match or default
    return (
      navigationMap[pathname] || [
        {
          label: "Ana Sayfa",
          href: "/dashboard",
          icon: <Home className="w-4 h-4" />,
        },
      ]
    );
  };

  const navigationItems = getNavigationItems();
  const currentPage = navigationItems[navigationItems.length - 1];
  const breadcrumbItems = navigationItems.slice(0, -1);

  const canGoBack = navigationItems.length > 1;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 px-4 sm:px-6 bg-gradient-card rounded-2xl shadow-lg border border-border/50 mb-6",
        className
      )}
    >
      {/* Left Section - Breadcrumb and Current Page */}
      <div className="flex-1 min-w-0">
        {/* Back Button - Mobile Only */}
        {canGoBack && (
          <div className="flex sm:hidden mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="touch-target p-0 h-10 w-10 rounded-xl hover:bg-muted/80 focus-ring"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Geri Git</span>
            </Button>
          </div>
        )}

        {/* Breadcrumb - Desktop */}
        {breadcrumbItems.length > 0 && (
          <div className="hidden sm:block mb-2">
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbItems.map((item, index) => (
                  <div key={item.href} className="flex items-center">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href={item.href}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(item.href);
                        }}
                        className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer"
                      >
                        {item.icon}
                        <span className="hidden md:inline">{item.label}</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {index < breadcrumbItems.length - 1 && (
                      <BreadcrumbSeparator />
                    )}
                  </div>
                ))}
                {breadcrumbItems.length > 0 && <BreadcrumbSeparator />}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        )}

        {/* Current Page */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md">
            {currentPage.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight truncate">
              {currentPage.label}
            </h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              {getPageDescription(pathname)}
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Quick Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {getQuickActions(pathname).map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "default"}
            size="sm"
            onClick={action.onClick}
            className={cn(
              "touch-target h-10 px-4 rounded-xl focus-ring transition-all duration-200 hover:scale-105",
              action.className
            )}
          >
            {action.icon}
            <span className="hidden sm:inline ml-2">{action.label}</span>
          </Button>
        ))}

        {/* Desktop Back Button */}
        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="hidden sm:flex touch-target h-10 w-10 p-0 rounded-xl hover:bg-muted/80 focus-ring"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Geri Git</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function getPageDescription(pathname: string): string {
  const descriptions: Record<string, string> = {
    "/dashboard": "İşletme durumunuz ve günlük özet",
    "/orders": "Tüm siparişlerinizi yönetin",
    "/orders/create": "Yeni sipariş oluşturun",
    "/customers": "Müşteri listesi ve detayları",
    "/customers/create": "Yeni müşteri kayıt formu",
    "/routes": "Rota planlama, araç yönetimi ve teslimat bölgeleri",
    "/services": "Hizmet türleri ve fiyatlandırma",
    "/delivery/route-planner": "Optimize edilmiş teslimat rotaları",
    "/notifications/templates": "Otomatik mesaj şablonları",
    "/users": "Sistem kullanıcı yönetimi",
    "/settings": "Uygulama ayarları ve konfigürasyon",
  };

  return descriptions[pathname] || "Sayfa detayları";
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

function getQuickActions(pathname: string): QuickAction[] {
  const router = useRouter();

  const actions: Record<string, QuickAction[]> = {
    "/dashboard": [
      {
        label: "Yeni Sipariş",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => router.push("/orders/create"),
        className: "bg-gradient-primary hover:shadow-lg",
      },
    ],
    "/orders": [
      {
        label: "Yeni Sipariş",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => router.push("/orders/create"),
        className: "bg-gradient-primary hover:shadow-lg",
      },
    ],
    "/customers": [
      {
        label: "Yeni Müşteri",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => router.push("/customers/create"),
        className: "bg-gradient-secondary hover:shadow-lg",
      },
    ],
    "/services": [
      {
        label: "Hizmet Ekle",
        icon: <Plus className="h-4 w-4" />,
        onClick: () => router.push("/services/create"),
        className: "bg-gradient-secondary hover:shadow-lg",
      },
    ],
  };

  return actions[pathname] || [];
}
