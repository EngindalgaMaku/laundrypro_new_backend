"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderOption {
  id: string;
  orderNumber: string;
  customer: string;
  totalAmount: number;
  createdAt: string;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Orders that already have an invoice; they are not offered again */
  invoicedOrderIds: Set<string>;
  onCreated: (invoiceId: string) => void;
}

const formatPrice = (value: number) =>
  `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Creates a basic invoice from one of the business's orders (POST /api/invoices). */
export function CreateInvoiceDialog({
  open,
  onOpenChange,
  invoicedOrderIds,
  onCreated,
}: CreateInvoiceDialogProps) {
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [vknTckn, setVknTckn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrderId("");
    setVknTckn("");
    setLoading(true);
    const token = localStorage.getItem("token");
    fetch("/api/orders?page=1&limit=100", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const rows: OrderOption[] = (data.orders || [])
          .filter((o: any) => o.status !== "CANCELLED" && !invoicedOrderIds.has(o.id))
          .map((o: any) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            customer: o.customer,
            totalAmount: Number(o.totalAmount || 0),
            createdAt: o.createdAt,
          }));
        setOrders(rows);
      })
      .catch(() => toast.error("Siparişler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [open, invoicedOrderIds]);

  const vknValid = vknTckn === "" || /^\d{10,11}$/.test(vknTckn);

  const handleCreate = async () => {
    if (!orderId || !vknValid) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, ...(vknTckn ? { customerVknTckn: vknTckn } : {}) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(
          result.error === "Invoice already exists for this order"
            ? "Bu siparişin faturası zaten var."
            : "Fatura oluşturulamadı."
        );
        return;
      }
      toast.success(`Fatura oluşturuldu: ${result.invoice.invoiceNumber}`);
      onOpenChange(false);
      onCreated(result.invoice.id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni fatura</DialogTitle>
          <DialogDescription>
            Faturası kesilmemiş bir sipariş seçin. Fatura taslak olarak oluşturulur.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-order">Sipariş</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground">Siparişler yükleniyor…</p>
            ) : orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Faturası kesilmemiş sipariş yok.
              </p>
            ) : (
              <Select value={orderId} onValueChange={setOrderId}>
                <SelectTrigger id="invoice-order">
                  <SelectValue placeholder="Sipariş seçin" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="font-mono">{o.orderNumber}</span> · {o.customer} ·{" "}
                      {formatPrice(o.totalAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-vkn">Müşteri VKN / TCKN (isteğe bağlı)</Label>
            <Input
              id="invoice-vkn"
              inputMode="numeric"
              maxLength={11}
              placeholder="10 ya da 11 haneli"
              value={vknTckn}
              onChange={(e) => setVknTckn(e.target.value.replace(/\D/g, ""))}
              aria-invalid={!vknValid}
            />
            {!vknValid && (
              <p className="text-sm text-destructive">VKN 10, TCKN 11 haneli olmalıdır.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={handleCreate} disabled={!orderId || !vknValid || submitting}>
            {submitting ? "Oluşturuluyor…" : "Faturayı oluştur"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
