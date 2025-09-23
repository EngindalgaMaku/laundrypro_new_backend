"use client";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Home,
  ClipboardList,
  Users,
  UserCog,
  Settings,
  Bell,
  Route,
  DollarSign,
  FileText,
  MessageCircle,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Siparişler", href: "/orders", icon: ClipboardList },
  { name: "Müşteriler", href: "/customers", icon: Users },
  { name: "Rota Planlama", href: "/routes", icon: Route },
  { name: "Hizmetler", href: "/services", icon: DollarSign },
  { name: "Bildirim Şablonları", href: "/notifications/templates", icon: Bell },
  { name: "Kullanıcı Yönetimi", href: "/users", icon: UserCog },
  { name: "Ayarlar", href: "/settings", icon: Settings },
  {
    name: "WhatsApp Business",
    href: "/settings/whatsapp",
    icon: MessageCircle,
  },
  { name: "E-Faturalar", href: "/invoices", icon: FileText },
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

  // Determine admin by email (client-side) using NEXT_PUBLIC_ADMIN_EMAILS
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const u = JSON.parse(raw);
      const email = (u?.email || "").toString().trim().toLowerCase();
      const cached = localStorage.getItem("isAdmin");
      if (cached === "true") {
        setIsAdmin(true);
        return;
      }
      // Hardcoded fallback for primary admin
      if (email === "mackaengin@gmail.com") {
        setIsAdmin(true);
        return;
      }

      const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (email && list.includes(email)) {
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg ring-1 ring-primary/20">
              <span className="text-xl">🧼</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground text-base">
                LaundryPro
              </span>
              <span className="text-xs text-muted-foreground">
                Temizlik Yönetimi
              </span>
            </div>
          </div>
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
            <span className="sr-only">Close menu</span>
          </Button>
        </div>
      )}

      {/* Enhanced Desktop/Tablet Header */}
      <div className="hidden md:flex h-16 items-center px-4 border-b border-sidebar-border bg-gradient-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg ring-1 ring-primary/20">
            <span className="text-xl">🧼</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-foreground text-base">
              LaundryPro
            </span>
            <span className="text-xs text-muted-foreground">
              Profesyonel Çözümler
            </span>
          </div>
        </div>
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
                  "w-full justify-start touch-target h-12 px-4 rounded-xl font-medium transition-all duration-300",
                  isActive
                    ? "gradient-primary text-white shadow-md border-0 hover:shadow-lg"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 hover:shadow-sm",
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
                  <div className="ml-auto w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
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
                    ? "gradient-primary text-white shadow-md border-0 hover:shadow-lg"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 hover:shadow-sm",
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
                  <div className="ml-auto w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
                )}
              </Button>
            </div>
          )}
        </nav>

        {/* Enhanced Mobile Footer */}
        {isMobile && (
          <div className="mt-8 mx-3 p-4 bg-gradient-secondary/10 rounded-xl border border-sidebar-border/50">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 bg-gradient-secondary rounded-lg mx-auto flex items-center justify-center">
                <span className="text-sm">✨</span>
              </div>
              <p className="text-xs font-medium text-sidebar-foreground">
                LaundryPro v1.0
              </p>
              <p className="text-xs text-muted-foreground">
                Profesyonel temizlik çözümleri
              </p>
            </div>
          </div>
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
          console.log("DEBUG: Sheet onOpenChange:", open);
          if (!open) onClose?.();
        }}
      >
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar border-sidebar-border"
        >
          <div className="sr-only">
            <h2>Navigation Menu</h2>
          </div>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Enhanced Desktop/Tablet sidebar
  return (
    <div
      className={cn(
        "hidden md:flex bg-sidebar border-r border-sidebar-border shadow-lg transition-all duration-300",
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
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg ring-1 ring-primary/20 transition-transform duration-300 hover:scale-105">
              <span className="text-xl">🧼</span>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sidebar-foreground text-base truncate">
                  LaundryPro
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  Profesyonel Çözümler
                </span>
              </div>
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
                      ? "gradient-primary text-white shadow-md border-0 hover:shadow-lg"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 hover:shadow-sm",
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
                    <div className="ml-auto w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
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
                      ? "gradient-primary text-white shadow-md border-0 hover:shadow-lg"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-0 hover:shadow-sm",
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
                    <div className="ml-auto w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
                  )}
                </Button>
              </div>
            )}
          </nav>

          {/* Enhanced Desktop Footer */}
          {!isCollapsed && (
            <div className="mt-8 mx-3 p-4 bg-gradient-secondary/10 rounded-xl border border-sidebar-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-secondary rounded-lg flex items-center justify-center">
                  <span className="text-sm">✨</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    LaundryPro v1.0
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    Profesyonel çözümler
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
