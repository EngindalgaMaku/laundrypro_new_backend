"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Navigation, ExternalLink } from "lucide-react"
import { openGoogleMapsLocation, openGoogleMapsDirections } from "@/lib/communication"

interface CustomerMapProps {
  customer: {
    name: string
    address?: string
    latitude?: number
    longitude?: number
  }
}

export function CustomerMap({ customer }: CustomerMapProps) {
  const hasCoordinates =
    typeof customer.latitude === "number" &&
    typeof customer.longitude === "number" &&
    !Number.isNaN(customer.latitude) &&
    !Number.isNaN(customer.longitude)

  const handleViewOnGoogleMaps = () => {
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

  if (!customer.address && !hasCoordinates) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Konum Bilgisi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Bu müşteri için adres veya GPS bilgisi bulunmuyor.</p>
        </CardContent>
      </Card>
    )
  }

  // OpenStreetMap embed bounding box when GPS coordinates exist
  const osmEmbedUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${
        customer.longitude! - 0.005
      }%2C${customer.latitude! - 0.003}%2C${customer.longitude! + 0.005}%2C${
        customer.latitude! + 0.003
      }&layer=mapnik&marker=${customer.latitude}%2C${customer.longitude}`
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Müşteri Konumu & Yol Tarifi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {osmEmbedUrl ? (
          <div className="relative bg-muted rounded-lg overflow-hidden border" style={{ height: "240px" }}>
            <iframe
              title={`${customer.name} Harita Konumu`}
              src={osmEmbedUrl}
              className="w-full h-full border-0"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="relative bg-muted rounded-lg overflow-hidden border" style={{ height: "180px" }}>
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
              <div className="text-center">
                <MapPin className="h-10 w-10 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-blue-900">{customer.name}</p>
                <p className="text-xs text-blue-700 mt-1 max-w-md">{customer.address}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button onClick={handleViewOnGoogleMaps} variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Google Haritalar'da Aç
          </Button>
          <Button onClick={handleGetDirections} className="w-full">
            <Navigation className="h-4 w-4 mr-2" />
            Yol Tarifi Al (Navigasyon)
          </Button>
        </div>

        {/* Address & Coordinate Info */}
        <div className="p-3 bg-muted rounded-lg space-y-1">
          {customer.address && (
            <>
              <p className="text-xs font-medium text-muted-foreground">Açık Adres</p>
              <p className="text-sm text-foreground">{customer.address}</p>
            </>
          )}
          {hasCoordinates && (
            <p className="text-xs font-mono text-muted-foreground pt-1">
              GPS: {customer.latitude!.toFixed(5)}, {customer.longitude!.toFixed(5)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
