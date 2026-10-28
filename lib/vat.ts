// Turkish VAT (KDV). Rates in force since 10 July 2023: 1%, 10% and the general 20%
// (laundry, dry cleaning, carpet/upholstery cleaning fall under the general rate).
// 0 covers exempt sales. Update this list if the legislation changes; each business
// picks its default rate in Settings (Business.vatRate).
export const TR_VAT_RATES = [0, 1, 10, 20] as const;
export const DEFAULT_VAT_RATE = 20;

export interface VatSettings {
  /** Percent; normally one of TR_VAT_RATES, any 0–100 value is accepted for future changes */
  vatRate: number;
  /** true: entered prices already include VAT (common for walk-in customers) */
  pricesIncludeVat: boolean;
}

/** Any percentage 0–100 with at most two decimals (the column is DECIMAL(5,2)) */
export const isValidVatRate = (rate: unknown): rate is number =>
  typeof rate === "number" &&
  Number.isFinite(rate) &&
  rate >= 0 &&
  rate <= 100 &&
  Math.round(rate * 100) === rate * 100;

/** One of the rates in force in Turkey (KDV Kanunu, since 10.07.2023) */
export const isStandardVatRate = (rate: number) => (TR_VAT_RATES as readonly number[]).includes(rate);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Splits an amount into net, VAT and gross for the given rate */
export function splitVat(amount: number, rate: number, inclusive: boolean) {
  if (inclusive) {
    const gross = round2(amount);
    const net = round2(gross / (1 + rate / 100));
    return { net, vat: round2(gross - net), gross };
  }
  const net = round2(amount);
  const vat = round2((net * rate) / 100);
  return { net, vat, gross: round2(net + vat) };
}

export function vatSettingsOf(business: { vatRate?: unknown; pricesIncludeVat?: boolean } | null | undefined): VatSettings {
  const rate = Number(business?.vatRate);
  return {
    vatRate: isValidVatRate(rate) ? rate : DEFAULT_VAT_RATE,
    pricesIncludeVat: business?.pricesIncludeVat ?? true,
  };
}

export interface InvoiceLine {
  orderItemId?: string;
  name: string;
  description?: string;
  quantity: number;
  /** Net unit price */
  unitPrice: number;
  /** Net line amount */
  lineAmount: number;
  vatRate: number;
  vatAmount: number;
  /** Gross line amount */
  lineTotal: number;
}

/**
 * Invoice lines and totals for an order. Each order item uses its own vatRate when set,
 * otherwise the business rate. Orders entered as a single amount (no items) become one line.
 */
export function buildInvoiceLines(order: any, vat: VatSettings) {
  const items: any[] = order.orderItems ?? [];
  const sources =
    items.length > 0
      ? items.map((item) => ({
          orderItemId: item.id as string,
          name: item.service?.name ?? item.serviceName ?? "Hizmet",
          description: item.service?.description ?? item.serviceDescription ?? undefined,
          quantity: Number(item.quantity) || 1,
          amount: Number(item.totalPrice) || 0,
          rate: item.vatRate != null ? Number(item.vatRate) : vat.vatRate,
        }))
      : [
          {
            orderItemId: undefined,
            name: String(order.orderInfo || order.notes || "Hizmet").split("\n")[0].slice(0, 200),
            description: undefined,
            quantity: 1,
            amount: Number(order.totalAmount) || 0,
            rate: vat.vatRate,
          },
        ];

  const lines: InvoiceLine[] = sources.map((s) => {
    const { net, vat: vatAmount, gross } = splitVat(s.amount, s.rate, vat.pricesIncludeVat);
    return {
      orderItemId: s.orderItemId,
      name: s.name,
      description: s.description,
      quantity: s.quantity,
      unitPrice: round2(net / s.quantity),
      lineAmount: net,
      vatRate: s.rate,
      vatAmount,
      lineTotal: gross,
    };
  });

  return {
    lines,
    subtotal: round2(lines.reduce((sum, l) => sum + l.lineAmount, 0)),
    vatTotal: round2(lines.reduce((sum, l) => sum + l.vatAmount, 0)),
    total: round2(lines.reduce((sum, l) => sum + l.lineTotal, 0)),
  };
}
