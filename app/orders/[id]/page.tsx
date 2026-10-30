"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OrderTimeline } from "@/components/orders/order-timeline"
import { OrderReceiptDialog } from "@/components/orders/order-receipt-dialog"
import { OrderPhotosCard } from "@/components/orders/order-photos-card"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { makePhoneCall, openGoogleMapsDirections, sendWhatsAppMessage, sendSMS } from "@/lib/communication"
import {
  ORDER_STAGES,
  TONE_CLASSES,
  nextStep,
  orderStatusInfo,
  orderStatusLabel,
  reachableStatuses,
  statusPath,
} from "@/lib/order-status"
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronRight,
  Copy,
  ListChecks,
  Loader2,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Printer,
  Send,
  Trash2,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  businessName: string
}

type OrderStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "READY_FOR_PICKUP"
  | "IN_PROGRESS"
  | "READY_FOR_DELIVERY"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"

interface OrderStatus {
  status: OrderStatusValue
  timestamp: string
  note?: string
  updatedBy: string
}

interface PaymentRecord {
  id: string
  amount: number
  paymentMethod: "CASH" | "CREDIT_CARD" | "BANK_TRANSFER" | "MOBILE_PAYMENT"
  status: string
  notes?: string | null
  paidAt: string
}

interface Order {
  id: string
  orderNumber: string
  trackingToken: string | null
  customer: {
    id?: string
    name: string
    phone: string
    email?: string
    address?: string
    latitude?: number
    longitude?: number
  }
  service: string
  status: OrderStatusValue
  priority: string
  amount: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  payments: PaymentRecord[]
  date: string
  deliveryDate?: string
  description: string
  notes?: string
  statusHistory: OrderStatus[]
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kredi Kartı / POS",
  BANK_TRANSFER: "Havale / EFT / IBAN",
  MOBILE_PAYMENT: "Mobil Ödeme",
}

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("tr-TR") : undefined

