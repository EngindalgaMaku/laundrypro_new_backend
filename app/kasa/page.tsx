"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, expenseCategoryLabel } from "@/lib/expenses";
import { TONE_CLASSES } from "@/lib/order-status";

type Period = "day" | "month" | "year";

interface Report {
  period: Period;
  from: string;
  to: string;
  isCurrent: boolean;
  income: number;
  expense: number;
  net: number;
  byMethod: Record<string, number>;
  byCategory: Record<string, number>;
  series?: Array<{ key: string; income: number; expense: number }>;
  work?: { created: number; pickedUp: number; delivered: number; cancelled: number };
  payments?: Array<{ amount: number; method: string; at: string; orderId: string; orderNumber: string; customer: string }>;
  expenses?: Array<{ id: string; amount: number; category: string; description: string | null; spentAt: string }>;
}

const PERIODS: Array<{ value: Period; param: string; label: string }> = [
  { value: "day", param: "gun", label: "Gün Özeti" },
  { value: "month", param: "ay", label: "Kasa Raporu" },
  { value: "year", param: "yil", label: "Yıllık" },
];

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

const money = (v: number) => `₺${v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** Today in Turkey as YYYY-MM-DD, whatever the phone's own zone */
const todayTR = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

/** The period's value one step before or after (day, month or year) */
function shift(period: Period, value: string, step: number) {
  if (period === "day") {
    const d = new Date(`${value}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + step);
    return d.toISOString().slice(0, 10);
  }
  if (period === "month") {
    const [y, m] = value.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + step, 1));
    return d.toISOString().slice(0, 7);
  }
  return String(Number(value) + step);
}

