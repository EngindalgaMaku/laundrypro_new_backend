// Turkish labels for the OrderStatus enum (prisma/schema.prisma)
export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  READY_FOR_PICKUP: "Alınmaya Hazır",
  IN_PROGRESS: "İşlemde",
  READY_FOR_DELIVERY: "Teslimata Hazır",
  OUT_FOR_DELIVERY: "Dağıtımda",
  DELIVERED: "Teslim Edildi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

export const orderStatusLabel = (status: string) => ORDER_STATUS_LABELS[status] ?? status;
