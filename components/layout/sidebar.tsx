"use client";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  ClipboardList,
  Users,
  Settings,
  Route,
  Wallet,
  LayoutGrid,
  LifeBuoy,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark, Logo } from "@/components/brand/logo";
import { APP_VERSION } from "@/lib/app-info";

// Daily screens; everything else is grouped on the Yönetim screen (app/yonetim/page.tsx)
const navigation = [
  { name: "Ana Sayfa", href: "/dashboard", icon: Home },
  { name: "Siparişler", href: "/orders", icon: ClipboardList },
  { name: "Müşteriler", href: "/customers", icon: Users },
  { name: "Rota Çiz", href: "/rota", icon: Route },
  { name: "Kasa ve Giderler", href: "/kasa", icon: Wallet },
  { name: "Yönetim", href: "/yonetim", icon: LayoutGrid },
  { name: "Ayarlar", href: "/settings", icon: Settings },
  { name: "Destek", href: "/destek", icon: LifeBuoy },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpen = false,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // DEBUG: Log sidebar props and state changes
  console.log("Sidebar Props:", {
    isOpen,
    isCollapsed,
    isMobile,
    pathname,
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768); // Changed from 1024 to 768 for tablet support
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Shows the admin link only; /api/admin/* enforces access on the server.
  // The answer is cached per user for the session so pages don't re-ask (and log 403s).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const u = JSON.parse(raw);
      const email = (u?.email || "").toString().trim().toLowerCase();
      const cacheKey = `isAdmin:${email}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached !== null) {
        setIsAdmin(cached === "true");
        return;
      }

      const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (email && list.includes(email)) {
        sessionStorage.setItem(cacheKey, "true");
        setIsAdmin(true);
        return;
      }
      // Fallback: silent server auth check
      const token = localStorage.getItem("token");
      if (token) {
        fetch(`/api/admin/feedbacks?limit=1`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            sessionStorage.setItem(cacheKey, String(res.ok));
            if (res.ok) setIsAdmin(true);
          })
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleNavigation = (href: string) => {
    router.push(href);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Enhanced Mobile Header */}
      {isMobile && (
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border bg-gradient-card">
          <Logo size="md" subtitle="Akıllı Çamaşırhane" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log("DEBUG: Mobile sidebar close button clicked");
              onClose?.();
            }}
            className="touch-target h-10 w-10 p-0 rounded-xl hover:bg-muted/80 focus-ring"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Menüyü kapat</span>
          </Button>
        </div>
      )}

      {/* Enhanced Desktop/Tablet Header */}
      <div className="hidden md:flex h-16 items-center px-4 border-b border-sidebar-border bg-gradient-card">
        <Logo size="md" subtitle="Akıllı Çamaşırhane & Halı Yıkama" />
      </div>

      {/* Enhanced Navigation */}
      <ScrollArea className="flex-1 py-4 px-3 custom-scrollbar">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start touch-target h-12 px-4 rounded-xl font-medium transition-all duration-300",
                  isActive
                    ? "gradient-primary text-white shadow-card border-0"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "focus-ring"
                )}
                onClick={() => handleNavigation(item.href)}
              >
                <IconComponent
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                />
                <span className="text-sm font-medium truncate">
                  {item.name}
                </span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-card rounded-full animate-pulse"></div>
                )}
              </Button>
            );
          })}

          {/* Admin section (visible only to allowed emails) */}
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-sidebar-border/50">
              <Button
                variant={pathname === "/admin" ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start touch-target h-12 px-4 rounded-xl font-medium transition-all duration-300",
                  pathname === "/admin"
                    ? "gradient-primary text-white shadow-card border-0"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  "focus-ring"
                )}
                onClick={() => handleNavigation("/admin")}
              >
                <Shield className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-300",
                  pathname === "/admin" && "scale-110"
                )} />
                <span className="text-sm font-medium truncate">Yönetim</span>
                {pathname === "/admin" && (
                  <div className="ml-auto w-2 h-2 bg-card rounded-full animate-pulse"></div>
                )}
              </Button>
            </div>
          )}
        </nav>

        {/* Footer: about page */}
        {isMobile && (
          <button
            type="button"
            onClick={() => handleNavigation("/hakkinda")}
            className="mt-8 mx-3 flex w-[calc(100%-1.5rem)] items-center gap-3 rounded-xl border border-sidebar-border p-3 text-left transition-colors hover:bg-sidebar-accent"
          >
            <LogoMark className="h-8 w-8" />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-sidebar-foreground">LaundryPro {APP_VERSION}</span>
              <span className="block text-xs text-muted-foreground">Hakkında, destek ve yasal</span>
            </span>
          </button>
        )}
      </ScrollArea>
    </div>
  );

  // Mobile sidebar (Sheet)
  if (isMobile) {
    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
      >
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar border-sidebar-border"
          showCloseButton={false}
        >
          {/* The menu header has its own close button */}
          <SheetTitle className="sr-only">Menü</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Enhanced Desktop/Tablet sidebar
  return (
    <div
      className={cn(
        "hidden md:flex bg-sidebar border-r border-sidebar-border shadow-card transition-all duration-300",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex flex-col h-full w-full">
        {/* Enhanced Desktop/Tablet header with toggle */}
        <div className="relative flex h-16 items-center border-b border-sidebar-border bg-gradient-card px-4">
          {/* Logo and title */}
          <div
            className={cn(
              "flex items-center transition-all duration-300",
              isCollapsed ? "justify-center flex-1" : "flex-1 gap-3"
            )}
          >
            {isCollapsed ? (
              <LogoMark className="w-10 h-10" />
            ) : (
              <Logo size="md" subtitle="Akıllı Çamaşırhane & Halı Yıkama" />
            )}
          </div>

          {/* Enhanced Toggle button */}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log("DEBUG: Desktop sidebar toggle button clicked");
                onToggleCollapse?.();
              }}
              className="touch-target h-10 w-10 p-0 flex-shrink-0 rounded-xl hover:bg-muted/80 focus-ring transition-all duration-200"
              title={isCollapsed ? "Sidebar'ı Genişlet" : "Sidebar'ı Daralt"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-5 w-5 transition-transform duration-200" />
              ) : (
                <ChevronLeft className="h-5 w-5 transition-transform duration-200" />
              )}
              <span className="sr-only">
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </span>
            </Button>
          )}
        </div>

        {/* Enhanced Navigation */}
        <ScrollArea className="flex-1 py-4 px-3 custom-scrollbar">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.name}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full touch-target h-12 font-medium transition-all duration-300 rounded-xl",
                    isActive
                      ? "gradient-primary text-white shadow-card border-0"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    "focus-ring",
                    isCollapsed ? "justify-center px-2" : "justify-start px-4"
                  )}
                  onClick={() => handleNavigation(item.href)}
                  title={isCollapsed ? item.name : undefined}
                >
                  <IconComponent
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-300",
                      isCollapsed ? "mr-0" : "mr-3",
                      isActive && "scale-110"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium transition-all duration-300 truncate",
                      isCollapsed ? "sr-only" : "block"
                    )}
                  >
                    {item.name}
                  </span>
                  {isActive && !isCollapsed && (
                    <div className="ml-auto w-2 h-2 bg-card rounded-full animate-pulse"></div>
                  )}
                </Button>
              );
            })}

            {/* Admin section (visible only to allowed emails) */}
            {isAdmin && (
              <div className="pt-2 mt-2 border-t border-sidebar-border/50">
                <Button
                  variant={pathname === "/admin" ? "secondary" : "ghost"}
                  className={cn(
                    "w-full touch-target h-12 font-medium transition-all duration-300 rounded-xl",
                    pathname === "/admin"
                      ? "gradient-primary text-white shadow-card border-0"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    "focus-ring",
                    isCollapsed ? "justify-center px-2" : "justify-start px-4"
                  )}
                  onClick={() => handleNavigation("/admin")}
                  title={isCollapsed ? "Yönetim" : undefined}
                >
                  <Shield
                    className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-300",
                      isCollapsed ? "mr-0" : "mr-3",
                      pathname === "/admin" && "scale-110"
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm font-medium transition-all duration-300 truncate",
                      isCollapsed ? "sr-only" : "block"
                    )}
                  >
                    Yönetim
                  </span>
                  {pathname === "/admin" && !isCollapsed && (
                    <div className="ml-auto w-2 h-2 bg-card rounded-full animate-pulse"></div>
                  )}
                </Button>
              </div>
            )}
          </nav>

          {/* Footer: about page */}
          {!isCollapsed && (
            <div className="mt-8 mx-3">
              <button
                type="button"
                onClick={() => handleNavigation("/hakkinda")}
                className="flex w-full items-center gap-3 rounded-xl border border-sidebar-border p-3 text-left transition-colors hover:bg-sidebar-accent"
              >
                <LogoMark className="h-8 w-8" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-sidebar-foreground">LaundryPro {APP_VERSION}</span>
                  <span className="truncate text-xs text-muted-foreground">Hakkında, destek ve yasal</span>
                </span>
              </button>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
