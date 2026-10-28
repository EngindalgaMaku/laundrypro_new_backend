"use client";

import { useRouter } from "next/navigation";
import { ClipboardList, FileText, Route, Settings, UserPlus, Users } from "lucide-react";

const SHORTCUTS = [
  { title: "Müşteri Ekle", icon: UserPlus, href: "/customers/create" },
  { title: "Siparişler", icon: ClipboardList, href: "/orders" },
  { title: "Teslimat Rotası", icon: Route, href: "/delivery/route-planner" },
  { title: "Müşteriler", icon: Users, href: "/customers" },
  { title: "Faturalar", icon: FileText, href: "/invoices" },
  { title: "Ayarlar", icon: Settings, href: "/settings" },
];

// One tile style for every shortcut; "Yeni Sipariş" is the primary action in the welcome card
export function QuickActions() {
  const router = useRouter();

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Kısayollar</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {SHORTCUTS.map(({ title, icon: Icon, href }) => (
          <button
            key={href}
            type="button"
            onClick={() => router.push(href)}
            className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-3 text-center shadow-card transition-colors hover:border-primary/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-xs font-medium leading-tight text-foreground sm:text-sm">{title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
