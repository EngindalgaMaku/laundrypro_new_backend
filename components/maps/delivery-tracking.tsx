"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MapPin, Truck, Clock, CheckCircle, Navigation, Phone } from "lucide-react"

interface DeliveryStop {
  id: string
  customer: string
  address: string
  phone: string
  status: "pending" | "in_progress" | "completed"
  estimatedTime: string
  actualTime?: string
  orderNumber: string
}

interface DeliveryTrackingProps {
  driverName: string
  routeName: string
  stops: DeliveryStop[]
}

export function DeliveryTracking({ driverName, routeName, stops }: DeliveryTrackingProps) {
  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const completedStops = stops.filter((stop) => stop.status === "completed").length
    const progressPercentage = (completedStops / stops.length) * 100
    setProgress(progressPercentage)

    const currentIndex = stops.findIndex((stop) => stop.status === "in_progress")
    if (currentIndex !== -1) {
      setCurrentStopIndex(currentIndex)
    }
  }, [stops])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "in_progress":
        return <Truck className="h-4 w-4 text-blue-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "pending":
        return "bg-gray-100 text-gray-600 border-gray-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`)
  }

  const handleNavigateToStop = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Teslimat Takibi
        </CardTitle>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Sürücü: {driverName}</span>
          <span>Rota: {routeName}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>İlerleme</span>
            <span>{Math.round(progress)}% Tamamlandı</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stops.filter((s) => s.status === "completed").length} Tamamlandı</span>
            <span>{stops.filter((s) => s.status === "pending").length} Bekliyor</span>
          </div>
        </div>

        {/* Current Stop Highlight */}
        {stops[currentStopIndex] && stops[currentStopIndex].status === "in_progress" && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Şu anda burada</p>
                  <p className="text-sm text-blue-700">{stops[currentStopIndex].customer}</p>
                  <p className="text-xs text-blue-600">{stops[currentStopIndex].address}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => handleCallCustomer(stops[currentStopIndex].phone)}>
                    <Phone className="h-3 w-3" />
                  </Button>
                  <Button size="sm" onClick={() => handleNavigateToStop(stops[currentStopIndex].address)}>
                    <Navigation className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stops List */}
        <div className="space-y-3">
          <h4 className="font-medium">Teslimat Durakları</h4>
          <div className="space-y-2">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className={`p-3 rounded-lg border transition-all ${getStatusColor(stop.status)} ${
                  stop.status === "in_progress" ? "ring-2 ring-blue-300" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium w-6 h-6 rounded-full bg-white flex items-center justify-center">
                        {index + 1}
                      </span>
                      {getStatusIcon(stop.status)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{stop.customer}</p>
                      <p className="text-xs opacity-75">{stop.orderNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">{stop.actualTime || stop.estimatedTime}</p>
                    {stop.status === "pending" && <p className="text-xs opacity-75">Tahmini</p>}
                  </div>
                </div>

                <div className="mt-2 text-xs opacity-75">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {stop.address}
                  </div>
                </div>

                {stop.status === "in_progress" && (
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs bg-transparent"
                      onClick={() => handleCallCustomer(stop.phone)}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      📞 Ara
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleNavigateToStop(stop.address)}>
                      <Navigation className="h-3 w-3 mr-1" />
                      Git
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