const formatPrice = (value: number) =>
  `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function toOrder(data: any): Order {
  const totalAmount = Number(data.totalAmount || 0)
  const paidAmount = Number(data.paidAmount ?? (data.paymentStatus === "PAID" ? totalAmount : 0))
  const remainingAmount = Number(
    data.remainingAmount ?? Math.max(0, totalAmount - paidAmount)
  )

  return {
    id: data.id,
    orderNumber: data.orderNumber,
    trackingToken: data.trackingToken || null,
    customer: {
      id: data.customer?.id,
      name: data.customer?.name || "İsimsiz",
      phone: data.customer?.phone || "",
      email: data.customer?.email || undefined,
      address:
        [data.customer?.address, data.customer?.district, data.customer?.city]
          .filter(Boolean)
          .join(", ") || undefined,
      latitude:
        typeof data.customer?.latitude === "number" ? data.customer.latitude : undefined,
      longitude:
        typeof data.customer?.longitude === "number" ? data.customer.longitude : undefined,
    },
    service: data.service || data.items?.[0]?.serviceName || "Hizmet belirtilmedi",
    status: data.status,
    priority: data.priority || "NORMAL",
    amount: formatPrice(totalAmount),
    totalAmount,
    paidAmount,
    remainingAmount,
    payments: Array.isArray(data.payments) ? data.payments : [],
    date: formatDate(data.createdAt) || "",
    deliveryDate: formatDate(data.deliveryDate),
    description: data.orderInfo || data.description || "",
    notes: data.notes || data.deliveryNotes || undefined,
    statusHistory:
      data.statusHistory?.length > 0
        ? data.statusHistory
        : [{ status: "PENDING", timestamp: data.createdAt, note: "Sipariş alındı", updatedBy: "Sistem" }],
    items: (data.items || []).map((item: any) => ({
      name: item.serviceName || "Hizmet",
      quantity: item.quantity,
      price: formatPrice(Number(item.totalPrice || 0)),
    })),
  }
}

/** A titled block of the order page; everything is on one scrolling page, no tabs */
function Section({
  title,
  action,
  children,
  id,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

// Native <select>: the custom select needs precise taps that the Android WebView often misses
const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"

export default function OrderDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Payment form, opened from "Tahsilat Al"
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [paymentNote, setPaymentNote] = useState("")
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const paymentRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const loadOrder = async () => {
    const token = localStorage.getItem("token")
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!response.ok) {
      setLoadError(response.status === 404 ? "Sipariş bulunamadı." : "Sipariş yüklenemedi.")
      return null
    }
    const mapped = toOrder(await response.json())
    setOrder(mapped)
    setPaymentAmount(mapped.remainingAmount > 0 ? String(mapped.remainingAmount) : "")
    return mapped
  }

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    loadOrder().catch(() => setLoadError("Sipariş yüklenemedi."))
  }, [router, orderId])

  const openPayment = () => {
    setIsPaymentOpen(true)
    setTimeout(() => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  /** Moves the order to `target`, through any steps in between, then offers to tell the customer */
  const moveTo = async (target: OrderStatusValue, note?: string) => {
    if (!order) return
    const steps = target === "CANCELLED" ? ["CANCELLED"] : statusPath(order.status, target)
    if (!steps.length) {
      toast.error("Bu duruma geçilemez.")
      return
    }
    setIsAdvancing(true)
    try {
      const token = localStorage.getItem("token")
      for (const status of steps) {
        const response = await fetch(`/api/orders/${order.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ status, notes: note }),
        })
        if (!response.ok) {
          const result = await response.json().catch(() => ({}))
          toast.error(result.error === "Invalid status transition" ? "Bu duruma geçilemez." : "Durum güncellenemedi.")
          await loadOrder()
          return
        }
      }

      const label = orderStatusLabel(target)
      const updated = await loadOrder()
      const trackLink = order.trackingToken
        ? `\n\nSiparişinizi buradan takip edebilirsiniz:\n${window.location.origin}/takip/${encodeURIComponent(order.trackingToken)}`
        : ""
      const remaining = updated?.remainingAmount ?? order.remainingAmount
      const remainingNote = remaining > 0 ? `\nKalan tutar: ${formatPrice(remaining)}` : ""

      if (order.customer.phone && target !== "COMPLETED") {
        toast.success(`Durum: ${label}`, {
          description: "Müşteriye WhatsApp ile haber verin",
          duration: 8000,
          action: {
            label: "WhatsApp",
            onClick: () => {
              const msg = `Merhaba ${order.customer.name},\n\n${order.orderNumber} numaralı siparişinizin durumu "${label}" olarak güncellendi.${remainingNote}${trackLink}\n\n${user?.businessName || ""}`
              sendWhatsAppMessage(order.customer.phone, msg)
            },
          },
        })
      } else {
        toast.success(`Durum: ${label}`)
      }
      // Handing the order over is when the rest is usually collected
      if (target === "DELIVERED" && remaining > 0) openPayment()
      setIsStatusOpen(false)
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleRecordPayment = async (amountOverride?: number) => {
    if (!order) return
    const numAmount =
      typeof amountOverride === "number"
        ? amountOverride
        : Number(paymentAmount.replace(",", "."))

    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast.error("Geçerli bir tahsilat tutarı girin")
      return
    }

    setIsSavingPayment(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`/api/orders/${order.id}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: numAmount,
          paymentMethod,
          notes: paymentNote,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        toast.error(result.error || "Tahsilat kaydedilemedi")
        return
      }
      toast.success(`${formatPrice(numAmount)} tahsilat kaydedildi`)
      setPaymentNote("")
      const updated = await loadOrder()
      if (updated && updated.remainingAmount <= 0) setIsPaymentOpen(false)
    } catch {
      toast.error("Tahsilat kaydedilirken hata oluştu")
    } finally {
      setIsSavingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!order) return
    if (!window.confirm("Bu tahsilat kaydı silinsin mi?")) return
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(
        `/api/orders/${order.id}/payments?paymentId=${encodeURIComponent(paymentId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok) {
        toast.error("Tahsilat kaydı silinemedi")
        return
      }
      toast.success("Tahsilat kaydı silindi")
      await loadOrder()
    } catch {
      toast.error("Tahsilat silinirken hata oluştu")
    }
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium text-foreground">{loadError}</p>
          <Button variant="outline" onClick={() => router.push("/orders")}>
            Siparişlere dön
          </Button>
        </div>
      </div>
    )
  }

  if (!user || !order) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const trackingUrl = order.trackingToken
    ? `${window.location.origin}/takip/${encodeURIComponent(order.trackingToken)}`
    : null
  const step = nextStep(order.status)
  const stageIndex = ORDER_STAGES.findIndex((s) => (s.statuses as readonly string[]).includes(order.status))
  const isClosed = order.status === "CANCELLED" || order.status === "COMPLETED"
  // A delivered order that still owes money: collecting it is the next thing to do
  const collectFirst = order.status === "DELIVERED" && order.remainingAmount > 0

  const sendTrackingLink = () => {
    if (!trackingUrl) return
    const msg = `Merhaba ${order.customer.name},\n\n${order.orderNumber} numaralı siparişinizin durumunu bu bağlantıdan takip edebilirsiniz:\n${trackingUrl}\n\n${user.businessName || ""}`
    sendWhatsAppMessage(order.customer.phone, msg)
  }

  const copyTrackingLink = async () => {
    if (!trackingUrl) return
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable")
      await navigator.clipboard.writeText(trackingUrl)
      toast.success("Takip bağlantısı kopyalandı")
    } catch {
      window.prompt("Takip bağlantısını kopyalayın:", trackingUrl)
    }
  }

  const secondaryActions = [
    { icon: Printer, label: "Fiş / Etiket yazdır", onClick: () => setIsReceiptOpen(true) },
    ...(trackingUrl && order.customer.phone
      ? [{ icon: Send, label: "Takip bağlantısını WhatsApp'tan gönder", onClick: sendTrackingLink }]
      : []),
    ...(trackingUrl ? [{ icon: Copy, label: "Takip bağlantısını kopyala", onClick: copyTrackingLink }] : []),
    ...(!isClosed ? [{ icon: ListChecks, label: "Durumu elle değiştir", onClick: () => setIsStatusOpen(true) }] : []),
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
            {/* Who, which order, where it stands */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-muted-foreground"
                onClick={() => router.push("/orders")}
              >
                <ArrowLeft className="h-4 w-4" />
                Siparişler
              </Button>
              <div className="mt-1 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">{order.customer.name}</h1>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {order.orderNumber} · {order.date}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <OrderStatusBadge status={order.status} />
                  {(order.priority === "URGENT" || order.priority === "HIGH") && !isClosed && (
                    <span className={`text-xs font-semibold ${TONE_CLASSES.danger.text}`}>
                      {order.priority === "URGENT" ? "Acil" : "Yüksek öncelik"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress through the field work */}
            {order.status !== "CANCELLED" && (
              <ol className="grid grid-cols-5 gap-1" aria-label="Sipariş aşaması">
                {ORDER_STAGES.map((stage, i) => {
                  const done = i < stageIndex
                  const current = i === stageIndex
                  return (
                    <li key={stage.label} className="min-w-0 text-center">
                      <div
                        className={`h-1.5 rounded-full ${done || current ? "bg-primary" : "bg-muted"}`}
                        aria-hidden="true"
                      />
                      <p
                        className={`mt-1.5 truncate text-[11px] ${
                          current ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60"
                        }`}
                        aria-current={current ? "step" : undefined}
                      >
                        {stage.label}
                      </p>
                    </li>
                  )
                })}
              </ol>
            )}

            {/* Money at a glance */}
            <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card shadow-card">
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Tutar</p>
                <p className="mt-0.5 font-bold tabular-nums text-foreground">{order.amount}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Ödenen</p>
                <p className={`mt-0.5 font-bold tabular-nums ${TONE_CLASSES.success.text}`}>{formatPrice(order.paidAmount)}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Kalan</p>
                <p
                  className={`mt-0.5 font-bold tabular-nums ${
                    order.remainingAmount > 0 ? TONE_CLASSES.danger.text : "text-muted-foreground"
                  }`}
                >
                  {formatPrice(order.remainingAmount)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              <div className="min-w-0 space-y-4">
                <Section title="Sipariş">
                  {/* A single item typed as the order text would repeat it */}
                  {order.description &&
                    !(order.items.length === 1 && order.items[0].name.trim() === order.description.trim()) && (
                      <p className="mb-3 text-foreground">{order.description}</p>
                    )}
                  {order.items.length > 0 && (
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {order.items.map((item, index) => (
                        <li key={index} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.quantity} adet</span>
                          </span>
                          <span className="shrink-0 tabular-nums text-foreground">{item.price}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Sipariş tarihi</dt>
                      <dd className="text-foreground">{order.date}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Teslim tarihi</dt>
                      <dd className="text-foreground">{order.deliveryDate || "—"}</dd>
                    </div>
                  </dl>
                  {order.notes && (
                    <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">{order.notes}</p>
                  )}
                </Section>

                <Section
                  title="Müşteri"
                  action={
                    order.customer.id && (
                      <Link href={`/customers/${order.customer.id}`} className="inline-flex items-center text-sm font-medium text-primary">
                        Kartı aç <ChevronRight className="h-4 w-4" />
                      </Link>
                    )
                  }
                >
                  <p className="font-medium text-foreground">{order.customer.phone || "Telefon yok"}</p>
                  <p className="mt-1 flex gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {order.customer.address || "Adres girilmemiş"}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button variant="outline" disabled={!order.customer.phone} onClick={() => makePhoneCall(order.customer.phone)}>
                      <Phone className="h-4 w-4" />
                      Ara
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!order.customer.phone}
                      onClick={() => sendWhatsAppMessage(order.customer.phone, `Merhaba ${order.customer.name}, `)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Yaz
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!order.customer.address && order.customer.latitude === undefined}
                      onClick={() =>
                        openGoogleMapsDirections({
                          latitude: order.customer.latitude,
                          longitude: order.customer.longitude,
                          address: order.customer.address,
                        })
                      }
                    >
                      <Navigation className="h-4 w-4" />
                      Git
                    </Button>
                  </div>
                </Section>
              </div>

              <div className="min-w-0 space-y-4">
                <div ref={paymentRef} className="scroll-mt-4">
                  <Section
                    title="Tahsilat"
                    action={
                      order.remainingAmount > 0 &&
                      !isPaymentOpen && (
                        <Button size="sm" variant="outline" onClick={openPayment}>
                          <Wallet className="h-4 w-4" />
                          Tahsilat Al
                        </Button>
                      )
                    }
                  >
                    {isPaymentOpen && order.remainingAmount > 0 && (
                      <div className="mb-4 space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <Button
                          className="w-full"
                          disabled={isSavingPayment}
                          onClick={() => handleRecordPayment(order.remainingAmount)}
                        >
                          <Check className="h-4 w-4" />
                          Kalanın tamamı: {formatPrice(order.remainingAmount)}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">ya da başka bir tutar girin</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="payment-amount">Tutar (₺)</Label>
                            <Input
                              id="payment-amount"
                              inputMode="decimal"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                              className="h-11 text-base"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="payment-method">Ödeme</Label>
                            <select
                              id="payment-method"
                              className={selectClass}
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <Input
                          placeholder="Not (isteğe bağlı)"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          className="h-11 text-base"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="ghost" onClick={() => setIsPaymentOpen(false)}>
                            Vazgeç
                          </Button>
                          <Button variant="outline" disabled={isSavingPayment} onClick={() => handleRecordPayment()}>
                            {isSavingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                            Kaydet
                          </Button>
                        </div>
                      </div>
                    )}

                    {order.payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Henüz tahsilat yok.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {order.payments.map((p) => (
                          <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="min-w-0 flex-1">
                              <span className={`font-semibold tabular-nums ${TONE_CLASSES.success.text}`}>
                                {formatPrice(p.amount)}
                              </span>
                              <span className="ml-2 text-sm text-muted-foreground">
                                {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {new Date(p.paidAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                {p.notes ? ` · ${p.notes}` : ""}
                              </span>
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-muted-foreground"
                              aria-label="Tahsilatı sil"
                              onClick={() => handleDeletePayment(p.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {order.remainingAmount > 0 && order.customer.phone && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            sendWhatsAppMessage(
                              order.customer.phone,
                              `Merhaba ${order.customer.name}, ${order.orderNumber} numaralı siparişinizden ${formatPrice(order.remainingAmount)} kalan bakiyeniz bulunmaktadır. İyi günler dileriz. - ${user.businessName || ""}`
                            )
                          }
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp hatırlat
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            sendSMS(
                              order.customer.phone,
                              `Merhaba ${order.customer.name}, ${order.orderNumber} nolu siparisinizden kalan bakiyeniz: ${formatPrice(order.remainingAmount)}. Iyi gunler dileriz.`
                            )
                          }
                        >
                          <Send className="h-4 w-4" />
                          SMS hatırlat
                        </Button>
                      </div>
                    )}
                  </Section>
                </div>

                <OrderPhotosCard orderId={order.id} />
              </div>
            </div>

            <OrderTimeline statusHistory={order.statusHistory} />

            {/* Less frequent actions, as a plain list (no menus to hunt for) */}
            <section className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
              <ul className="divide-y divide-border">
                {secondaryActions.map(({ icon: Icon, label, onClick }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={onClick}
                      className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="flex-1">{label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {!isClosed && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`${order.orderNumber} iptal edilsin mi?`)) moveTo("CANCELLED", "Sipariş ekranından iptal")
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium hover:bg-muted ${TONE_CLASSES.danger.text}`}
                    >
                      <Ban className="h-4 w-4" aria-hidden="true" />
                      Siparişi iptal et
                    </button>
                  </li>
                )}
              </ul>
            </section>
          </div>

          {/* The next thing to do with this order, always within thumb reach */}
          {(!isClosed || order.customer.phone) && (
            <div className="sticky bottom-0 z-10 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex max-w-5xl items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  aria-label="Müşteriyi ara"
                  disabled={!order.customer.phone}
                  onClick={() => makePhoneCall(order.customer.phone)}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  aria-label="WhatsApp'tan yaz"
                  disabled={!order.customer.phone}
                  onClick={() => sendWhatsAppMessage(order.customer.phone, `Merhaba ${order.customer.name}, `)}
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
                {collectFirst ? (
                  <Button className="h-12 flex-1 text-base" onClick={openPayment}>
                    <Wallet className="h-5 w-5" />
                    Tahsilat Al · {formatPrice(order.remainingAmount)}
                  </Button>
                ) : step ? (
                  <Button className="h-12 flex-1 text-base" disabled={isAdvancing} onClick={() => moveTo(step.target as OrderStatusValue)}>
                    {isAdvancing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    {step.label}
                  </Button>
                ) : (
                  <p className="flex-1 text-center text-sm text-muted-foreground">
                    {order.status === "CANCELLED" ? "Sipariş iptal edildi" : "Sipariş kapandı"}
                  </p>
                )}
              </div>
            </div>
          )}

          <Dialog open={isStatusOpen} onOpenChange={setIsStatusOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Durumu değiştir</DialogTitle>
                <DialogDescription>
                  Şu an: {orderStatusInfo(order.status).label}. Aradaki adımlar da kaydedilir.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-2">
                {reachableStatuses(order.status).map((status) => (
                  <li key={status}>
                    <Button
                      variant={status === "CANCELLED" ? "outline" : "secondary"}
                      className={`h-11 w-full justify-start ${status === "CANCELLED" ? TONE_CLASSES.danger.text : ""}`}
                      disabled={isAdvancing}
                      onClick={() => moveTo(status as OrderStatusValue)}
                    >
                      <span className={`h-2 w-2 rounded-full ${orderStatusInfo(status).classes.dot}`} aria-hidden="true" />
                      {orderStatusLabel(status)}
                    </Button>
                  </li>
                ))}
              </ul>
            </DialogContent>
          </Dialog>

          <OrderReceiptDialog
            open={isReceiptOpen}
            onOpenChange={setIsReceiptOpen}
            order={{
              id: order.id,
              orderNumber: order.orderNumber,
              trackingToken: order.trackingToken,
              businessName: user.businessName,
              customer: order.customer,
              date: order.date,
              deliveryDate: order.deliveryDate,
              amount: order.amount,
              notes: order.notes,
              description: order.description,
              items: order.items,
            }}
          />
        </main>
      </div>
    </div>
  )
}
