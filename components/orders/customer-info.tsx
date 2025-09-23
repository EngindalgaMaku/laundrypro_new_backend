"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle, Mail, MessageSquare, MapPin, Navigation } from "lucide-react"

interface Customer {
  name: string
  phone: string
  email?: string
  address?: string
  latitude?: number
  longitude?: number
}

interface CustomerInfoProps {
  customer: Customer
}

export function CustomerInfo({ customer }: CustomerInfoProps) {
  const handleCall = () => {
    window.open(`tel:${customer.phone}`)
  }

  const handleEmail = () => {
    if (customer.email) {
      window.open(`mailto:${customer.email}`)
    }
  }

  const handleWhatsApp = () => {
    const cleanPhone = customer.phone.replace(/\D/g, "")
    const message = encodeURIComponent("Merhaba, LaundryPro'dan siparişiniz hakkında bilgi vermek istiyoruz.")
    window.open(`https://wa.me/90${cleanPhone}?text=${message}`)
  }

  const handleSMS = () => {
    const message = encodeURIComponent("LaundryPro'dan siparişiniz hakkında bilgi: ")
    window.open(`sms:${customer.phone}?body=${message}`)
  }

  const handleViewOnMap = () => {
    if (customer.latitude && customer.longitude) {
      window.open(`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`)
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`)
    }
  }

  const handleGetDirections = () => {
    if (customer.latitude && customer.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`)
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Ad Soyad</label>
            <p className="text-lg font-semibold">{customer.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">Telefon</label>
            <div className="flex items-center justify-between">
              <p className="text-base">{customer.phone}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCall}>
                  <Phone className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleWhatsApp} className="text-green-600 bg-transparent">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {customer.email && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">E-posta</label>
              <div className="flex items-center justify-between">
                <p className="text-base">{customer.email}</p>
                <Button size="sm" variant="outline" onClick={handleEmail}>
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {customer.address && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Adres</label>
              <div className="space-y-2">
                <p className="text-base">{customer.address}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleViewOnMap}>
                    <MapPin className="h-4 w-4 mr-1" />
                    Haritada Gör
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleGetDirections}>
                    <Navigation className="h-4 w-4 mr-1" />
                    Yol Tarifi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>İletişim Seçenekleri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleCall} className="w-full justify-start bg-transparent" variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Telefon Et
          </Button>

          <Button
            onClick={handleWhatsApp}
            className="w-full justify-start text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
            variant="outline"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp Gönder
          </Button>

          {customer.email && (
            <Button onClick={handleEmail} className="w-full justify-start bg-transparent" variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              E-posta Gönder
            </Button>
          )}

          <Button onClick={handleSMS} className="w-full justify-start bg-transparent" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS Gönder
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
