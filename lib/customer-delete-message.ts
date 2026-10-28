/**
 * Customers with orders are only deactivated (their order history is kept), so the
 * confirmation must not claim they were deleted. `result` is the DELETE /api/customers/[id] body.
 */
export function customerDeleteMessage(result: { result?: { softDeleted?: boolean } } | null): string {
  return result?.result?.softDeleted
    ? "Müşterinin siparişleri olduğu için kaydı silinmedi, pasif yapıldı"
    : "Müşteri silindi";
}
