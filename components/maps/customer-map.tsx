"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, ExternalLink } from "lucide-react"

interface CustomerMapProps {
  customer: {
    name: string
    address?: string
    latitude?: number
    longitude?: number
  }
}

export function CustomerMap({ customer }: CustomerMapProps) {
  const [mapUrl, setMapUrl] = useState<string>("")

  useEffect(() => {
    if (customer.latitude && customer.longitude) {
      setMapUrl(
        `https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${customer.latitude},${customer.longitude}&zoom=15`,
      )
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      setMapUrl(`https://www.google.com/maps/embed/v1/place?key=YOUR_API_KEY&q=${encodedAddress}&zoom=15`)
    }
  }, [customer])

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
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`)
    } else if (customer.address) {
      const encodedAddress = encodeURIComponent(customer.address)
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`)
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
          Müşteri Konumu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Static Map Preview */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: "200px" }}>
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="text-center">
              <MapPin className="h-12 w-12 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-700">{customer.name}</p>
              <p className="text-xs text-blue-600 mt-1">{customer.address}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleViewOnGoogleMaps} className="flex-1 bg-transparent" variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Haritada Gör
          </Button>
          <Button onClick={handleGetDirections} className="flex-1">
            <Navigation className="h-4 w-4 mr-2" />
            Yol Tarifi Al
          </Button>
        </div>

        {/* Address Info */}
        {customer.address && (
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">Adres:</p>
            <p className="text-sm text-muted-foreground">{customer.address}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