function title(period: Period, value: string) {
  if (period === "day") {
    return new Date(`${value}T12:00:00Z`).toLocaleDateString("tr-TR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (period === "month") {
    const [y, m] = value.split("-").map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  }
  return value;
}

function seriesLabel(period: Period, key: string) {
  if (period === "month") return String(Number(key.slice(8, 10)));
  return MONTHS[Number(key.slice(5, 7)) - 1].slice(0, 3);
}

function Breakdown({ title, rows, tone }: { title: string; rows: Array<[string, number]>; tone: "success" | "danger" }) {
  const max = Math.max(...rows.map(([, v]) => v), 1);
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Kayıt yok</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map(([label, value]) => (
            <li key={label}>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-foreground">{label}</span>
                <span className="font-semibold tabular-nums text-foreground">{money(value)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className={`h-1.5 rounded-full ${tone === "success" ? "bg-teal-600" : "bg-red-500"}`}
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CashReport() {
  const router = useRouter();
  const search = useSearchParams();
  const period = (PERIODS.find((p) => p.param === search.get("donem"))?.value ?? "day") as Period;
  const defaultValue = period === "day" ? todayTR() : period === "month" ? todayTR().slice(0, 7) : todayTR().slice(0, 4);
  const value = search.get("tarih") || defaultValue;

  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const go = (nextPeriod: Period, nextValue?: string) => {
    const param = PERIODS.find((p) => p.value === nextPeriod)!.param;
    router.replace(`/kasa?donem=${param}${nextValue ? `&tarih=${nextValue}` : ""}`);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/reports/cash?period=${period}&date=${value}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Rapor yüklenemedi");
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rapor yüklenemedi");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [period, value]);

  useEffect(() => {
    load();
  }, [load]);

  const seriesMax = useMemo(
    () => Math.max(1, ...(report?.series ?? []).flatMap((s) => [s.income, s.expense])),
    [report]
  );

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Kasa"
        description="Alınan ödemeler, giderler ve kalan net"
        actions={
          <Button asChild size="sm">
            <Link href="/giderler?yeni=1">
              <Plus className="h-4 w-4" />
              Gider Ekle
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1" role="tablist">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            onClick={() => go(p.value)}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              period === p.value ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" aria-label="Önceki" onClick={() => go(period, shift(period, value, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-center font-semibold capitalize text-foreground">{title(period, value)}</p>
        <Button
          variant="outline"
          size="icon"
          aria-label="Sonraki"
          disabled={report?.isCurrent}
          onClick={() => go(period, shift(period, value, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">{error}</div>
      ) : report ? (
        <>
          <section className="grid grid-cols-3 gap-2">
            {[
              { label: "Gelir", value: report.income, cls: TONE_CLASSES.success.text },
              { label: "Gider", value: report.expense, cls: TONE_CLASSES.danger.text },
              { label: "Net", value: report.net, cls: report.net < 0 ? TONE_CLASSES.danger.text : "text-foreground" },
            ].map((t) => (
              <div key={t.label} className="rounded-xl border border-border bg-card p-3 text-center shadow-card">
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className={`mt-1 truncate text-lg font-bold tabular-nums sm:text-xl ${t.cls}`}>{money(t.value)}</p>
              </div>
            ))}
          </section>

          {report.work && (
            <section className="grid grid-cols-4 divide-x divide-border rounded-xl border border-border bg-card shadow-card">
              {[
                { label: "Yeni sipariş", value: report.work.created },
                { label: "Teslim alınan", value: report.work.pickedUp },
                { label: "Teslim edilen", value: report.work.delivered },
                { label: "İptal", value: report.work.cancelled },
              ].map((w) => (
                <div key={w.label} className="px-2 py-3 text-center">
                  <p className="text-lg font-bold tabular-nums text-foreground">{w.value}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{w.label}</p>
                </div>
              ))}
            </section>
          )}

          {report.series && (
            <section className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{period === "month" ? "Günlere göre" : "Aylara göre"}</h2>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-teal-600" /> Gelir
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-sm bg-red-500" /> Gider
                  </span>
                </div>
              </div>
              <div className="mt-4 flex h-40 items-end gap-[3px] overflow-x-auto" role="img" aria-label="Gelir ve gider grafiği">
                {report.series.map((s) => (
                  <div key={s.key} className="flex min-w-[14px] flex-1 flex-col items-center gap-1" title={`${seriesLabel(period, s.key)}: gelir ${money(s.income)}, gider ${money(s.expense)}`}>
                    <div className="flex h-32 w-full items-end justify-center gap-px">
                      <div className="w-1/2 rounded-t-sm bg-teal-600" style={{ height: `${(s.income / seriesMax) * 100}%` }} />
                      <div className="w-1/2 rounded-t-sm bg-red-500" style={{ height: `${(s.expense / seriesMax) * 100}%` }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">{seriesLabel(period, s.key)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Breakdown
              title="Ödeme şekline göre gelir"
              tone="success"
              rows={Object.entries(report.byMethod).map(([k, v]) => [PAYMENT_METHOD_LABELS[k] ?? k, v])}
            />
            <Breakdown
              title="Türüne göre gider"
              tone="danger"
              rows={Object.entries(report.byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => [expenseCategoryLabel(k), v])}
            />
          </div>

          {period === "year" && report.series && (
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Ay</th>
                    <th className="px-3 py-2 text-right font-medium">Gelir</th>
                    <th className="px-3 py-2 text-right font-medium">Gider</th>
                    <th className="px-3 py-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.series.map((s) => (
                    <tr key={s.key}>
                      <td className="px-3 py-2">
                        <button type="button" className="text-primary hover:underline" onClick={() => go("month", s.key)}>
                          {MONTHS[Number(s.key.slice(5, 7)) - 1]}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(s.income)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{money(s.expense)}</td>
                      <td className={`px-3 py-2 text-right font-medium tabular-nums ${s.income - s.expense < 0 ? TONE_CLASSES.danger.text : ""}`}>
                        {money(s.income - s.expense)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {report.payments && (
            <section className="rounded-xl border border-border bg-card shadow-card">
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Kasa hareketleri</h2>
              {report.payments.length + (report.expenses?.length ?? 0) === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Bu gün hareket yok</p>
              ) : (
                <ul className="divide-y divide-border">
                  {[
                    ...report.payments.map((p) => ({
                      key: `p-${p.orderId}-${p.at}`,
                      at: p.at,
                      title: p.customer,
                      detail: `#${p.orderNumber} · ${PAYMENT_METHOD_LABELS[p.method] ?? p.method}`,
                      href: `/orders/${p.orderId}`,
                      amount: p.amount,
                    })),
                    ...(report.expenses ?? []).map((e) => ({
                      key: `e-${e.id}`,
                      at: e.spentAt,
                      title: expenseCategoryLabel(e.category),
                      detail: e.description || "Gider",
                      href: null as string | null,
                      amount: -e.amount,
                    })),
                  ]
                    .sort((a, b) => b.at.localeCompare(a.at))
                    .map((m) => {
                      const content = (
                        <>
                          <span className="w-12 shrink-0 text-xs tabular-nums text-muted-foreground">
                            {new Date(m.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" })}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{m.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">{m.detail}</span>
                          </span>
                          <span className={`shrink-0 font-semibold tabular-nums ${m.amount < 0 ? TONE_CLASSES.danger.text : TONE_CLASSES.success.text}`}>
                            {m.amount < 0 ? "−" : "+"}
                            {money(Math.abs(m.amount))}
                          </span>
                        </>
                      );
                      return (
                        <li key={m.key}>
                          {m.href ? (
                            <Link href={m.href} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
                              {content}
                            </Link>
                          ) : (
                            <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>
          )}
        </>
      ) : null}
    </main>
  );
}

export default function CashPage() {
  return (
    <AppShell>
      <CashReport />
    </AppShell>
  );
}
