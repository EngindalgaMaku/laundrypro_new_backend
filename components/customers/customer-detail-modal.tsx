"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CustomerEditForm } from "./customer-edit-form"
import { makePhoneCall, sendWhatsAppMessage, sendSMS, sendEmail } from "@/lib/communication"

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

const mockCustomerOrders: Record<string, Order[]> = {}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "Beklemede", variant: "outline" },
  IN_PROGRESS: { label: "İşlemde", variant: "default" },
  COMPLETED: { label: "Tamamlandı", variant: "secondary" },
  DELIVERED: { label: "Teslim Edildi", variant: "secondary" },
  CANCELLED: { label: "İptal", variant: "destructive" },
}

export function CustomerDetailModal({ customer, isOpen, onClose, onUpdate }: CustomerDetailModalProps) {
  const [, setIsEditing] = useState(false)

  if (!customer) return null

  const customerOrders = mockCustomerOrders[customer.id] || []

  const handleCall = () => {
    makePhoneCall(customer.phone)
  }

  const handleWhatsApp = () => {
    sendWhatsAppMessage(
      customer.phone,
      `Merhaba ${customer.name}, siparişiniz hakkında bilgi vermek istiyoruz.`
    )
  }

  const handleSMS = () => {
    sendSMS(
      customer.phone,
      `Merhaba ${customer.name}, siparişiniz hakkında bilgi: `
    )
  }

  const handleEmail = () => {
    if (customer.email) {
      sendEmail(customer.email, "Bilgilendirme")
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleCall}>
                📞 Ara
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp}>
                💬 WhatsApp
              </Button>
              <Button variant="outline" size="sm" onClick={handleSMS}>
                ✉️ SMS
              </Button>
              {customer.email && (
                <Button variant="outline" size="sm" onClick={handleEmail}>
                  📧 E-posta
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="edit" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit">Düzenle</TabsTrigger>
            <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
            <TabsTrigger value="profile">Profil Bilgileri</TabsTrigger>
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

            {customerOrders.length > 0 && (
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
                  </div>
                </CardContent>
              </Card>
            )}
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
                    <p className="text-base">{customer.registrationDate || "—"}</p>
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
