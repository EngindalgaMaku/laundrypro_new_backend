"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface OrderStatusUpdaterProps {
  currentStatus:
    | "PENDING"
    | "CONFIRMED"
    | "READY_FOR_PICKUP"
    | "IN_PROGRESS"
    | "READY_FOR_DELIVERY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
  onStatusUpdate: (
    newStatus:
      | "PENDING"
      | "CONFIRMED"
      | "READY_FOR_PICKUP"
      | "IN_PROGRESS"
      | "READY_FOR_DELIVERY"
      | "OUT_FOR_DELIVERY"
      | "DELIVERED"
      | "COMPLETED"
      | "CANCELLED",
    note?: string,
  ) => void | Promise<void>
}

const statusOptions = [
  { value: "PENDING", label: "⏳ Beklemede", description: "Sipariş alındı, onay bekliyor" },
  { value: "CONFIRMED", label: "✅ Onaylandı", description: "Onaylandı, müşteriden alınacak" },
  { value: "READY_FOR_PICKUP", label: "📦 Alınmaya Hazır", description: "Pickup planlanmalı" },
  { value: "IN_PROGRESS", label: "🔄 İşlemde", description: "Temizlik/işlem devam ediyor" },
  { value: "READY_FOR_DELIVERY", label: "🚚 Teslimata Hazır", description: "Dağıtıma hazırlanmış" },
  { value: "OUT_FOR_DELIVERY", label: "🛣️ Dağıtımda", description: "Kurye üzerinde" },
  { value: "DELIVERED", label: "📍 Teslim Edildi", description: "Müşteriye teslim edildi" },
  { value: "COMPLETED", label: "✨ Tamamlandı", description: "Kapanış/muhasebe tamam" },
  { value: "CANCELLED", label: "❌ İptal", description: "Sipariş iptal edildi" },
]

const getNextStatuses = (currentStatus: string) => {
  switch (currentStatus) {
    case "PENDING":
      return ["CONFIRMED", "CANCELLED"]
    case "CONFIRMED":
      return ["READY_FOR_PICKUP", "CANCELLED"]
    case "READY_FOR_PICKUP":
      return ["IN_PROGRESS", "CANCELLED"]
    case "IN_PROGRESS":
      return ["READY_FOR_DELIVERY", "CANCELLED"]
    case "READY_FOR_DELIVERY":
      return ["OUT_FOR_DELIVERY", "CANCELLED"]
    case "OUT_FOR_DELIVERY":
      return ["DELIVERED", "CANCELLED"]
    case "DELIVERED":
      return ["COMPLETED"]
    case "COMPLETED":
      return []
    case "CANCELLED":
      return []
    default:
      return []
  }
}

export function OrderStatusUpdater({ currentStatus, onStatusUpdate }: OrderStatusUpdaterProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [note, setNote] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)

  const availableStatuses = getNextStatuses(currentStatus)
  const availableOptions = statusOptions.filter((option) => availableStatuses.includes(option.value))

  const handleUpdate = async () => {
    if (!selectedStatus) return

    setIsUpdating(true)
    try {
      await onStatusUpdate(selectedStatus as any, note || undefined)
      setSelectedStatus("")
      setNote("")
    } finally {
      setIsUpdating(false)
    }
  }

  const currentStatusInfo = statusOptions.find((s) => s.value === currentStatus)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mevcut Durum</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-lg font-semibold mb-2">{currentStatusInfo?.label}</div>
            <p className="text-sm text-muted-foreground">{currentStatusInfo?.description}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Durum Güncelle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Yeni Durum</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Yeni durumu seçin" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Not (İsteğe bağlı)</Label>
            <Textarea
              id="note"
              placeholder="Durum değişikliği hakkında not ekleyin..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleUpdate} disabled={!selectedStatus || isUpdating} className="w-full">
            {isUpdating ? "Güncelleniyor..." : "Durumu Güncelle"}
          </Button>

          {availableOptions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Bu durum için mevcut güncelleme seçeneği bulunmuyor.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
