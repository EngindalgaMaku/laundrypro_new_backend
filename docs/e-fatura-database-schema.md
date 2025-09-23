# GIB E-Fatura Database Schema Extensions

## E-Invoice Models

### 1. EInvoice Model

```prisma
model EInvoice {
  id                 String            @id @default(cuid())
  businessId         String            @map("business_id")
  orderId            String?           @map("order_id")

  // GIB Required Fields
  invoiceNumber      String            @unique @map("invoice_number")
  invoiceSeriesId    String            @map("invoice_series_id")
  invoiceDate        DateTime          @map("invoice_date")
  invoiceTime        DateTime          @map("invoice_time")

  // Customer Information
  buyerVknTckn       String            @map("buyer_vkn_tckn") // Vergi/TC Kimlik No
  buyerTitle         String            @map("buyer_title")
  buyerName          String?           @map("buyer_name")
  buyerSurname       String?           @map("buyer_surname")
  buyerAddress       String            @map("buyer_address") @db.Text
  buyerDistrict      String            @map("buyer_district")
  buyerCity          String            @map("buyer_city")
  buyerCountry       String            @default("Türkiye") @map("buyer_country")
  buyerEmail         String?           @map("buyer_email")
  buyerPhone         String?           @map("buyer_phone")

  // Financial Information
  currencyCode       String            @default("TRY") @map("currency_code")
  subtotalAmount     Decimal           @map("subtotal_amount") @db.Decimal(15, 2)
  vatAmount          Decimal           @map("vat_amount") @db.Decimal(15, 2)
  totalAmount        Decimal           @map("total_amount") @db.Decimal(15, 2)
  payableAmount      Decimal           @map("payable_amount") @db.Decimal(15, 2)

  // GIB Integration Fields
  invoiceUuid        String?           @unique @map("invoice_uuid") // GIB UUID
  ettn               String?           @unique // Electronic Tax Transaction Number
  gibStatus          EInvoiceStatus    @default(DRAFT) @map("gib_status")
  gibStatusDate      DateTime?         @map("gib_status_date")
  gibErrorCode       String?           @map("gib_error_code")
  gibErrorMessage    String?           @map("gib_error_message") @db.Text

  // UBL XML Data
  ublXmlContent      String?           @map("ubl_xml_content") @db.LongText
  signedXmlContent   String?           @map("signed_xml_content") @db.LongText
  pdfContent         String?           @map("pdf_content") @db.LongText // Base64

  // Timestamps
  createdAt          DateTime          @default(now()) @map("created_at")
  updatedAt          DateTime          @updatedAt @map("updated_at")
  sentAt             DateTime?         @map("sent_at")

  // Relations
  business           Business          @relation(fields: [businessId], references: [id])
  order              Order?            @relation(fields: [orderId], references: [id])
  items              EInvoiceItem[]
  logs               EInvoiceLog[]

  @@map("e_invoices")
}

enum EInvoiceStatus {
  DRAFT              // Taslak
  CREATED            // Oluşturuldu
  SIGNED             // İmzalandı
  SENT               // GIB'e gönderildi
  ACCEPTED           // GIB tarafından kabul edildi
  REJECTED           // GIB tarafından reddedildi
  CANCELLED          // İptal edildi
  ARCHIVED           // Arşivlendi
}
```

### 2. EInvoiceItem Model

```prisma
model EInvoiceItem {
  id                 String            @id @default(cuid())
  eInvoiceId         String            @map("e_invoice_id")
  orderItemId        String?           @map("order_item_id")

  // Item Information
  itemName           String            @map("item_name")
  itemDescription    String?           @map("item_description") @db.Text
  quantity           Decimal           @db.Decimal(10, 3)
  unitCode           String            @default("C62") @map("unit_code") // UN/ECE Recommendation 20
  unitPrice          Decimal           @map("unit_price") @db.Decimal(15, 4)
  lineAmount         Decimal           @map("line_amount") @db.Decimal(15, 2)

  // Tax Information
  vatRate            Decimal           @map("vat_rate") @db.Decimal(5, 2) // 0, 1, 8, 18
  vatAmount          Decimal           @map("vat_amount") @db.Decimal(15, 2)
  vatExemptionCode   String?           @map("vat_exemption_code")
  vatExemptionReason String?           @map("vat_exemption_reason")

  // Additional Fields
  discountAmount     Decimal           @default(0) @map("discount_amount") @db.Decimal(15, 2)
  lineTotal          Decimal           @map("line_total") @db.Decimal(15, 2)

  createdAt          DateTime          @default(now()) @map("created_at")

  // Relations
  eInvoice           EInvoice          @relation(fields: [eInvoiceId], references: [id], onDelete: Cascade)
  orderItem          OrderItem?        @relation(fields: [orderItemId], references: [id])

  @@map("e_invoice_items")
}
```

### 3. EInvoiceLog Model

```prisma
model EInvoiceLog {
  id                 String            @id @default(cuid())
  eInvoiceId         String            @map("e_invoice_id")

  // Log Information
  action             String            // CREATE, SEND, QUERY_STATUS, CANCEL, ARCHIVE
  status             String            // SUCCESS, FAILED, PENDING
  requestData        String?           @map("request_data") @db.LongText // JSON
  responseData       String?           @map("response_data") @db.LongText // JSON
  errorCode          String?           @map("error_code")
  errorMessage       String?           @map("error_message") @db.Text

  // GIB Response Fields
  gibTransactionId   String?           @map("gib_transaction_id")
  processingTime     Int?              @map("processing_time") // milliseconds

  createdAt          DateTime          @default(now()) @map("created_at")

  // Relations
  eInvoice           EInvoice          @relation(fields: [eInvoiceId], references: [id], onDelete: Cascade)

  @@map("e_invoice_logs")
}
```

