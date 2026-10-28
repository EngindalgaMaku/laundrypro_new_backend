"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Mail, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { LogoMark } from "@/components/brand/logo";
import { LEGAL } from "@/lib/legal";
import { APP_VERSION } from "@/lib/app-info";

// lib/legal.ts keeps "[…]" placeholders until the operator fills them in; never show those
const filled = (value: string) => !!value && !value.startsWith("[");

function Row({ href, icon: Icon, label, external }: { href: string; icon: typeof Mail; label: string; external?: boolean }) {
  const content = (
    <>
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted";
  return external ? (
    <a href={href} className={cls}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

function AboutContent() {
  const [nativeVersion, setNativeVersion] = useState<string | null>(null);

  useEffect(() => {
    // Inside the Android app, show the installed package version as well
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;
        const { App } = await import("@capacitor/app");
        const info = await App.getInfo();
        setNativeVersion(`${info.version} (${info.build})`);
      } catch {
        // not in the app, or the plugin is unavailable
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-xl space-y-6 p-4 sm:p-6">
      <section className="flex flex-col items-center pt-4 text-center">
        <LogoMark className="h-20 w-20" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
          Laundry<span className="text-secondary">Pro</span>
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Kuru temizleme, çamaşırhane ve halı yıkama işletmeleri için sipariş, müşteri, tahsilat ve teslimat
          yönetimi.
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <dl className="divide-y divide-border text-sm">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-muted-foreground">Sürüm</dt>
            <dd className="font-medium tabular-nums text-foreground">{APP_VERSION}</dd>
          </div>
          {nativeVersion && (
            <div className="flex justify-between px-4 py-3">
              <dt className="text-muted-foreground">Android uygulaması</dt>
              <dd className="font-medium tabular-nums text-foreground">{nativeVersion}</dd>
            </div>
          )}
          {filled(LEGAL.controllerName) && (
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Geliştirici</dt>
              <dd className="text-right font-medium text-foreground">{LEGAL.controllerName}</dd>
            </div>
          )}
          {filled(LEGAL.controllerAddress) && (
            <div className="flex justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Adres</dt>
              <dd className="text-right text-foreground">{LEGAL.controllerAddress}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">Destek ve yasal</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card divide-y divide-border">
          {filled(LEGAL.contactEmail) && (
            <Row href={`mailto:${LEGAL.contactEmail}`} icon={Mail} label={`Bize yazın: ${LEGAL.contactEmail}`} external />
          )}
          <Row href="/help" icon={FileText} label="Yardım ve sık sorulan sorular" />
          <Row href="/kvkk" icon={ShieldCheck} label="KVKK Aydınlatma Metni" />
          <Row href="/gizlilik-politikasi" icon={ShieldCheck} label="Gizlilik Politikası" />
          <Row href="/kullanim-sartlari" icon={FileText} label="Kullanım Şartları" />
        </div>
      </section>

      <p className="pb-4 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} LaundryPro</p>
    </main>
  );
}

export default function AboutPage() {
  return (
    <AppShell>
      <AboutContent />
    </AppShell>
  );
}
