"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Ban,
  BarChart3,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Info,
  LifeBuoy,
  MessageCircle,
  MessagesSquare,
  Receipt,
  Settings,
  Tags,
  Trash2,
  TrendingDown,
  Truck,
  UserCog,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { TONE_CLASSES, type StatusTone } from "@/lib/order-status";

interface Tile {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: StatusTone | "brand";
}

// Every screen that is not on the bottom bar, grouped the way a shop owner looks for it
const SECTIONS: Array<{ title: string; tiles: Tile[] }> = [
  {
    title: "Kasa ve Raporlar",
    tiles: [
      { href: "/kasa", label: "Gün Özeti", hint: "Bugünün işleri ve kasası", icon: CalendarDays, tone: "brand" },
      { href: "/kasa?donem=ay", label: "Kasa Raporu", hint: "Aylık gelir, gider, net", icon: Wallet, tone: "success" },
      { href: "/kasa?donem=yil", label: "Yıllık Rapor", hint: "Ay ay karşılaştırma", icon: BarChart3, tone: "info" },
      { href: "/giderler", label: "Giderler", hint: "Yakıt, malzeme, personel…", icon: TrendingDown, tone: "danger" },
    ],
  },
  {
    title: "Siparişler",
    tiles: [
      { href: "/orders", label: "Tüm Siparişler", hint: "Arama ve filtreler", icon: ClipboardList, tone: "brand" },
      { href: "/orders?paymentStatus=UNPAID", label: "Veresiye", hint: "Ödemesi kalanlar", icon: Receipt, tone: "warning" },
      { href: "/orders?status=CANCELLED", label: "İptal Edilenler", hint: "İptal edilen siparişler", icon: Ban, tone: "neutral" },
      { href: "/orders/silinen", label: "Silinen Siparişler", hint: "Geri alınabilir", icon: Trash2, tone: "danger" },
    ],
  },
  {
    title: "Müşteri İletişimi",
    tiles: [
      { href: "/notifications/templates", label: "Mesaj Şablonları", hint: "WhatsApp ve SMS metinleri", icon: MessagesSquare, tone: "success" },
      { href: "/settings/whatsapp", label: "WhatsApp Business", hint: "Otomatik mesaj bağlantısı", icon: MessageCircle, tone: "success" },
      { href: "/invoices", label: "Faturalar", hint: "Kesilen faturalar", icon: FileText, tone: "info" },
      { href: "/settings/e-fatura", label: "E-Fatura", hint: "Entegratör ayarları", icon: Receipt, tone: "info" },
    ],
  },
  {
    title: "İşletme",
    tiles: [
      { href: "/services", label: "Hizmetler ve Fiyatlar", hint: "Halı, koltuk, perde…", icon: Tags, tone: "brand" },
      { href: "/users", label: "Kullanıcılar", hint: "Personel ve yetkiler", icon: UserCog, tone: "brand" },
      { href: "/routes", label: "Araçlar ve Bölgeler", hint: "Servis araçları", icon: Truck, tone: "brand" },
      { href: "/settings", label: "Ayarlar", hint: "İşletme, KDV, hesap", icon: Settings, tone: "neutral" },
    ],
  },
  {
    title: "Yardım",
    tiles: [
      { href: "/destek", label: "Destek", hint: "Bize ulaşın", icon: LifeBuoy, tone: "brand" },
      { href: "/help", label: "Kullanım Kılavuzu", hint: "Nasıl yapılır", icon: HelpCircle, tone: "neutral" },
      { href: "/hakkinda", label: "Hakkında", hint: "Sürüm ve yasal metinler", icon: Info, tone: "neutral" },
    ],
  },
];

function TileLink({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const iconClass = tile.tone === "brand" ? "border-transparent bg-accent text-primary" : TONE_CLASSES[tile.tone].badge;
  return (
    <Link
      href={tile.href}
      className="flex min-h-[104px] flex-col rounded-xl border border-border bg-card p-4 shadow-card transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg border ${iconClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3 font-semibold leading-tight text-foreground">{tile.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{tile.hint}</p>
    </Link>
  );
}

export default function ManagementPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
        <PageHeader title="Yönetim" description="Raporlar, kasa, iletişim ve işletme ayarları" />
        {SECTIONS.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className="h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
              {section.title}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {section.tiles.map((tile) => (
                <TileLink key={tile.href} tile={tile} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </AppShell>
  );
}