### 4. EInvoiceSettings Model (Business Level)

```prisma
model EInvoiceSettings {
  id                     String          @id @default(cuid())
  businessId             String          @unique @map("business_id")

  // GIB Portal Configuration
  isEnabled              Boolean         @default(false) @map("is_enabled")
  gibUsername            String?         @map("gib_username")
  gibPassword            String?         @map("gib_password") // Encrypted
  gibTestMode            Boolean         @default(true) @map("gib_test_mode")
  gibPortalUrl           String          @default("https://earsivportal.efatura.gov.tr") @map("gib_portal_url")

  // Certificate Information
  certificatePath        String?         @map("certificate_path")
  certificatePassword    String?         @map("certificate_password") // Encrypted
  certificateValidUntil  DateTime?       @map("certificate_valid_until")

  // Invoice Series Configuration
  invoiceSeriesPrefix    String          @default("EMU") @map("invoice_series_prefix")
  currentInvoiceNumber   BigInt          @default(1) @map("current_invoice_number")
  invoiceNumberLength    Int             @default(8) @map("invoice_number_length")

  // Company Information (for UBL)
  companyVkn             String?         @map("company_vkn")
  companyTitle           String?         @map("company_title")
  companyAddress         String?         @map("company_address") @db.Text
  companyDistrict        String?         @map("company_district")
  companyCity            String?         @map("company_city")
  companyPostalCode      String?         @map("company_postal_code")
  companyCountry         String          @default("Türkiye") @map("company_country")
  companyEmail           String?         @map("company_email")
  companyPhone           String?         @map("company_phone")
  companyWebsite         String?         @map("company_website")

  // Auto-Invoice Settings
  autoCreateInvoice      Boolean         @default(false) @map("auto_create_invoice")
  autoSendInvoice        Boolean         @default(false) @map("auto_send_invoice")
  invoiceOnPayment       Boolean         @default(true) @map("invoice_on_payment")
  invoiceOnOrderComplete Boolean         @default(false) @map("invoice_on_order_complete")

  // Archive Settings
  archiveRetentionYears  Int             @default(5) @map("archive_retention_years")
  lastArchiveDate        DateTime?       @map("last_archive_date")

  createdAt              DateTime        @default(now()) @map("created_at")
  updatedAt              DateTime        @updatedAt @map("updated_at")

  // Relations
  business               Business        @relation(fields: [businessId], references: [id], onDelete: Cascade)

  @@map("e_invoice_settings")
}
```

### 5. Business Model Extensions

Existing Business model needs these additions:

```prisma
model Business {
  // ... existing fields ...

  // E-Fatura related fields
  eInvoiceSettings       EInvoiceSettings?
  eInvoices              EInvoice[]

  // ... existing relations ...
}
```

### 6. Order Model Extensions

Existing Order model needs these additions:

```prisma
model Order {
  // ... existing fields ...

  // E-Fatura related fields
  eInvoices              EInvoice[]
  requiresInvoice        Boolean         @default(true) @map("requires_invoice")
  customerVknTckn        String?         @map("customer_vkn_tckn") // Override customer tax id

  // ... existing relations ...
}
```

### 7. OrderItem Model Extensions

```prisma
model OrderItem {
  // ... existing fields ...

  // E-Fatura related fields
  eInvoiceItems          EInvoiceItem[]
  vatRate                Decimal?        @map("vat_rate") @db.Decimal(5, 2)
  vatAmount              Decimal?        @map("vat_amount") @db.Decimal(10, 2)

  // ... existing relations ...
}
```

## Additional Enums and Types

### Turkish Tax Rates

```typescript
export const TURKISH_VAT_RATES = {
  VAT_0: 0, // İstisnalar
  VAT_1: 1, // Temel gıda maddeleri
  VAT_8: 8, // Kitap, gazete vb.
  VAT_18: 18, // Standart oran
} as const;

export const UBL_UNIT_CODES = {
  C62: "C62", // Adet (Piece)
  KGM: "KGM", // Kilogram
  MTR: "MTR", // Metre
  MTK: "MTK", // Metrekare
  HUR: "HUR", // Saat (Hour)
  DAY: "DAY", // Gün
  MON: "MON", // Ay
} as const;
```

## Database Migration Strategy

1. Add new enums first
2. Create new tables in order: EInvoiceSettings, EInvoice, EInvoiceItem, EInvoiceLog
3. Add foreign key relationships
4. Update existing tables (Business, Order, OrderItem)
5. Create indexes for performance
6. Seed with default settings

## Indexes to Create

```sql
-- Performance indexes
CREATE INDEX idx_e_invoices_business_id ON e_invoices(business_id);
CREATE INDEX idx_e_invoices_order_id ON e_invoices(order_id);
CREATE INDEX idx_e_invoices_status ON e_invoices(gib_status);
CREATE INDEX idx_e_invoices_date ON e_invoices(invoice_date);
CREATE INDEX idx_e_invoice_items_e_invoice_id ON e_invoice_items(e_invoice_id);
CREATE INDEX idx_e_invoice_logs_e_invoice_id ON e_invoice_logs(e_invoice_id);
CREATE INDEX idx_e_invoice_logs_created_at ON e_invoice_logs(created_at);
```
