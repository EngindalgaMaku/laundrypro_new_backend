"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomerEditForm } from "./customer-edit-form"

interface Customer {
  id: string
  name: string
  phone: string
  email: string
  address: string
  totalOrders: number
  totalSpent: string
  lastOrder: string
  status: "active" | "inactive"
  notes?: string
  registrationDate?: string
}

interface Order {
  id: string
  service: string
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "DELIVERED" | "CANCELLED"
  amount: string
  date: string
  description: string
}

interface CustomerDetailModalProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (updatedCustomer: Customer) => void
}

// Mock order history for customer
const mockCustomerOrders: Record<string, Order[]> = {
  "CUST-001": [
    {
      id: "ORD-001",
      service: "Kuru Temizleme",
      status: "IN_PROGRESS",
      amount: "₺150",
      date: "2024-01-15",
      description: "2 takım elbise, 1 palto",
    },
    {
      id: "ORD-015",
      service: "Çamaşır Yıkama",
      status: "DELIVERED",
      amount: "₺75",
      date: "2024-01-10",
      description: "Günlük çamaşırlar",
    },
    {
      id: "ORD-008",
      service: "Kuru Temizleme",
      status: "DELIVERED",
      amount: "₺200",
      date: "2024-01-05",
      description: "Gelinlik temizliği",
    },
  ],
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Beklemede", variant: "outline" },
  IN_PROGRESS: { label: "İşlemde", variant: "default" },
  COMPLETED: { label: "Tamamlandı", variant: "secondary" },
  DELIVERED: { label: "Teslim Edildi", variant: "secondary" },
  CANCELLED: { label: "İptal", variant: "destructive" },
}

export function CustomerDetailModal({ customer, isOpen, onClose, onUpdate }: CustomerDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)

  if (!customer) return null

  const customerOrders = mockCustomerOrders[customer.id] || []

  const handleCall = () => {
    window.open(`tel:${customer.phone}`)
  }

  const handleWhatsApp = () => {
    const cleanPhone = customer.phone.replace(/\D/g, "")
    const message = encodeURIComponent(`Merhaba ${customer.name}, LaundryPro'dan size özel bir mesajımız var.`)
    window.open(`https://wa.me/90${cleanPhone}?text=${message}`)
  }

  const handleEmail = () => {
    if (customer.email) {
      window.open(`mailto:${customer.email}`)
    }
  }

  const handleEditSave = (updatedCustomer: Customer) => {
    onUpdate(updatedCustomer)
    setIsEditing(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-lg">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-2xl">{customer.name}</DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                    {customer.status === "active" ? "Aktif Müşteri" : "Pasif Müşteri"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">#{customer.id}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleCall}>
                📞 Ara
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                💬 WhatsApp
              </Button>
              {customer.email && (
                <Button variant="outline" size="sm" onClick={handleEmail}>
                  📧 E-posta
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="orders">Sipariş Geçmişi ({customerOrders.length})</TabsTrigger>
            <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
            <TabsTrigger value="edit">Düzenle</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{customer.totalOrders}</div>
                  <p className="text-sm text-muted-foreground">Toplam Sipariş</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{customer.totalSpent}</div>
                  <p className="text-sm text-muted-foreground">Toplam Harcama</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{customer.lastOrder}</div>
                  <p className="text-sm text-muted-foreground">Son Sipariş</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Son Siparişler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customerOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{order.id}</span>
                          <Badge variant={statusLabels[order.status].variant}>{statusLabels[order.status].label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.service} • {order.description}
                        </p>
                        <p className="text-xs text-muted-foreground">{order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{order.amount}</p>
                      </div>
                    </div>
                  ))}
                  {customerOrders.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">Henüz sipariş bulunmuyor</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tüm Siparişler</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{order.id}</span>
                          <Badge variant={statusLabels[order.status].variant}>{statusLabels[order.status].label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{order.service}</p>
                        <p className="text-sm">{order.description}</p>
                        <p className="text-xs text-muted-foreground">{order.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{order.amount}</p>
                        <Button variant="ghost" size="sm">
                          Detay
                        </Button>
                      </div>
                    </div>
                  ))}
                  {customerOrders.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Bu müşterinin henüz siparişi bulunmuyor</p>
                      <Button className="mt-4">İlk Siparişi Oluştur</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>İletişim Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Telefon</label>
                    <p className="text-base">{customer.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">E-posta</label>
                    <p className="text-base">{customer.email || "Belirtilmemiş"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Adres</label>
                    <p className="text-base">{customer.address || "Belirtilmemiş"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Müşteri Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Kayıt Tarihi</label>
                    <p className="text-base">{customer.registrationDate || "2024-01-01"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Durum</label>
                    <p className="text-base">
                      <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                        {customer.status === "active" ? "Aktif" : "Pasif"}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Notlar</label>
                    <p className="text-base">{customer.notes || "Not bulunmuyor"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="edit">
            <CustomerEditForm customer={customer} onSave={handleEditSave} onCancel={() => setIsEditing(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
