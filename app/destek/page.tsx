"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Bug, ChevronRight, HelpCircle, Mail, MessageCircle, Phone } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { APP_VERSION, SUPPORT } from "@/lib/app-info";
import { LEGAL } from "@/lib/legal";
import { normalizePhoneForCall, normalizePhoneForWhatsApp } from "@/lib/communication";

function Channel({
  href,
  icon: Icon,
  title,
  detail,
  primary,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  primary?: boolean;
}) {
  const external = !href.startsWith("/");
  const className = `flex items-center gap-3 rounded-xl border p-4 shadow-card transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
    primary ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
  }`;
  const body = (
    <>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
          primary ? "bg-white/15" : "bg-accent text-primary"
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className={`block truncate text-sm ${primary ? "text-white/80" : "text-muted-foreground"}`}>{detail}</span>
      </span>
      <ChevronRight className={`h-5 w-5 shrink-0 ${primary ? "text-white/80" : "text-muted-foreground"}`} aria-hidden="true" />
    </>
  );
  return external ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={className}>
      {body}
    </a>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

function SupportContent() {
  const [business, setBusiness] = useState("");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setBusiness(user.business?.name || user.businessName || "");
    } catch {
      // not signed in
    }
  }, []);

  // Messages start with who is writing, so support does not have to ask
  const intro = `LaundryPro destek${business ? ` – ${business}` : ""} (sürüm ${APP_VERSION})`;
  const mail = (subject: string, body = "") =>
    `mailto:${LEGAL.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const deviceInfo =
    typeof navigator !== "undefined" ? `\n\n---\nSürüm: ${APP_VERSION}\nCihaz: ${navigator.userAgent}` : "";

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Destek"
        description={`Sorunuz veya öneriniz mi var? Size yardımcı olalım.${SUPPORT.hours ? ` ${SUPPORT.hours}` : ""}`}
      />

      <section className="space-y-3">
        {SUPPORT.whatsapp && (
          <Channel
            primary
            href={`https://wa.me/${normalizePhoneForWhatsApp(SUPPORT.whatsapp)}?text=${encodeURIComponent(`${intro}: `)}`}
            icon={MessageCircle}
            title="WhatsApp'tan yazın"
            detail={SUPPORT.whatsapp}
          />
        )}
        {SUPPORT.phone && (
          <Channel href={`tel:${normalizePhoneForCall(SUPPORT.phone)}`} icon={Phone} title="Arayın" detail={SUPPORT.phone} />
        )}
        <Channel
          primary={!SUPPORT.whatsapp}
          href={mail(intro)}
          icon={Mail}
          title="E-posta gönderin"
          detail={LEGAL.contactEmail}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Kendiniz çözün</h2>
        <Channel href="/help" icon={HelpCircle} title="Kullanım kılavuzu" detail="Sipariş, rota, kasa ve diğer konular" />
        <Channel
          href={mail(`Hata bildirimi – ${intro}`, `Ne yapıyordunuz, ne oldu?\n\n${deviceInfo}`)}
          icon={Bug}
          title="Hata bildirin"
          detail="Sürüm ve cihaz bilgisi otomatik eklenir"
        />
      </section>
    </main>
  );
}

export default function SupportPage() {
  return (
    <AppShell>
      <SupportContent />
    </AppShell>
  );
}
