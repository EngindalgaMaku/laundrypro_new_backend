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

/**
 * Field-work groups for the home board and the route screen: what the van has to fetch,
 * what is in the workshop, what goes back out. Each group maps to one or more statuses.
 */
export const ORDER_GROUPS = {
  pickup: {
    label: "Alınacaklar",
    hint: "Müşteriden teslim alınacak",
    statuses: ["PENDING", "CONFIRMED", "READY_FOR_PICKUP"],
  },
  washing: { label: "Yıkamada", hint: "Atölyede işlemde", statuses: ["IN_PROGRESS"] },
  delivery: { label: "Dağıtılacaklar", hint: "Hazır, müşteriye götürülecek", statuses: ["READY_FOR_DELIVERY"] },
  outForDelivery: { label: "Dağıtımda", hint: "Araçta, yolda", statuses: ["OUT_FOR_DELIVERY"] },
} as const;

export type OrderGroupKey = keyof typeof ORDER_GROUPS;

export const ACTIVE_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
] as const;

/** The group whose status list is exactly this comma list (the orders page filter), if any */
export function groupForStatusList(statusList: string) {
  const wanted = statusList.split(",").sort().join(",");
  return (Object.keys(ORDER_GROUPS) as OrderGroupKey[]).find(
    (key) => [...ORDER_GROUPS[key].statuses].sort().join(",") === wanted
  );
}

/**
 * Steps from the current status to the target along the allowed transitions
 * (app/api/orders/[id]/status/route.ts), e.g. PENDING → IN_PROGRESS for "picked up".
 */
const NEXT_STATUS: Record<string, string | undefined> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "READY_FOR_PICKUP",
  READY_FOR_PICKUP: "IN_PROGRESS",
  IN_PROGRESS: "READY_FOR_DELIVERY",
  READY_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
  DELIVERED: "COMPLETED",
};

export function statusPath(from: string, to: string): string[] {
  const path: string[] = [];
  let current = from;
  while (current !== to) {
    const next = NEXT_STATUS[current];
    if (!next) return [];
    path.push(next);
    current = next;
  }
  return path;
}

/**
 * The one action that moves an order on, for the big button on the order screen and the
 * quick button on order cards. Pickup statuses go straight to the workshop (statusPath walks
 * the confirmation steps in between).
 */
export function nextStep(status: string): { label: string; target: string } | null {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
    case "READY_FOR_PICKUP":
      return { label: "Teslim Alındı", target: "IN_PROGRESS" };
    case "IN_PROGRESS":
      return { label: "Yıkama Bitti", target: "READY_FOR_DELIVERY" };
    case "READY_FOR_DELIVERY":
      return { label: "Dağıtıma Çıkar", target: "OUT_FOR_DELIVERY" };
    case "OUT_FOR_DELIVERY":
      return { label: "Teslim Edildi", target: "DELIVERED" };
    case "DELIVERED":
      return { label: "Siparişi Kapat", target: "COMPLETED" };
    default:
      return null;
  }
}

/** Every status the order can be moved to by hand, in workflow order (status route rules) */
export function reachableStatuses(status: string): string[] {
  const out: string[] = [];
  let current = status;
  for (let next = NEXT_STATUS[current]; next; next = NEXT_STATUS[current]) {
    out.push(next);
    current = next;
  }
  return status === "COMPLETED" || status === "CANCELLED" || status === "DELIVERED" ? out : [...out, "CANCELLED"];
}

/** The field-work stage of a status, for the progress strip on the order screen */
export const ORDER_STAGES = [
  { label: "Alınacak", statuses: ["PENDING", "CONFIRMED", "READY_FOR_PICKUP"] },
  { label: "Yıkamada", statuses: ["IN_PROGRESS"] },
  { label: "Hazır", statuses: ["READY_FOR_DELIVERY"] },
  { label: "Dağıtımda", statuses: ["OUT_FOR_DELIVERY"] },
  { label: "Teslim", statuses: ["DELIVERED", "COMPLETED"] },
] as const;
