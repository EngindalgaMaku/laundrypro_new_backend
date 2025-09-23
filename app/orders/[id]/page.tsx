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

interface User {
  id: string
  email: string
  businessTypes?: string[]
  businessType?: string
  businessName: string
}

interface OrderStatus {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  timestamp: string
  note?: string
  updatedBy: string
}

interface Order {
  id: string
  customer: {
    name: string
    phone: string
    email?: string
    address?: string
  }
  service: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  amount: string
  date: string
  deliveryDate?: string
  description: string
  notes?: string
  trackingNumber?: string
  statusHistory: OrderStatus[]
  items: Array<{
    name: string
    quantity: number
    price: string
  }>
}

// Mock detailed order data
const mockOrderDetails: Record<string, Order> = {
  "ORD-001": {
    id: "ORD-001",
    customer: {
      name: "Ahmet Yılmaz",
      phone: "0555 123 45 67",
      email: "ahmet@example.com",
      address: "Atatürk Mah. Cumhuriyet Cad. No:15 Kadıköy/İstanbul",
    },
    service: "Kuru Temizleme",
    status: "IN_PROGRESS",
    amount: "₺150",
    date: "2024-01-15",
    deliveryDate: "2024-01-18",
    description: "2 takım elbise, 1 palto",
    notes: "Palto üzerinde leke var, özel dikkat gerekli",
    trackingNumber: "TRK-001-2024",
    items: [
      { name: "Takım Elbise", quantity: 2, price: "₺50" },
      { name: "Palto", quantity: 1, price: "₺50" },
    ],
    statusHistory: [
      {
        status: "PENDING",
        timestamp: "2024-01-15T09:00:00Z",
        note: "Sipariş alındı",
        updatedBy: "Sistem",
      },
      {
        status: "IN_PROGRESS",
        timestamp: "2024-01-15T14:30:00Z",
        note: "Temizlik işlemi başladı",
        updatedBy: "Mehmet Çalışan",
      },
    ],
  },
}

const statusLabels: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  PENDING: { label: "Beklemede", variant: "outline", color: "text-yellow-600" },
  IN_PROGRESS: { label: "İşlemde", variant: "default", color: "text-blue-600" },
  COMPLETED: { label: "Tamamlandı", variant: "secondary", color: "text-green-600" },
  DELIVERED: { label: "Teslim Edildi", variant: "secondary", color: "text-green-700" },
  CANCELLED: { label: "İptal", variant: "destructive", color: "text-red-600" },
}

export default function OrderDetailPage() {
  const [user, setUser] = useState<User | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))

    // Load order details
    const orderData = mockOrderDetails[orderId]
    if (orderData) {
      setOrder(orderData)
    }
  }, [router, orderId])

  const handleStatusUpdate = (newStatus: Order["status"], note?: string) => {
    if (!order) return

    const newStatusEntry: OrderStatus = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note,
      updatedBy: user?.businessName || "Kullanıcı",
    }

    const updatedOrder = {
      ...order,
      status: newStatus,
      statusHistory: [...order.statusHistory, newStatusEntry],
    }

    setOrder(updatedOrder)
    // Here you would typically make an API call to update the order
  }

  if (!user || !order) {
    return <div>Loading...</div>
  }

  const currentStatusInfo = statusLabels[order.status]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-foreground">Sipariş {order.id}</h1>
                  <Badge variant={currentStatusInfo.variant} className="text-sm">
                    {currentStatusInfo.label}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1">
                  {order.customer.name} • {order.service} • {order.date}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => router.push("/orders")}>
                  Geri Dön
                </Button>
                <Button variant="outline">Yazdır</Button>
                <Button>Düzenle</Button>
              </div>
            </div>

            {/* Order Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{order.amount}</div>
                  <p className="text-xs text-muted-foreground">Toplam Tutar</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{order.trackingNumber}</div>
                  <p className="text-xs text-muted-foreground">Takip Numarası</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{order.deliveryDate}</div>
                  <p className="text-xs text-muted-foreground">Teslim Tarihi</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className={`text-2xl font-bold ${currentStatusInfo.color}`}>{currentStatusInfo.label}</div>
                  <p className="text-xs text-muted-foreground">Mevcut Durum</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
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
          </div>
        </main>
      </div>
    </div>
  )
}
