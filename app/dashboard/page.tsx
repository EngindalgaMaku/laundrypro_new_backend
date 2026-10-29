"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { ACTIVE_STATUSES, ORDER_GROUPS, TONE_CLASSES, type OrderGroupKey, type StatusTone } from "@/lib/order-status";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  PackageCheck,
  Plus,
  Route,
  Truck,
  Wallet,
  Waves,
} from "lucide-react";

interface User {
  id: string;
  email: string;
  business: { name: string; businessType: string };
  businessName?: string;
}

interface Board {
  groups: Record<OrderGroupKey, number>;
  urgent: number;
  unpaid: { count: number; amount: number };
  today: { created: number; delivered: number; collected: number };
}

const money = (value: number) =>
  `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

const groupLink = (key: OrderGroupKey) => `/orders?status=${ORDER_GROUPS[key].statuses.join(",")}`;

// The board answers "what do I do today": one card per stage of the field work, in work order
const CARDS: Array<{ key: OrderGroupKey; icon: LucideIcon; tone: StatusTone }> = [
  { key: "pickup", icon: ClipboardList, tone: "warning" },
  { key: "washing", icon: Waves, tone: "info" },
  { key: "delivery", icon: PackageCheck, tone: "success" },
  { key: "outForDelivery", icon: Truck, tone: "info" },
];

function BoardCard({
  href,
  icon: Icon,
  tone,
  label,
  hint,
  count,
}: {
  href: string;
  icon: LucideIcon;
  tone: StatusTone;
  label: string;
  hint: string;
  count: number | null;
}) {
  const classes = TONE_CLASSES[tone];
  return (
    <Link
      href={href}
      className="group flex min-h-[112px] flex-col rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg border ${classes.badge}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span
          className={`text-3xl font-bold tabular-nums ${count ? "text-foreground" : "text-muted-foreground/60"}`}
        >
          {count ?? "–"}
        </span>
      </div>
      <div className="mt-3">
        <p className="font-semibold leading-tight text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const router = useRouter();

  const fetchBoard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }
    try {
      const response = await fetch("/api/dashboard/board", { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      setBoard(await response.json());
      setLoadFailed(false);
    } catch (error) {
      console.error("Dashboard board error:", error);
      setLoadFailed(true);
    }
  }, [router]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    fetchBoard();
    // Counts change as the team works; refresh when the app comes back to the foreground
    const onVisible = () => document.visibilityState === "visible" && fetchBoard();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router, fetchBoard]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const routeStops = board ? board.groups.pickup + board.groups.delivery + board.groups.outForDelivery : null;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex flex-1 flex-col overflow-hidden lg:ml-0">
        <Header user={user} onMenuClick={() => setIsMobileMenuOpen(true)} isMobileMenuOpen={isMobileMenuOpen} />
        <main className="custom-scrollbar flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
            <section className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">
                  {user.business?.name || user.businessName || "İşletme"}
                </h1>
              </div>
              <Button onClick={() => router.push("/orders/create")} className="shrink-0">
                <Plus className="h-4 w-4" />
                Yeni Sipariş
              </Button>
            </section>

            {loadFailed && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Sayılar yüklenemedi.
                <Button variant="outline" size="sm" onClick={fetchBoard}>
                  Tekrar dene
                </Button>
              </div>
            )}

            <Link
              href="/rota"
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Route className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground">Rota Çiz</span>
                <span className="block text-sm text-muted-foreground">
                  {routeStops === null
                    ? "Alınacak ve dağıtılacak adresleri sıraya koyun"
                    : routeStops === 0
                      ? "Bugün gidilecek adres yok"
                      : `${routeStops} sipariş; en kısa sıraya koyup haritada açın`}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>

            <section aria-label="İş durumu" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {CARDS.map(({ key, icon, tone }) => (
                <BoardCard
                  key={key}
                  href={groupLink(key)}
                  icon={icon}
                  tone={tone}
                  label={ORDER_GROUPS[key].label}
                  hint={ORDER_GROUPS[key].hint}
                  count={board ? board.groups[key] : null}
                />
              ))}
              <BoardCard
                href={`/orders?status=${ACTIVE_STATUSES.join(",")}&priority=URGENT,HIGH`}
                icon={AlertTriangle}
                tone="danger"
                label="Acil"
                hint="Acil ve yüksek öncelikli"
                count={board ? board.urgent : null}
              />
              <BoardCard
                href="/orders?paymentStatus=UNPAID"
                icon={Wallet}
                tone="warning"
                label="Veresiye"
                hint={board && board.unpaid.amount > 0 ? `${money(board.unpaid.amount)} alacak` : "Ödemesi kalan siparişler"}
                count={board ? board.unpaid.count : null}
              />
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">Bugün</h2>
              <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card shadow-card">
                {[
                  { label: "Yeni sipariş", value: board ? String(board.today.created) : "–" },
                  { label: "Teslim edilen", value: board ? String(board.today.delivered) : "–" },
                  { label: "Tahsilat", value: board ? money(board.today.collected) : "–" },
                ].map((item) => (
                  <div key={item.label} className="min-w-0 px-3 py-3 text-center">
                    <p className="truncate text-lg font-bold tabular-nums text-foreground sm:text-xl">{item.value}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <RecentOrders />
              </div>
              {/* Shortcuts come before the recent orders on phones */}
              <div className="order-first xl:order-none">
                <QuickActions />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
