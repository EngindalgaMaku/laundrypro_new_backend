"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  Download,
  LogOut,
  Settings,
  UserCog,
} from "lucide-react";
import { useState } from "react";

interface User {
  id: string;
  email: string;
  business?: {
    name?: string;
    businessType?: string;
  } | null;
  businessName?: string;
}

interface HeaderProps {
  user: User;
  onMenuClick?: () => void;
  isMobileMenuOpen?: boolean;
}

export function Header({ user, onMenuClick, isMobileMenuOpen }: HeaderProps) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showBetaDetails, setShowBetaDetails] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // DEBUG: Log header props
  console.log("Header Props:", {
    hasOnMenuClick: !!onMenuClick,
    isMobileMenuOpen,
    userEmail: user?.email,
  });

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const sendFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      setSendingFeedback(true);
      const token = localStorage.getItem("token");
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: feedbackText.trim() }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Gönderilemedi');
      }
      setFeedbackText("");
      setShowFeedback(false);
      alert('Teşekkürler! Geri bildiriminiz alındı.');
    } catch (e: any) {
      alert(e?.message || 'Bir hata oluştu');
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-50 h-14 sm:h-16 border-b border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex items-center justify-between h-full px-3 sm:px-4 lg:px-6">
        {/* Mobile menu button + Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-none">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden touch-target p-0 h-10 w-10 rounded-xl hover:bg-muted/80 focus-ring"
            onClick={() => {
              console.log(
                "DEBUG: Header menu button clicked, onMenuClick exists:",
                !!onMenuClick
              );
              onMenuClick?.();
            }}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Enhanced Mobile Logo */}
          <div
            className={`md:hidden flex items-center gap-2 transition-all duration-300 min-w-0 ${
              isMobileMenuOpen ? "opacity-0 scale-95" : "opacity-100 scale-100"
            }`}
          >
            <div className="w-8 h-8 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md ring-1 ring-primary/20">
              <span className="text-lg">🧼</span>
            </div>
            <span className="font-semibold text-foreground text-mobile-base truncate">
              LaundryPro
            </span>
          </div>
        </div>

        {/* Enhanced Desktop Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6 lg:mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
            <Input
              className="pl-10 pr-4 w-full bg-muted/30 hover:bg-muted/50 border border-input-border focus:bg-background focus:border-ring transition-all duration-200 rounded-xl h-10 text-mobile-base focus-ring"
              placeholder="Sipariş, müşteri ara..."
            />
          </div>
        </div>

        {/* Enhanced Right Section */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden touch-target p-0 h-10 w-10 rounded-xl hover:bg-muted/80 focus-ring"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* Notification Button - Enhanced */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex touch-target p-0 h-10 w-10 rounded-xl hover:bg-muted/80 focus-ring relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
            </span>
            <span className="sr-only">Notifications</span>
          </Button>

          {/* Compact Beta Controls (non-blocking) */}
          <div className="hidden md:flex items-center gap-2 mr-1">
            <Badge className="bg-amber-500 text-white">BETA</Badge>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setShowBetaDetails(true)}>Detaylar</Button>
            <Button size="sm" className="h-8" onClick={() => setShowFeedback(true)}>Hata/Öneri</Button>
          </div>

          {/* Enhanced User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative touch-target h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground hover:scale-105 hover:shadow-md transition-all duration-200 focus-ring"
              >
                <span className="font-semibold text-sm">
                  {user.business?.name?.charAt(0)?.toUpperCase() || "Z"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 p-2 bg-card/95 backdrop-blur-lg border border-border/50 shadow-xl rounded-xl fade-in-scale"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal p-3 rounded-lg bg-muted/30">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-foreground">
                        {user.business?.name?.charAt(0)?.toUpperCase() || "Z"}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-none truncate">
                        {user.business?.name || "İşletme"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground mt-1 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                className="cursor-pointer touch-target rounded-lg p-3 focus:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  <span>Ayarlar</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings/profile")}
                className="cursor-pointer touch-target rounded-lg p-3 focus:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <UserCog className="w-4 h-4" />
                  <span>Profil</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer touch-target rounded-lg p-3 focus:bg-destructive/10 hover:bg-destructive/10 text-destructive transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4" />
                  <span>Çıkış Yap</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Enhanced Mobile Search Bar */}
      {isSearchOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-md p-3 slide-in-up">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
            <Input
              className="pl-10 pr-4 w-full bg-muted/30 border border-input-border rounded-xl h-11 text-mobile-base focus:bg-background focus:border-ring transition-all duration-200 focus-ring"
              placeholder="Sipariş, müşteri ara..."
              autoFocus
            />
          </div>
        </div>
      )}
      {/* Removed full-width beta banner to avoid blocking page title */}
    </header>

    {/* Beta Details Modal */}
    <Dialog open={showBetaDetails} onOpenChange={setShowBetaDetails}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>LaundryPro Beta Bilgilendirme</DialogTitle>
          <DialogDescription>
            Bu beta döneminde uygulamanın kararlılığını, performansını ve iş akışlarını geliştirmek için kullanıcı geri bildirimlerini topluyoruz.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            - Beta süresince <strong>tüm özellikler ücretsiz</strong> olarak kullanılabilir.
          </p>
          <p>
            - Beta bittikten sonra <strong>temel özellikler ücretsiz</strong> kalacak, <strong>PRO özellikler</strong> cüzi bir aylık abonelik ile sunulacaktır.
          </p>
          <p>
            - PRO kapsamı: WhatsApp entegrasyonunu etkinleştirme, e‑Fatura işlemleri, gelişmiş rota ve limit artışları gibi özellikler.
          </p>
          <p>
            - Lütfen karşılaştığınız hataları ve önerilerinizi bizimle paylaşın.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBetaDetails(false)}>Kapat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Feedback Modal */}
    <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Hata / Öneri Bildirimi</DialogTitle>
          <DialogDescription>
            Karşılaştığınız hatayı, eksikliği veya geliştirme önerinizi detaylıca yazın. Teşekkür ederiz!
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Örn: Sipariş oluştururken tarih alanı boş kalınca uyarı çıkmıyor..."
            className="min-h-[140px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowFeedback(false)} disabled={sendingFeedback}>İptal</Button>
          <Button onClick={sendFeedback} disabled={sendingFeedback || !feedbackText.trim()}>
            {sendingFeedback ? 'Gönderiliyor...' : 'Gönder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
