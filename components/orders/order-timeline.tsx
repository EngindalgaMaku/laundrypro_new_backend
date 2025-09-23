"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface OrderStatus {
  status:
    | "PENDING"
    | "CONFIRMED"
    | "READY_FOR_PICKUP"
    | "IN_PROGRESS"
    | "READY_FOR_DELIVERY"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "COMPLETED"
    | "CANCELLED"
  timestamp: string
  note?: string
  updatedBy: string
}

interface OrderTimelineProps {
  statusHistory: OrderStatus[]
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  PENDING: { label: "Beklemede", color: "bg-amber-500", icon: "⏳" },
  CONFIRMED: { label: "Onaylandı", color: "bg-blue-500", icon: "✅" },
  READY_FOR_PICKUP: { label: "Alınmaya Hazır", color: "bg-cyan-600", icon: "📦" },
  IN_PROGRESS: { label: "İşlemde", color: "bg-purple-600", icon: "🔄" },
  READY_FOR_DELIVERY: { label: "Teslimata Hazır", color: "bg-indigo-600", icon: "🚚" },
  OUT_FOR_DELIVERY: { label: "Dağıtımda", color: "bg-rose-500", icon: "🛣️" },
  DELIVERED: { label: "Teslim Edildi", color: "bg-emerald-600", icon: "📍" },
  COMPLETED: { label: "Tamamlandı", color: "bg-green-600", icon: "✨" },
  CANCELLED: { label: "İptal", color: "bg-red-500", icon: "❌" },
}

export function OrderTimeline({ statusHistory }: OrderTimelineProps) {
  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // New workflow order
  const orderIndex: Record<string, number> = {
    PENDING: 1,
    CONFIRMED: 2,
    READY_FOR_PICKUP: 3,
    IN_PROGRESS: 4,
    READY_FOR_DELIVERY: 5,
    OUT_FOR_DELIVERY: 6,
    DELIVERED: 7,
    COMPLETED: 8,
    CANCELLED: 99,
  }

  const sortedHistory = [...statusHistory].sort((a, b) => {
    const oa = orderIndex[a.status] ?? 100
    const ob = orderIndex[b.status] ?? 100
    if (oa !== ob) return oa - ob
    // fallback by time
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sipariş Takip Geçmişi</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border"></div>

          <div className="space-y-6">
            {sortedHistory.map((status, index) => {
              const config = statusConfig[status.status]
              const isLatest = index === statusHistory.length - 1

              return (
                <div key={index} className="relative flex items-start space-x-4">
                  {/* Timeline dot */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${config.color} text-white shadow-lg`}
                  >
                    <span className="text-lg">{config.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold">{config.label}</h3>
                      {isLatest && (
                        <Badge variant="default" className="text-xs">
                          Güncel
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{formatDate(status.timestamp)}</p>
                    {status.note && <p className="text-sm bg-muted p-3 rounded-lg mb-2">{status.note}</p>}
                    <p className="text-xs text-muted-foreground">Güncelleyen: {status.updatedBy}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
