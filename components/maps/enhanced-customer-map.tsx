"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Navigation, ExternalLink, Clock, Phone, MessageSquare, Car, Route, Zap } from "lucide-react"

interface EnhancedCustomerMapProps {
  customer: {
    name: string
    address?: string
    latitude?: number
    longitude?: number
    phone?: string
    whatsapp?: string
  }
  businessLocation?: {
    latitude: number
    longitude: number
    address: string
  }
  showRouteInfo?: boolean
}

interface RouteInfo {
  distance: string
  duration: string
  traffic: "light" | "moderate" | "heavy"
}

export function EnhancedCustomerMap({ customer, businessLocation, showRouteInfo = true }: EnhancedCustomerMapProps) {
  const [mapUrl, setMapUrl] = useState<string>("")
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  // Default business location (Istanbul center)
  const defaultBusinessLocation = {
    latitude: 41.0082,
    longitude: 28.9784,
    address: "İstanbul Merkez",
  }

  const businessLoc = businessLocation || defaultBusinessLocation

  useEffect(() => {
    if (customer.latitude && customer.longitude) {
      setMapUrl(
        `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${customer.latitude},${customer.longitude}&zoom=15`,
      )
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      setMapUrl(`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}&zoom=15`)
    }

    // Simulate route calculation
    if (showRouteInfo && (customer.latitude || customer.address)) {
      setIsLoadingRoute(true)
      setTimeout(() => {
        setRouteInfo({
          distance: "12.5 km",
          duration: "25 dk",
          traffic: Math.random() > 0.6 ? "heavy" : Math.random() > 0.3 ? "moderate" : "light",
        })
        setIsLoadingRoute(false)
      }, 1500)
    }
  }, [customer, showRouteInfo])

  const handleViewOnGoogleMaps = () => {
    if (customer.latitude && customer.longitude) {
      window.open(`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`)
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`)
    }
  }

  const handleGetDirections = () => {
    if (customer.latitude && customer.longitude) {
      window.open(
        `https://www.google.com/maps/dir/${businessLoc.latitude},${businessLoc.longitude}/${customer.latitude},${customer.longitude}`,
      )
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      const encodedBusiness = encodeURIComponent(businessLoc.address)
      window.open(`https://www.google.com/maps/dir/${encodedBusiness}/${encodedAddress}`)
    }
  }

  const handleStartNavigation = () => {
    // Open in mobile navigation apps
    if (customer.latitude && customer.longitude) {
      const coords = `${customer.latitude},${customer.longitude}`
      // Try to open in mobile apps first, fallback to Google Maps
      window.open(`geo:${coords}?q=${coords}`)
    }
  }

  const handleCallCustomer = () => {
    if (customer.phone) {
      window.open(`tel:${customer.phone}`)
    }
  }

  const handleWhatsAppCustomer = () => {
    if (customer.whatsapp) {
      const message = encodeURIComponent(`Merhaba ${customer.name}, LaundryPro'dan size ulaşıyoruz.`)
      window.open(`https://wa.me/${customer.whatsapp.replace(/\D/g, "")}?text=${message}`)
    }
  }

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case "light":
        return "bg-green-100 text-green-800"
      case "moderate":
        return "bg-yellow-100 text-yellow-800"
      case "heavy":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTrafficLabel = (traffic: string) => {
    switch (traffic) {
      case "light":
        return "Hafif Trafik"
      case "moderate":
        return "Orta Trafik"
      case "heavy":
        return "Yoğun Trafik"
      default:
        return "Bilinmiyor"
    }
  }

  if (!customer.address && !customer.latitude) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Konum Bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Bu müşteri için adres bilgisi bulunmuyor.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Müşteri Konumu & Navigasyon
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="map">Harita</TabsTrigger>
            <TabsTrigger value="route">Rota Bilgisi</TabsTrigger>
            <TabsTrigger value="contact">İletişim</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="space-y-4">
            {/* Enhanced Map Preview */}
            <div
              className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg overflow-hidden"
              style={{ height: "250px" }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="relative">
                    <MapPin className="h-16 w-16 text-blue-600 mx-auto mb-3 drop-shadow-lg" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-lg font-semibold text-blue-800">{customer.name}</p>
                  <p className="text-sm text-blue-600 mt-1 max-w-xs">{customer.address}</p>
                  {routeInfo && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Car className="h-3 w-3 mr-1" />
                        {routeInfo.distance}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {routeInfo.duration}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-2 h-2 bg-blue-400 rounded-full opacity-60"></div>
              <div className="absolute top-8 right-6 w-1 h-1 bg-blue-300 rounded-full opacity-40"></div>
              <div className="absolute bottom-6 left-8 w-3 h-3 bg-indigo-300 rounded-full opacity-50"></div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleViewOnGoogleMaps} variant="outline" className="h-12 bg-transparent">
                <ExternalLink className="h-4 w-4 mr-2" />
                Haritada Gör
              </Button>
              <Button onClick={handleGetDirections} className="h-12">
                <Navigation className="h-4 w-4 mr-2" />
                Yol Tarifi
              </Button>
            </div>

            <Button onClick={handleStartNavigation} className="w-full h-12 bg-green-600 hover:bg-green-700">
              <Zap className="h-4 w-4 mr-2" />
              Navigasyonu Başlat
            </Button>
          </TabsContent>

          <TabsContent value="route" className="space-y-4">
            {isLoadingRoute ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Rota hesaplanıyor...</p>
              </div>
            ) : routeInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Route className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Mesafe</p>
                        <p className="text-lg font-semibold">{routeInfo.distance}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Süre</p>
                        <p className="text-lg font-semibold">{routeInfo.duration}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">Trafik Durumu</span>
                    </div>
                    <Badge className={getTrafficColor(routeInfo.traffic)}>{getTrafficLabel(routeInfo.traffic)}</Badge>
                  </div>
                </Card>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Rota Detayları</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Başlangıç: {businessLoc.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Hedef: {customer.address}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Rota bilgisi yüklenemedi.</p>
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <div className="space-y-3">
              {customer.phone && (
                <Button
                  onClick={handleCallCustomer}
                  variant="outline"
                  className="w-full h-12 justify-start bg-transparent"
                >
                  <Phone className="h-4 w-4 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Telefon Et</div>
                    <div className="text-sm text-muted-foreground">{customer.phone}</div>
                  </div>
                </Button>
              )}

              {customer.whatsapp && (
                <Button
                  onClick={handleWhatsAppCustomer}
                  variant="outline"
                  className="w-full h-12 justify-start bg-green-50 hover:bg-green-100 border-green-200"
                >
                  <MessageSquare className="h-4 w-4 mr-3 text-green-600" />
                  <div className="text-left">
                    <div className="font-medium text-green-700">WhatsApp Gönder</div>
                    <div className="text-sm text-green-600">{customer.whatsapp}</div>
                  </div>
                </Button>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Hızlı Mesajlar</h4>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    "Siparişiniz için yoldayız"
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    "5 dakika içinde oradayız"
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
                    "Siparişiniz teslim edildi"
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
