"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderTimeline } from "@/components/orders/order-timeline"
import { OrderStatusUpdater } from "@/components/orders/order-status-updater"
import { CustomerInfo } from "@/components/orders/customer-info"
import { CustomerMap } from "@/components/maps/customer-map"
import { OrderReceiptDialog } from "@/components/orders/order-receipt-dialog"
import { QRBarcodeScannerDialog } from "@/components/orders/qr-barcode-scanner-dialog"
import { sendWhatsAppMessage } from "@/lib/communication"
import { QrCode, Printer, MessageSquare, Share2 } from "lucide-react"
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

interface Order {
  id: string
  orderNumber: string
  trackingToken: string | null
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  service: string
  status: OrderStatusValue
  amount: string
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

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("tr-TR") : undefined

const formatPrice = (value: number) =>
  `₺${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

// Maps the /api/orders/[id] response onto what this page renders
function toOrder(data: any): Order {
  return {
    id: data.id,
    orderNumber: data.orderNumber,
    trackingToken: data.trackingToken || null,
    customer: {
      name: data.customer?.name || "İsimsiz",
      phone: data.customer?.phone || "",
      email: data.customer?.email || undefined,
      address:
        [data.customer?.address, data.customer?.district, data.customer?.city]
          .filter(Boolean)
          .join(", ") || undefined,
    },
    service: data.service || data.items?.[0]?.serviceName || "Hizmet belirtilmedi",
    status: data.status,
    amount: formatPrice(Number(data.totalAmount || 0)),
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
  const [isScannerOpen, setIsScannerOpen] = useState(false)
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
    setOrder(toOrder(await response.json()))
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

    toast.success(`Durum güncellendi: ${statusLabels[newStatus].label}`)
    await loadOrder()
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

  const currentStatusInfo = statusLabels[order.status]
  const trackingUrl = order.trackingToken
    ? `${window.location.origin}/takip/${encodeURIComponent(order.trackingToken)}`
    : null

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sipariş <span className="font-mono">{order.orderNumber}</span></h1>
                  <Badge variant={currentStatusInfo.variant} className="text-sm">
                    {currentStatusInfo.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  {order.customer.name} • {order.service} • {order.date}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => router.push("/orders")}>
                  Geri Dön
                </Button>
                <Button
                  variant="outline"
                  disabled={!trackingUrl}
                  onClick={async () => {
                    if (!trackingUrl) return
                    try {
                      // navigator.clipboard is missing on plain-HTTP origins (LAN dev, some WebViews)
                      if (!navigator.clipboard) throw new Error("clipboard unavailable")
                      await navigator.clipboard.writeText(trackingUrl)
                      toast.success("Müşteri takip linki kopyalandı")
                    } catch {
                      window.prompt("Takip linkini kopyalayın:", trackingUrl)
                    }
                  }}
                  className="gap-1.5"
                >
                  <Share2 className="h-4 w-4" />
                  Takip Linki Kopyala
                </Button>
                {order.customer.phone && trackingUrl && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const url = trackingUrl
                      const msg = `Merhaba ${order.customer.name},\n\n${order.orderNumber} numaralı siparişinizin güncel durumunu aşağıdaki bağlantıdan üyeliksiz takip edebilirsiniz:\n${url}\n\n${user.businessName || ""}`
                      sendWhatsAppMessage(order.customer.phone, msg)
                    }}
                    className="gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                    WhatsApp Takip Gönder
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setIsScannerOpen(true)}
                  className="gap-1.5"
                >
                  <QrCode className="h-4 w-4" />
                  QR / Barkod Okut
                </Button>
                <Button
                  onClick={() => setIsReceiptOpen(true)}
                  className="gap-1.5"
                >
                  <Printer className="h-4 w-4" />
                  QR Fiş / Etiket Yazdır
                </Button>
              </div>
            </div>

            {/* Order Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-lg sm:text-2xl font-bold font-mono break-words">{order.amount}</div>
                  <p className="text-xs text-muted-foreground">Toplam Tutar</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-lg sm:text-2xl font-bold font-mono text-primary break-words">{order.orderNumber}</div>
                  <p className="text-xs text-muted-foreground">Sipariş Numarası</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-lg sm:text-2xl font-bold text-secondary">{order.deliveryDate || "Belirtilmedi"}</div>
                  <p className="text-xs text-muted-foreground">Teslim Tarihi</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className={`text-lg sm:text-2xl font-bold ${currentStatusInfo.color}`}>{currentStatusInfo.label}</div>
                  <p className="text-xs text-muted-foreground">Mevcut Durum</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="details">Sipariş Detayları</TabsTrigger>
                <TabsTrigger value="timeline">Takip Geçmişi</TabsTrigger>
                <TabsTrigger value="customer">Müşteri Bilgileri</TabsTrigger>
                <TabsTrigger value="map">Konum & Harita</TabsTrigger>
                <TabsTrigger value="status">Durum Güncelle</TabsTrigger>
              </TabsList>

              <TabsContent value="details">
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

            <QRBarcodeScannerDialog
              open={isScannerOpen}
              onOpenChange={setIsScannerOpen}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
