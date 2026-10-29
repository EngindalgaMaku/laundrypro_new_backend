"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { canManageCashBook } from "@/lib/expenses";

interface DeletedOrder {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  status: string;
  deletedAt: string;
  deletedBy: string | null;
}

const money = (v: number) => `₺${v.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;

function DeletedOrders() {
  const router = useRouter();
  const [rows, setRows] = useState<DeletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);

  const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/orders/deleted", { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows(data.deletedOrders);
    } catch {
      toast.error("Silinen siparişler yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      setCanManage(canManageCashBook(JSON.parse(localStorage.getItem("user") || "{}").role));
    } catch {
      setCanManage(false);
    }
    load();
  }, [load]);

  const act = async (row: DeletedOrder, method: "POST" | "DELETE") => {
    if (method === "DELETE" && !window.confirm(`#${row.orderNumber} kalıcı olarak silinsin mi? Bu geri alınamaz.`)) return;
    setBusy(row.id);
    try {
      const response = await fetch(`/api/orders/deleted/${row.id}`, { method, headers: headers() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (method === "POST") {
        toast.success(`#${row.orderNumber} geri alındı`, {
          action: { label: "Aç", onClick: () => router.push(`/orders/${row.orderId}`) },
        });
      } else {
        toast.success(`#${row.orderNumber} kalıcı olarak silindi`);
      }
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "İşlem yapılamadı");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Silinen Siparişler"
        description="Silinen siparişler kalemleri, ödemeleri ve geçmişiyle burada saklanır; geri alınabilir."
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <Trash2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-medium text-foreground">Silinen sipariş yok</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{row.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    #{row.orderNumber} · {money(row.totalAmount)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(row.deletedAt).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Europe/Istanbul",
                    })}
                    {row.deletedBy && ` · ${row.deletedBy} sildi`}
                  </p>
                </div>
                <OrderStatusBadge status={row.status} />
              </div>
              {canManage && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" disabled={busy === row.id} onClick={() => act(row, "DELETE")}>
                    <Trash2 className="h-4 w-4" />
                    Kalıcı sil
                  </Button>
                  <Button size="sm" disabled={busy === row.id} onClick={() => act(row, "POST")}>
                    {busy === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Geri al
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function DeletedOrdersPage() {
  return (
    <AppShell>
      <DeletedOrders />
    </AppShell>
  );
}
