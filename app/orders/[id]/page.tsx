"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OrderTimeline } from "@/components/orders/order-timeline"
import { OrderStatusUpdater } from "@/components/orders/order-status-updater"
import { CustomerInfo } from "@/components/orders/customer-info"
import { CustomerMap } from "@/components/maps/customer-map"
import { OrderReceiptDialog } from "@/components/orders/order-receipt-dialog"
import { OrderPhotosCard } from "@/components/orders/order-photos-card"
import { sendWhatsAppMessage, sendSMS } from "@/lib/communication"
import {
  ArrowLeft,
  Printer,
  MessageSquare,
  Share2,
  Wallet,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"
import { OrderStatusBadge } from "@/components/orders/order-status-badge"
import { orderStatusInfo } from "@/lib/order-status"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  businessTypes?: string[]
  businessType?: string
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
  amount: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  paymentStatus: "PENDING" | "PARTIAL" | "PAID" | "REFUNDED" | "CANCELLED"
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

const statusLabels: Record<
  OrderStatusValue,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  PENDING: { label: "Beklemede", variant: "outline", color: "text-amber-700" },
  CONFIRMED: { label: "Onaylandı", variant: "default", color: "text-primary" },
  READY_FOR_PICKUP: { label: "Alınmaya Hazır", variant: "default", color: "text-primary" },
  IN_PROGRESS: { label: "İşlemde", variant: "default", color: "text-primary" },
  READY_FOR_DELIVERY: { label: "Teslimata Hazır", variant: "secondary", color: "text-secondary" },
  OUT_FOR_DELIVERY: { label: "Dağıtımda", variant: "secondary", color: "text-secondary" },
  DELIVERED: { label: "Teslim Edildi", variant: "secondary", color: "text-secondary" },
  COMPLETED: { label: "Tamamlandı", variant: "secondary", color: "text-secondary" },
  CANCELLED: { label: "İptal", variant: "destructive", color: "text-destructive" },
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
    amount: formatPrice(totalAmount),
    totalAmount,
    paidAmount,
    remainingAmount,
    paymentStatus: data.paymentStatus || (remainingAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING"),
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

export default function OrderDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("details")

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [paymentNote, setPaymentNote] = useState("")
  const [isSavingPayment, setIsSavingPayment] = useState(false)

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
      return
    }
    const mapped = toOrder(await response.json())
    setOrder(mapped)
    if (mapped.remainingAmount > 0) {
      setPaymentAmount(String(mapped.remainingAmount))
    } else {
      setPaymentAmount("")
    }
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

  const handleStatusUpdate = async (newStatus: OrderStatusValue, note?: string) => {
    if (!order) return

    const token = localStorage.getItem("token")
    const response = await fetch(`/api/orders/${order.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus, notes: note }),
    })

    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      toast.error(result.error === "Invalid status transition" ? "Bu duruma geçilemez." : "Durum güncellenemedi.")
      return
    }

    const statusLabelText = statusLabels[newStatus].label
    const trackLink = order.trackingToken
      ? `\n\nCanlı Sipariş Takip Linkiniz:\n${window.location.origin}/takip/${encodeURIComponent(order.trackingToken)}`
      : ""
    const remainingNote =
      order.remainingAmount > 0
        ? `\nKalan Tutar: ${formatPrice(order.remainingAmount)}`
        : ""

    if (order.customer.phone) {
      toast.success(`Durum güncellendi: ${statusLabelText}`, {
        description: "Müşteriye WhatsApp üzerinden bilgi vermek ister misiniz?",
        duration: 8000,
        action: {
          label: "WhatsApp Bildir",
          onClick: () => {
            const msg = `Merhaba ${order.customer.name},\n\n${order.orderNumber} numaralı siparişinizin durumu "${statusLabelText}" olarak güncellenmiştir.${remainingNote}${trackLink}\n\n${user?.businessName || ""}`
            sendWhatsAppMessage(order.customer.phone, msg)
          },
        },
      })
    } else {
      toast.success(`Durum güncellendi: ${statusLabelText}`)
    }
    await loadOrder()
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
      await loadOrder()
    } catch {
      toast.error("Tahsilat kaydedilirken hata oluştu")
    } finally {
      setIsSavingPayment(false)
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!order) return
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
        <p className="text-muted-foreground">Sipariş yükleniyor…</p>
      </div>
    )
  }

  const trackingUrl = order.trackingToken
    ? `${window.location.origin}/takip/${encodeURIComponent(order.trackingToken)}`
    : null

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-muted-foreground"
                onClick={() => router.push("/orders")}
              >
                <ArrowLeft className="h-4 w-4" />
                Siparişler
              </Button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground sm:text-2xl">{order.customer.name}</h1>
                    <OrderStatusBadge status={order.status} />
                    {order.remainingAmount <= 0 ? (
                      <Badge className="bg-emerald-600 text-white">Ödendi</Badge>
                    ) : order.paidAmount > 0 ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-700">
                        Kısmi Ödeme (Kalan: {formatPrice(order.remainingAmount)})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-red-300 text-red-700">
                        Ödeme Bekliyor ({formatPrice(order.remainingAmount)})
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {order.orderNumber} • {order.date}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                  <Button onClick={() => setIsReceiptOpen(true)}>
                    <Printer className="h-4 w-4" />
                    Fiş / Etiket
                  </Button>
                  <Button
                    variant={order.remainingAmount > 0 ? "default" : "outline"}
                    onClick={() => setActiveTab("payments")}
                  >
                    <Wallet className="h-4 w-4" />
                    Tahsilat Al
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!trackingUrl}
                    onClick={async () => {
                      if (!trackingUrl) return
                      try {
                        if (!navigator.clipboard) throw new Error("clipboard unavailable")
                        await navigator.clipboard.writeText(trackingUrl)
                        toast.success("Müşteri takip linki kopyalandı")
                      } catch {
                        window.prompt("Takip linkini kopyalayın:", trackingUrl)
                      }
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                    Takip Linki
                  </Button>
                  {order.customer.phone && trackingUrl && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const url = trackingUrl
                        const msg = `Merhaba ${order.customer.name},\n\n${order.orderNumber} numaralı siparişinizin güncel durumunu aşağıdaki bağlantıdan üyeliksiz takip edebilirsiniz:\n${url}\n\n${user.businessName || ""}`
                        sendWhatsAppMessage(order.customer.phone, msg)
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border rounded-xl border border-border bg-card shadow-card">
              <div className="p-4">
                <p className="text-xs text-muted-foreground">Toplam Tutar</p>
                <p className="mt-1 font-bold tabular-nums text-foreground sm:text-lg">{order.amount}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground">Kalan Borç (Veresiye)</p>
                <p
                  className={`mt-1 font-bold tabular-nums sm:text-lg ${
                    order.remainingAmount > 0 ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {order.remainingAmount > 0
                    ? formatPrice(order.remainingAmount)
                    : "₺0,00 (Ödendi)"}
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground">Teslim Tarihi</p>
                <p className="mt-1 font-semibold text-foreground sm:text-lg">{order.deliveryDate || "—"}</p>
              </div>
              <div className="p-4">
                <p className="text-xs text-muted-foreground">Durum</p>
                <p className={`mt-1 font-semibold sm:text-lg ${orderStatusInfo(order.status).classes.text}`}>
                  {orderStatusInfo(order.status).label}
                </p>
              </div>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsTrigger value="details">Sipariş Detayları</TabsTrigger>
                <TabsTrigger value="payments">
                  Tahsilat & Cari {order.remainingAmount > 0 ? `(${formatPrice(order.remainingAmount)})` : ""}
                </TabsTrigger>
                <TabsTrigger value="photos">Ürün Fotoğrafları</TabsTrigger>
                <TabsTrigger value="timeline">Takip Geçmişi</TabsTrigger>
                <TabsTrigger value="customer">Müşteri Bilgileri</TabsTrigger>
                <TabsTrigger value="map">Konum & Harita</TabsTrigger>
                <TabsTrigger value="status">Durum Güncelle</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Sipariş Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Hizmet Türü</label>
                        <p className="text-base">{order.service}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Açıklama</label>
                        <p className="text-base">{order.description}</p>
                      </div>
                      {order.notes && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Notlar</label>
                          <p className="text-base">{order.notes}</p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sipariş Tarihi</label>
                        <p className="text-base">{order.date}</p>
                      </div>
                      {order.deliveryDate && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Teslim Tarihi</label>
                          <p className="text-base">{order.deliveryDate}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Ürün Detayları</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">Adet: {item.quantity}</p>
                            </div>
                            <p className="font-medium">{item.price}</p>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-3 border-t font-bold">
                          <span>Toplam</span>
                          <span>{order.amount}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="photos">
                <OrderPhotosCard orderId={order.id} />
              </TabsContent>

              <TabsContent value="payments">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Tahsilat / Ödeme Kaydet
                      </CardTitle>
                      <CardDescription>
                        Peşinat (kapora), parçalı ödeme veya kalan borç tahsilatı ekleyin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted p-3 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Sipariş Tutarı</p>
                          <p className="font-bold text-sm sm:text-base">{formatPrice(order.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Ödenen</p>
                          <p className="font-bold text-sm sm:text-base text-emerald-600">
                            {formatPrice(order.paidAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Kalan Borç</p>
                          <p
                            className={`font-bold text-sm sm:text-base ${
                              order.remainingAmount > 0 ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            {formatPrice(order.remainingAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="payment-amount">Tahsilat Tutarı (₺)</Label>
                          <Input
                            id="payment-amount"
                            placeholder="Örn: 250"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="payment-method">Ödeme Yöntemi</Label>
                          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger id="payment-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CASH">Nakit</SelectItem>
                              <SelectItem value="CREDIT_CARD">Kredi Kartı / POS</SelectItem>
                              <SelectItem value="BANK_TRANSFER">Havale / EFT / IBAN</SelectItem>
                              <SelectItem value="MOBILE_PAYMENT">Mobil Ödeme</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="payment-note">Açıklama / Not (İsteğe Bağlı)</Label>
                        <Input
                          id="payment-note"
                          placeholder="Örn: Teslimatta nakit alındı / Kapora"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          className="flex-1"
                          disabled={isSavingPayment}
                          onClick={() => handleRecordPayment()}
                        >
                          <Wallet className="h-4 w-4 mr-2" />
                          {isSavingPayment ? "Kaydediliyor..." : "Tahsilatı Kaydet"}
                        </Button>
                        {order.remainingAmount > 0 && (
                          <Button
                            variant="secondary"
                            disabled={isSavingPayment}
                            onClick={() => handleRecordPayment(order.remainingAmount)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Tamamını Tahsil Et ({formatPrice(order.remainingAmount)})
                          </Button>
                        )}
                      </div>

                      {order.remainingAmount > 0 && order.customer.phone && (
                        <div className="pt-3 border-t flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const msg = `Merhaba ${order.customer.name}, ${order.orderNumber} numaralı siparişinize ait toplam ${formatPrice(order.totalAmount)} tutarın ${formatPrice(order.paidAmount)} kısmı ödenmiş olup ${formatPrice(order.remainingAmount)} kalan bakiyeniz bulunmaktadır. İyi günler dileriz. - ${user.businessName || ""}`
                              sendWhatsAppMessage(order.customer.phone, msg)
                            }}
                          >
                            💬 WhatsApp Bakiye Hatırlat
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const msg = `Merhaba ${order.customer.name}, ${order.orderNumber} nolu siparisinizden kalan bakiyeniz: ${formatPrice(order.remainingAmount)}. Iyi gunler dileriz.`
                              sendSMS(order.customer.phone, msg)
                            }}
                          >
                            ✉️ SMS Bakiye Hatırlat
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tahsilat Geçmişi</CardTitle>
                      <CardDescription>
                        Bu siparişe ait yapılan tüm ödemeler
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {order.payments.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground space-y-2">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-sm">Henüz kayıtlı tahsilat bulunmuyor.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {order.payments.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-emerald-700">
                                    {formatPrice(p.amount)}
                                  </span>
                                  <Badge variant="outline">
                                    {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(p.paidAt).toLocaleString("tr-TR")}
                                  {p.notes ? ` • ${p.notes}` : ""}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                aria-label="Tahsilatı sil"
                                onClick={() => handleDeletePayment(p.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="timeline">
                <OrderTimeline statusHistory={order.statusHistory} />
              </TabsContent>

              <TabsContent value="customer">
                <CustomerInfo customer={order.customer} />
              </TabsContent>

              <TabsContent value="map">
                <CustomerMap customer={order.customer} />
              </TabsContent>

              <TabsContent value="status">
                <OrderStatusUpdater currentStatus={order.status} onStatusUpdate={handleStatusUpdate} />
              </TabsContent>
            </Tabs>

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
          </div>
        </main>
      </div>
    </div>
  )
}
