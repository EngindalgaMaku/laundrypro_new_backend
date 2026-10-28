"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, MessageCircle, Mail, MessageSquare, MapPin, Navigation } from "lucide-react"
import {
  makePhoneCall,
  sendWhatsAppMessage,
  sendSMS,
  sendEmail,
  openGoogleMapsLocation,
  openGoogleMapsDirections,
} from "@/lib/communication"

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
    makePhoneCall(customer.phone)
  }

  const handleEmail = () => {
    if (customer.email) {
      sendEmail(customer.email, "Sipariş Bilgilendirmesi")
    }
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

  const handleViewOnMap = () => {
    openGoogleMapsLocation({
      latitude: customer.latitude,
      longitude: customer.longitude,
      address: customer.address,
    })
  }

  const handleGetDirections = () => {
    openGoogleMapsDirections({
      latitude: customer.latitude,
      longitude: customer.longitude,
      address: customer.address,
    })
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
                <Button size="sm" variant="outline" onClick={handleCall} aria-label="Ara">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleWhatsApp}
                  className="text-green-600 bg-transparent"
                  aria-label="WhatsApp mesajı gönder"
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSMS}
                  aria-label="SMS gönder"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {customer.email && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">E-posta</label>
              <div className="flex items-center justify-between">
                <p className="text-base">{customer.email}</p>
                <Button size="sm" variant="outline" onClick={handleEmail} aria-label="E-posta gönder">
                  <Mail className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {(customer.address || (customer.latitude && customer.longitude)) && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Adres</label>
              <div className="space-y-2">
                {customer.address && <p className="text-base">{customer.address}</p>}
                {typeof customer.latitude === "number" && typeof customer.longitude === "number" && (
                  <p className="text-xs font-mono text-muted-foreground">
                    GPS: {customer.latitude.toFixed(5)}, {customer.longitude.toFixed(5)}
                  </p>
                )}
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

          <Button onClick={handleSMS} className="w-full justify-start bg-transparent" variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS Gönder
          </Button>

          {customer.email && (
            <Button onClick={handleEmail} className="w-full justify-start bg-transparent" variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              E-posta Gönder
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
