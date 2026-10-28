// Turkish labels and colours for the OrderStatus enum (prisma/schema.prisma), shared by
// every screen that shows a status.
// Colour carries meaning only: waiting (amber), in the works (blue), ready (teal),
// finished (neutral), cancelled (red).

export type StatusTone = "warning" | "info" | "success" | "neutral" | "danger";

export const ORDER_STATUS: Record<
  string,
  { label: string; tone: StatusTone; description: string }
> = {
  PENDING: { label: "Beklemede", tone: "warning", description: "Yeni oluşturulan veya onay bekleyen siparişler." },
  CONFIRMED: { label: "Onaylandı", tone: "info", description: "Onaylanan, işleme alınmaya hazır siparişler." },
  READY_FOR_PICKUP: { label: "Alınmaya Hazır", tone: "success", description: "Müşteriden alınmaya hazır (alım planlanacak)." },
  IN_PROGRESS: { label: "İşlemde", tone: "info", description: "Temizlik/işlem aşamasındaki siparişler." },
  READY_FOR_DELIVERY: { label: "Teslimata Hazır", tone: "success", description: "Teslimata hazır; rota planlamasına dahil edilebilir." },
  OUT_FOR_DELIVERY: { label: "Dağıtımda", tone: "info", description: "Aktif dağıtımda; kurye üzerinde." },
  DELIVERED: { label: "Teslim Edildi", tone: "neutral", description: "Müşteriye teslim edildi." },
  COMPLETED: { label: "Tamamlandı", tone: "neutral", description: "Muhasebesi kapanmış, tamamen tamamlanmış." },
  CANCELLED: { label: "İptal", tone: "danger", description: "İptal edilen siparişler." },
};

/** Statuses in workflow order, for filters and the legend */
export const ORDER_STATUS_FLOW = [
  "PENDING",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;

export const TONE_CLASSES: Record<StatusTone, { badge: string; dot: string; text: string }> = {
  warning: { badge: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", text: "text-amber-700" },
  info: { badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-600", text: "text-blue-700" },
  success: { badge: "bg-teal-50 text-teal-700 border-teal-200", dot: "bg-teal-600", text: "text-teal-700" },
  neutral: { badge: "bg-muted text-muted-foreground border-border", dot: "bg-gray-400", text: "text-muted-foreground" },
  danger: { badge: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-600", text: "text-red-700" },
};

export function orderStatusInfo(status: string) {
  const info = ORDER_STATUS[status] ?? { label: status, tone: "neutral" as StatusTone, description: "" };
  return { ...info, classes: TONE_CLASSES[info.tone] };
}

export const ORDER_STATUS_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS).map(([status, info]) => [status, info.label])
);

export const orderStatusLabel = (status: string) => ORDER_STATUS_LABELS[status] ?? status;
