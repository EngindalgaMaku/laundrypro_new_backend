// Expense categories for the cash book. Stored as the key; shared by the API and the screens.

export const EXPENSE_CATEGORIES = {
  FUEL: "Yakıt",
  SUPPLIES: "Deterjan ve malzeme",
  WAGES: "Personel",
  RENT: "Kira",
  UTILITIES: "Elektrik, su, doğalgaz",
  VEHICLE: "Araç bakım",
  FOOD: "Yemek",
  TAX: "Vergi ve SGK",
  OTHER: "Diğer",
} as const;

export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export const isExpenseCategory = (value: unknown): value is ExpenseCategory =>
  typeof value === "string" && value in EXPENSE_CATEGORIES;

export const expenseCategoryLabel = (key: string) =>
  EXPENSE_CATEGORIES[key as ExpenseCategory] ?? key;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Nakit",
  CREDIT_CARD: "Kart",
  BANK_TRANSFER: "Havale/EFT",
  MOBILE_PAYMENT: "Mobil ödeme",
};

/** Reports and deleting entries are for the owner and managers; anyone can record an expense */
export const canManageCashBook = (role?: string | null) => role === "OWNER" || role === "MANAGER";
