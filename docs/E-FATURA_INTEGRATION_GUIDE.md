# LaundryPro GIB E-Fatura Integration Guide

## Overview

This guide covers the complete GIB E-Fatura (Electronic Invoice) integration for LaundryPro, enabling Turkish businesses to comply with legal e-invoice requirements through seamless automation.

## Table of Contents

- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Setup and Configuration](#setup-and-configuration)
- [API Documentation](#api-documentation)
- [Frontend Components](#frontend-components)
- [Security Considerations](#security-considerations)
- [Turkish Tax Compliance](#turkish-tax-compliance)
- [Troubleshooting](#troubleshooting)
- [Legal Requirements](#legal-requirements)

## System Architecture

### Components Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   LaundryPro    │────│  E-Fatura Core   │────│   GIB Portal    │
│   Frontend      │    │     Services     │    │      API        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                       │
         └────────────────────────┼───────────────────────┘
                                  │
                         ┌──────────────────┐
                         │    Database      │
                         │   (E-Invoice     │
                         │     Tables)      │
                         └──────────────────┘
```

### Key Services

1. **UBL XML Generator** (`lib/e-fatura/ubl-xml-generator.ts`)

   - Generates UBL 2.1 compliant XML
   - Turkish tax calculations
   - VAT handling

2. **GIB Portal Service** (`lib/e-fatura/gib-portal-service.ts`)

   - SOAP communication with GIB
   - E-signature management
   - Status tracking

3. **Turkish Tax Utils** (`lib/e-fatura/turkish-tax-utils.ts`)
   - VKN/TCKN validation
   - VAT calculations
   - Address validation

## Database Schema

### Core Tables

#### EInvoiceSettings

```sql
CREATE TABLE e_invoice_settings (
    id VARCHAR(191) PRIMARY KEY,
    business_id VARCHAR(191) UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,

    -- GIB Portal Configuration
    gib_username VARCHAR(255),
    gib_password VARCHAR(255), -- Encrypted
    gib_test_mode BOOLEAN DEFAULT TRUE,
    gib_portal_url VARCHAR(500) DEFAULT 'https://earsivportal.efatura.gov.tr',

    -- Certificate Information
    certificate_path VARCHAR(500),
    certificate_password VARCHAR(255), -- Encrypted
    certificate_valid_until DATETIME,

    -- Invoice Series
    invoice_series_prefix VARCHAR(10) DEFAULT 'EMU',
    current_invoice_number BIGINT DEFAULT 1,
    invoice_number_length INT DEFAULT 8,

    -- Company Information
    company_vkn VARCHAR(10),
    company_title VARCHAR(255),
    company_address TEXT,
    company_district VARCHAR(100),
    company_city VARCHAR(100),
    company_postal_code VARCHAR(5),
    company_country VARCHAR(50) DEFAULT 'Türkiye',
    company_email VARCHAR(255),
    company_phone VARCHAR(20),
    company_website VARCHAR(255),

    -- Automation Settings
    auto_create_invoice BOOLEAN DEFAULT FALSE,
    auto_send_invoice BOOLEAN DEFAULT FALSE,
    invoice_on_payment BOOLEAN DEFAULT TRUE,
    invoice_on_order_complete BOOLEAN DEFAULT FALSE,

    -- Archive Settings
    archive_retention_years INT DEFAULT 5,
    last_archive_date DATETIME,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
```

#### EInvoice

```sql
CREATE TABLE e_invoices (
    id VARCHAR(191) PRIMARY KEY,
    business_id VARCHAR(191) NOT NULL,
    order_id VARCHAR(191),

    -- GIB Required Fields
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_series_id VARCHAR(10) NOT NULL,
    invoice_date DATETIME NOT NULL,
    invoice_time DATETIME NOT NULL,

    -- Customer Information
    buyer_vkn_tckn VARCHAR(11) NOT NULL,
    buyer_title VARCHAR(255) NOT NULL,
    buyer_name VARCHAR(100),
    buyer_surname VARCHAR(100),
    buyer_address TEXT NOT NULL,
    buyer_district VARCHAR(100) NOT NULL,
    buyer_city VARCHAR(100) NOT NULL,
    buyer_country VARCHAR(50) DEFAULT 'Türkiye',
    buyer_email VARCHAR(255),
    buyer_phone VARCHAR(20),

    -- Financial Information
    currency_code VARCHAR(3) DEFAULT 'TRY',
    subtotal_amount DECIMAL(15,2) NOT NULL,
    vat_amount DECIMAL(15,2) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    payable_amount DECIMAL(15,2) NOT NULL,

    -- GIB Integration Fields
    invoice_uuid VARCHAR(36) UNIQUE,
    ettn VARCHAR(36) UNIQUE,
    gib_status ENUM('DRAFT','CREATED','SIGNED','SENT','ACCEPTED','REJECTED','CANCELLED','ARCHIVED') DEFAULT 'DRAFT',
    gib_status_date DATETIME,
    gib_error_code VARCHAR(20),
    gib_error_message TEXT,

    -- UBL XML Data
    ubl_xml_content LONGTEXT,
    signed_xml_content LONGTEXT,
    pdf_content LONGTEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    sent_at DATETIME,

    FOREIGN KEY (business_id) REFERENCES businesses(id),
    FOREIGN KEY (order_id) REFERENCES orders(id),

    INDEX idx_business_id (business_id),
    INDEX idx_order_id (order_id),
    INDEX idx_gib_status (gib_status),
    INDEX idx_invoice_date (invoice_date)
);
```

#### EInvoiceItem

```sql
CREATE TABLE e_invoice_items (
    id VARCHAR(191) PRIMARY KEY,
    e_invoice_id VARCHAR(191) NOT NULL,
    order_item_id VARCHAR(191),

    -- Item Information
    item_name VARCHAR(255) NOT NULL,
    item_description TEXT,
    quantity DECIMAL(10,3) NOT NULL,
    unit_code VARCHAR(10) DEFAULT 'C62',
    unit_price DECIMAL(15,4) NOT NULL,
    line_amount DECIMAL(15,2) NOT NULL,

    -- Tax Information
    vat_rate DECIMAL(5,2) NOT NULL,
    vat_amount DECIMAL(15,2) NOT NULL,
    vat_exemption_code VARCHAR(10),
    vat_exemption_reason VARCHAR(255),

    -- Additional Fields
    discount_amount DECIMAL(15,2) DEFAULT 0,
    line_total DECIMAL(15,2) NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (e_invoice_id) REFERENCES e_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id),

    INDEX idx_e_invoice_id (e_invoice_id)
);
```

#### EInvoiceLog

```sql
CREATE TABLE e_invoice_logs (
    id VARCHAR(191) PRIMARY KEY,
    e_invoice_id VARCHAR(191) NOT NULL,

    -- Log Information
    action VARCHAR(50) NOT NULL, -- CREATE, SEND, QUERY_STATUS, CANCEL, ARCHIVE
    status VARCHAR(20) NOT NULL, -- SUCCESS, FAILED, PENDING
    request_data LONGTEXT,
    response_data LONGTEXT,
    error_code VARCHAR(50),
    error_message TEXT,

    -- GIB Response Fields
    gib_transaction_id VARCHAR(100),
    processing_time INT, -- milliseconds

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (e_invoice_id) REFERENCES e_invoices(id) ON DELETE CASCADE,

    INDEX idx_e_invoice_id (e_invoice_id),
    INDEX idx_created_at (created_at)
);
```

## Setup and Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# GIB E-Fatura Configuration
GIB_PORTAL_URL=https://earsivportal.efatura.gov.tr
GIB_TEST_URL=https://efaturaportaltest.gib.gov.tr

# Certificate Storage
CERTIFICATE_UPLOAD_PATH=./certificates
MAX_CERTIFICATE_SIZE=5242880

# E-Invoice Settings
DEFAULT_INVOICE_PREFIX=EMU
DEFAULT_RETENTION_YEARS=5
```

### 2. Database Migration

Run Prisma migration:

```bash
npx prisma db push
npx prisma generate
```

### 3. Required Dependencies

The integration uses these key packages:

```json
{
  "xml2js": "^0.6.2",
  "xmlbuilder2": "^3.1.1",
  "node-soap": "^0.45.0",
  "node-forge": "^1.3.1",
  "joi": "^17.11.0",
  "puppeteer": "^21.5.0",
  "fast-xml-parser": "^4.3.2",
  "uuid": "^9.0.1"
}
```

### 4. GIB Portal Setup

1. **Register with GIB Portal**

   - Visit [e-Fatura Portal](https://earsivportal.efatura.gov.tr)
   - Complete business registration
   - Obtain API credentials

2. **E-Signature Certificate**

   - Acquire e-signature certificate from authorized providers
   - Upload certificate file (.p12 or .pfx)
   - Configure certificate password

3. **Test Environment**
   - Use test portal for development: `https://efaturaportaltest.gib.gov.tr`
   - Switch to production when ready

## API Documentation

### Authentication

All API endpoints require proper business authentication. Include business ID in requests:

```javascript
const headers = {
  "Content-Type": "application/json",
  "X-Business-Id": "your-business-id",
};
```

### Core Endpoints

#### 1. Create Invoice

**POST** `/api/invoices/create`

```javascript
const invoiceData = {
  businessId: "business-id",
  orderId: "order-id", // Optional
  customer: {
    vknTckn: "1234567890", // 10-digit VKN or 11-digit TCKN
    title: "ABC Şirketi Ltd. Şti.",
    name: "Ahmet", // For individuals
    surname: "Yılmaz", // For individuals
    address: "Atatürk Cad. No: 123 Kat: 4 D: 10",
    district: "Kadıköy",
    city: "İstanbul",
    email: "ahmet@abc.com",
    phone: "+90 212 555 0000",
  },
  items: [
    {
      name: "Salon Halısı Yıkama",
      description: "3x4 metre salon halısı yıkama hizmeti",
      quantity: 1,
      unitCode: "C62", // Adet
      unitPrice: 150.0,
      vatRate: 18, // Optional, will be calculated
    },
  ],
  notes: "Müşteri notu",
};

const response = await fetch("/api/invoices/create", {
  method: "POST",
  headers: headers,
  body: JSON.stringify(invoiceData),
});
```

**Response:**

```javascript
{
  "success": true,
  "invoice": {
    "id": "invoice-id",
    "invoiceNumber": "EMU00000001",
    "status": "DRAFT",
    "totalAmount": 177.00,
    "items": [...],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### 2. Send Invoice to GIB

**POST** `/api/invoices/send`

```javascript
const sendData = {
  invoiceId: "invoice-id",
};

const response = await fetch("/api/invoices/send", {
  method: "POST",
  headers: headers,
  body: JSON.stringify(sendData),
});
```

**Response:**

```javascript
{
  "success": true,
  "invoiceUuid": "550e8400-e29b-41d4-a716-446655440000",
  "ettn": "C4A0A2AB12345678901234567890ABCD",
  "status": "SENT",
  "transactionId": "txn-12345"
}
```

#### 3. Query Invoice Status

**POST** `/api/invoices/status`

```javascript
const statusQuery = {
  invoiceId: "invoice-id", // or invoiceUuid
};

const response = await fetch("/api/invoices/status", {
  method: "POST",
  headers: headers,
  body: JSON.stringify(statusQuery),
});
```

**Response:**

```javascript
{
  "success": true,
  "invoice": {
    "id": "invoice-id",
    "invoiceNumber": "EMU00000001",
    "status": "ACCEPTED",
    "statusDate": "2024-01-15T11:00:00Z",
    "errorCode": null,
    "errorMessage": null,
    "lastUpdated": "2024-01-15T11:00:00Z"
  }
}
```

#### 4. Cancel Invoice

**POST** `/api/invoices/cancel`

```javascript
const cancelData = {
  invoiceId: "invoice-id",
  reason: "Müşteri talebi üzerine iptal",
};

const response = await fetch("/api/invoices/cancel", {
  method: "POST",
  headers: headers,
  body: JSON.stringify(cancelData),
});
```

#### 5. Archive Management

**GET** `/api/invoices/archive?businessId=business-id&syncWithGIB=true`

Retrieves archived invoices and optionally syncs with GIB Portal.

### Settings API

#### Get Settings

**GET** `/api/settings/e-fatura?businessId=business-id`

#### Save Settings

**POST** `/api/settings/e-fatura`

```javascript
const settings = {
  businessId: "business-id",
  isEnabled: true,
  gibUsername: "gib-username",
  gibPassword: "gib-password",
  gibTestMode: false,
  gibPortalUrl: "https://earsivportal.efatura.gov.tr",

  // Company information
  companyVkn: "1234567890",
  companyTitle: "ABC Temizlik Ltd. Şti.",
  companyAddress: "Şirket adresi",
  companyDistrict: "Kadıköy",
  companyCity: "İstanbul",
  companyPostalCode: "34000",
  companyEmail: "info@abc.com",
  companyPhone: "+90 212 555 0000",

  // Invoice settings
  invoiceSeriesPrefix: "EMU",
  currentInvoiceNumber: 1,
  invoiceNumberLength: 8,

  // Automation
  autoCreateInvoice: true,
  autoSendInvoice: false,
  invoiceOnPayment: true,
  invoiceOnOrderComplete: false,

  // Archive
  archiveRetentionYears: 5,
};
```

## Frontend Components

### E-Fatura Settings Page

Located at `/app/settings/e-fatura/page.tsx`, this comprehensive settings page includes:

- **General Settings**: Enable/disable, invoice numbering
- **GIB Portal**: Connection settings, credentials, test mode
- **Company Information**: Tax number, address, contact details
- **Automation**: Auto-invoice creation triggers
- **Certificate Management**: Upload and manage e-signature certificates

### Key Features:

1. **Tabbed Interface**: Organized settings into logical groups
2. **Real-time Validation**: Turkish tax number validation, address validation
3. **Connection Testing**: Test GIB Portal connectivity
4. **Certificate Upload**: Secure certificate file handling
5. **Status Indicators**: Visual feedback for connection status

### Usage Example:

```typescript
import { useState, useEffect } from 'react';

const EFaturaSettings = () => {
  const [settings, setSettings] = useState<EInvoiceSettings>(defaultSettings);

  const loadSettings = async () => {
    const response = await fetch(`/api/settings/e-fatura?businessId=${businessId}`);
    const data = await response.json();
    if (data.settings) {
      setSettings(data.settings);
    }
  };

  const saveSettings = async () => {
    const response = await fetch('/api/settings/e-fatura', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });

    if (response.ok) {
      // Success handling
    }
  };

  return (
    // Component JSX
  );
};
```

## Security Considerations

### 1. Credential Protection

- **Encrypted Storage**: GIB passwords encrypted in database
- **Certificate Security**: E-signature certificates stored securely
- **Environment Variables**: Sensitive config in environment files
- **Access Control**: API endpoints require proper authentication

### 2. Data Protection

- **KVKV Compliance**: Personal data handled according to Turkish GDPR
- **Audit Trails**: All operations logged in `e_invoice_logs`
- **Data Retention**: Automatic archiving after retention period
- **Secure Communication**: HTTPS/TLS for all API calls

### 3. Certificate Management

```typescript
// Certificate validation example
const validateCertificate = async (certificateFile: File, password: string) => {
  try {
    const formData = new FormData();
    formData.append("certificate", certificateFile);
    formData.append("password", password);

    const response = await fetch("/api/e-fatura/validate-certificate", {
      method: "POST",
      body: formData,
    });

    return response.ok;
  } catch (error) {
    console.error("Certificate validation error:", error);
    return false;
  }
};
```

## Turkish Tax Compliance

### VAT Rates (KDV)

The system supports all Turkish VAT rates:

- **0%**: Exemptions and zero-rated supplies
- **1%**: Basic necessities (food, medicine, books)
- **8%**: Specific categories (books, newspapers, magazines)
- **18%**: Standard rate (most goods and services)
- **20%**: Luxury items (since 2024 for certain categories)

### Tax Number Validation

#### VKN (Vergi Kimlik Numarası) - 10 digits

```typescript
import { validateVKN } from "@/lib/e-fatura/turkish-tax-utils";

const isValid = validateVKN("1234567890");
// Returns: boolean
```

#### TCKN (TC Kimlik Numarası) - 11 digits

```typescript
import { validateTCKN } from "@/lib/e-fatura/turkish-tax-utils";

const isValid = validateTCKN("12345678901");
// Returns: boolean
```

### Address Validation

```typescript
import { validateTurkishAddress } from "@/lib/e-fatura/turkish-tax-utils";

const validation = validateTurkishAddress({
  street: "Atatürk Cad. No: 123",
  district: "Kadıköy",
  city: "İstanbul",
  postalCode: "34000",
});

// Returns: { isValid: boolean, errors: string[] }
```

### Tax Calculations

```typescript
import { calculateTurkishVAT } from "@/lib/e-fatura/turkish-tax-utils";

const result = calculateTurkishVAT(100, 18); // 100 TL, 18% VAT
// Returns:
// {
//   netAmount: 100.00,
//   vatRate: 18,
//   vatAmount: 18.00,
//   grossAmount: 118.00,
//   roundedVatAmount: 18.00,
//   roundedGrossAmount: 118.00
// }
```

## Troubleshooting

### Common Issues

#### 1. GIB Portal Connection Errors

**Problem**: Unable to connect to GIB Portal

**Solutions**:

- Verify credentials are correct
- Check test mode settings
- Ensure portal URL is correct
- Verify network connectivity
- Check certificate validity

**Debug Steps**:

```typescript
const testConnection = async () => {
  try {
    const gibService = new GIBPortalService(credentials);
    const isConnected = await gibService.testConnection();
    console.log("Connection status:", isConnected);
  } catch (error) {
    console.error("Connection error:", error);
  }
};
```

#### 2. Certificate Issues

**Problem**: E-signature certificate errors

**Solutions**:

- Verify certificate file format (.p12 or .pfx)
- Check certificate password
- Ensure certificate is not expired
- Verify certificate is valid for e-invoicing

**Certificate Validation**:

```typescript
import forge from "node-forge";

const validateCertificate = (certificateData: Buffer, password: string) => {
  try {
    const p12Der = forge.util.encode64(certificateData);
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    return {
      isValid: true,
      certificate: p12,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};
```

#### 3. Tax Calculation Errors

**Problem**: Incorrect VAT calculations

**Solutions**:

- Verify service category VAT mapping
- Check rounding rules (Turkish law requires 2 decimal places)
- Validate tax exemption codes
- Review net/gross amount calculations

#### 4. Invoice Status Issues

**Problem**: Invoice status not updating

**Solutions**:

- Check GIB Portal communication
- Verify invoice UUID is correct
- Review status polling frequency
- Check for GIB Portal maintenance windows

### Error Codes

#### GIB Portal Error Codes

- `1001`: Invalid credentials
- `1002`: Invalid invoice format
- `1003`: Duplicate invoice number
- `1004`: Invalid tax number
- `1005`: Certificate error
- `9999`: System error

#### Application Error Handling

```typescript
const handleGIBError = (errorCode: string) => {
  switch (errorCode) {
    case "1001":
      return "GIB Portal kullanıcı bilgileri hatalı";
    case "1002":
      return "Fatura formatı geçersiz";
    case "1003":
      return "Bu fatura numarası daha önce kullanılmış";
    case "1004":
      return "Vergi/TC kimlik numarası geçersiz";
    case "1005":
      return "E-imza sertifikası hatası";
    default:
      return "Bilinmeyen hata oluştu";
  }
};
```

### Logging and Monitoring

#### Database Logs

All operations are logged in `e_invoice_logs` table:

```sql
SELECT
  action,
  status,
  error_message,
  processing_time,
  created_at
FROM e_invoice_logs
WHERE e_invoice_id = 'invoice-id'
ORDER BY created_at DESC;
```

#### Application Logging

```typescript
const logInvoiceOperation = async (
  invoiceId: string,
  action: string,
  status: string,
  data?: any,
  error?: string
) => {
  await prisma.eInvoiceLog.create({
    data: {
      eInvoiceId: invoiceId,
      action,
      status,
      requestData: data ? JSON.stringify(data) : null,
      errorMessage: error,
      processingTime: Date.now() - startTime,
    },
  });
};
```

## Legal Requirements

### 1. Turkish E-Invoice Law

- **Mandatory**: Required for B2B transactions above certain thresholds
- **Retention**: 5-year minimum archive requirement
- **Format**: UBL 2.1 XML format mandatory
- **Timing**: Must be issued within legal timeframes
- **Authentication**: Digital signature required

### 2. GIB Compliance

- **Registration**: Business must be registered with GIB Portal
- **Credentials**: Valid GIB Portal credentials required
- **Certificate**: Valid e-signature certificate mandatory
- **Reporting**: Regular status reporting to authorities
- **Audit**: Full audit trail maintenance required

### 3. Data Protection (KVKV)

- **Personal Data**: Customer data protected under Turkish GDPR
- **Consent**: Proper consent for data processing
- **Security**: Appropriate security measures
- **Breach**: Breach notification procedures
- **Rights**: Customer data rights support

### 4. Archive Requirements

```typescript
const handleArchiveCompliance = async (businessId: string) => {
  const settings = await prisma.eInvoiceSettings.findUnique({
    where: { businessId },
  });

  const retentionDate = new Date();
  retentionDate.setFullYear(
    retentionDate.getFullYear() - settings.archiveRetentionYears
  );

  // Archive old invoices
  const archivedCount = await prisma.eInvoice.updateMany({
    where: {
      businessId,
      createdAt: { lte: retentionDate },
      gibStatus: { in: ["ACCEPTED", "CANCELLED"] },
    },
    data: { gibStatus: "ARCHIVED" },
  });

  return archivedCount.count;
};
```

## Best Practices

### 1. Development Workflow

1. **Start with Test Mode**: Always develop using GIB test portal
2. **Certificate Management**: Use development certificates for testing
3. **Error Handling**: Implement comprehensive error handling
4. **Logging**: Log all operations for debugging
5. **Validation**: Validate all data before sending to GIB

### 2. Production Deployment

1. **Security Review**: Complete security audit before deployment
2. **Certificate Installation**: Install production e-signature certificates
3. **Credentials**: Switch to production GIB credentials
4. **Testing**: Thorough testing with real data
5. **Monitoring**: Set up monitoring and alerting

### 3. Maintenance

1. **Regular Updates**: Keep dependencies updated
2. **Certificate Renewal**: Monitor certificate expiry dates
3. **Archive Management**: Regular archive operations
4. **Status Monitoring**: Regular status checks for pending invoices
5. **Backup**: Regular backup of invoice data

### 4. Performance Optimization

```typescript
// Batch processing for multiple invoices
const processBatchInvoices = async (invoiceIds: string[]) => {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < invoiceIds.length; i += batchSize) {
    const batch = invoiceIds.slice(i, i + batchSize);
    const batchPromises = batch.map((id) => processInvoice(id));
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
  }

  return results;
};
```

## Support and Resources

### Official Resources

- [GIB E-Fatura Portal](https://earsivportal.efatura.gov.tr)
- [GIB Documentation](https://www.gib.gov.tr)
- [UBL 2.1 Specification](http://docs.oasis-open.org/ubl/UBL-2.1.html)

### Development Resources

- **Test Portal**: `https://efaturaportaltest.gib.gov.tr`
- **WSDL URLs**: Available in GIB Portal documentation
- **Certificate Providers**: Authorized e-signature providers in Turkey

### Technical Support

For technical issues related to this integration:

1. Check logs in `e_invoice_logs` table
2. Review error messages and codes
3. Consult troubleshooting section
4. Contact development team with detailed error information

---

_This integration ensures full compliance with Turkish e-invoice regulations while providing seamless automation for LaundryPro users._
