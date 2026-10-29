"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_CATEGORIES, PAYMENT_METHOD_LABELS, canManageCashBook, expenseCategoryLabel } from "@/lib/expenses";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  paymentMethod: string | null;
  spentAt: string;
  createdById: string | null;
}

const money = (v: number) => `₺${v.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const todayTR = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

// Native <select>: the custom select needs precise taps that the Android WebView often misses
const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

function ExpensesContent() {
  const search = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<{ id?: string; role?: string }>({});
  const [form, setForm] = useState({ amount: "", category: "FUEL", paymentMethod: "CASH", date: todayTR(), description: "" });
  const amountRef = useRef<HTMLInputElement>(null);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/expenses", { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setExpenses(data.expenses);
      setTotal(data.total);
    } catch {
      toast.error("Giderler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      setMe(JSON.parse(localStorage.getItem("user") || "{}"));
    } catch {
      // keep defaults
    }
    load();
    if (search.get("yeni")) amountRef.current?.focus();
  }, [load, search]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount.replace(",", "."));
    if (!(amount > 0)) {
      toast.error("Tutarı girin");
      amountRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.success(`${expenseCategoryLabel(form.category)} gideri eklendi: ${money(amount)}`);
      setForm((f) => ({ ...f, amount: "", description: "" }));
      load();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Gider kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expense: Expense) => {
    if (!window.confirm(`${expenseCategoryLabel(expense.category)} – ${money(expense.amount)} silinsin mi?`)) return;
    const response = await fetch(`/api/expenses/${expense.id}`, { method: "DELETE", headers: headers() });
    if (response.ok) {
      toast.success("Gider silindi");
      load();
    } else {
      toast.error((await response.json().catch(() => ({}))).error || "Gider silinemedi");
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Giderler"
        description="Yakıt, malzeme, personel gibi harcamalar kasa raporuna yansır"
        actions={
          canManageCashBook(me.role) && (
            <Button asChild variant="outline" size="sm">
              <Link href="/kasa?donem=ay">Kasa Raporu</Link>
            </Button>
          )
        }
      />

      <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
        <h2 className="font-semibold text-foreground">Gider ekle</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Tutar (₺)</Label>
            <Input
              id="amount"
              ref={amountRef}
              inputMode="decimal"
              placeholder="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.,]/g, "") })}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="date">Tarih</Label>
            <Input
              id="date"
              type="date"
              max={todayTR()}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="category">Tür</Label>
            <select
              id="category"
              className={selectClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {Object.entries(EXPENSE_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="method">Ödeme</Label>
            <select
              id="method"
              className={selectClass}
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Açıklama (isteğe bağlı)</Label>
          <Input
            id="description"
            placeholder="Örn. 34 ABC 123 mazot"
            value={form.description}
            maxLength={500}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="h-11 text-base"
          />
        </div>
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Gideri Kaydet
        </Button>
      </form>

      <section className="rounded-xl border border-border bg-card shadow-card">
        <div className="flex items-baseline justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Son 30 gün</h2>
          <p className="text-sm text-muted-foreground">
            Toplam <span className="font-semibold text-foreground">{money(total)}</span>
          </p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : expenses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Henüz gider girilmemiş</p>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                  {new Date(e.spentAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", timeZone: "Europe/Istanbul" })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{expenseCategoryLabel(e.category)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[e.paymentMethod && PAYMENT_METHOD_LABELS[e.paymentMethod], e.description].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{money(e.amount)}</span>
                {(canManageCashBook(me.role) || e.createdById === me.id) && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Gideri sil" onClick={() => remove(e)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function ExpensesPage() {
  return (
    <AppShell>
      <ExpensesContent />
    </AppShell>
  );
}
