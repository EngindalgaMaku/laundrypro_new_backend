-- CreateTable
CREATE TABLE `businesses` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `businessType` ENUM('LAUNDRY', 'DRY_CLEANING', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'OTHER') NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `tax_number` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `role` ENUM('OWNER', 'MANAGER', 'EMPLOYEE', 'DRIVER') NOT NULL DEFAULT 'EMPLOYEE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `whatsapp` VARCHAR(191) NULL,
    `whatsapp_verified` BOOLEAN NOT NULL DEFAULT false,
    `address` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `district` VARCHAR(191) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `customer_type` VARCHAR(191) NOT NULL DEFAULT 'individual',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `category` ENUM('LAUNDRY', 'DRY_CLEANING', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `order_number` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `assigned_user_id` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
    `pickup_date` DATE NULL,
    `pickup_time` DATETIME(3) NULL,
    `delivery_date` DATE NULL,
    `delivery_time` DATETIME(3) NULL,
    `pickup_address` VARCHAR(191) NULL,
    `delivery_address` VARCHAR(191) NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `payment_status` ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `payment_method` ENUM('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT') NULL,
    `notes` TEXT NULL,
    `special_instructions` TEXT NULL,
    `requires_invoice` BOOLEAN NOT NULL DEFAULT true,
    `customer_vkn_tckn` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_number_key`(`order_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `service_pricing_id` VARCHAR(191) NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `notes` TEXT NULL,
    `vat_rate` DECIMAL(5, 2) NULL,
    `vat_amount` DECIMAL(10, 2) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_status_history` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'READY_FOR_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED') NOT NULL,
    `changed_by` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT') NOT NULL,
    `status` ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `transaction_id` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_logs` (
    `id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `content` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'SENT',
    `sent_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_pricings` (
    `id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `pricing_type` ENUM('FIXED', 'PER_ITEM', 'PER_KG', 'PER_M2', 'HOURLY') NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `min_quantity` INTEGER NULL DEFAULT 1,
    `max_quantity` INTEGER NULL,
    `unit` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `trigger` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `variables` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_messages` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NULL,
    `order_id` VARCHAR(191) NULL,
    `message_id` VARCHAR(191) NULL,
    `wa_id` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'sent',
    `content` TEXT NULL,
    `template_name` VARCHAR(191) NULL,
    `template_data` TEXT NULL,
    `media_url` VARCHAR(191) NULL,
    `error_code` VARCHAR(191) NULL,
    `error_message` TEXT NULL,
    `timestamp` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_messages_message_id_key`(`message_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_templates` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'tr',
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `components` TEXT NOT NULL,
    `variables` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `businessId_name`(`business_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_webhooks` (
    `id` VARCHAR(191) NOT NULL,
    `event` VARCHAR(191) NOT NULL,
    `payload` TEXT NOT NULL,
    `processed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `whatsapp_settings` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `access_token` TEXT NULL,
    `phone_number_id` VARCHAR(191) NULL,
    `business_account_id` VARCHAR(191) NULL,
    `webhook_token` VARCHAR(191) NULL,
    `display_phone_number` VARCHAR(191) NULL,
    `quality_rating` VARCHAR(191) NULL,
    `rate_limit_hit` BOOLEAN NOT NULL DEFAULT false,
    `last_sync` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `whatsapp_settings_business_id_key`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `e_invoice_settings` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT false,
    `gib_username` VARCHAR(191) NULL,
    `gib_password` VARCHAR(191) NULL,
    `gib_test_mode` BOOLEAN NOT NULL DEFAULT true,
    `gib_portal_url` VARCHAR(191) NOT NULL DEFAULT 'https://earsivportal.efatura.gov.tr',
    `certificate_path` VARCHAR(191) NULL,
    `certificate_password` VARCHAR(191) NULL,
    `certificate_valid_until` DATETIME(3) NULL,
    `invoice_series_prefix` VARCHAR(191) NOT NULL DEFAULT 'EMU',
    `current_invoice_number` BIGINT NOT NULL DEFAULT 1,
    `invoice_number_length` INTEGER NOT NULL DEFAULT 8,
    `company_vkn` VARCHAR(191) NULL,
    `company_title` VARCHAR(191) NULL,
    `company_address` TEXT NULL,
    `company_district` VARCHAR(191) NULL,
    `company_city` VARCHAR(191) NULL,
    `company_postal_code` VARCHAR(191) NULL,
    `company_country` VARCHAR(191) NOT NULL DEFAULT 'Türkiye',
    `company_email` VARCHAR(191) NULL,
    `company_phone` VARCHAR(191) NULL,
    `company_website` VARCHAR(191) NULL,
    `auto_create_invoice` BOOLEAN NOT NULL DEFAULT false,
    `auto_send_invoice` BOOLEAN NOT NULL DEFAULT false,
    `invoice_on_payment` BOOLEAN NOT NULL DEFAULT true,
    `invoice_on_order_complete` BOOLEAN NOT NULL DEFAULT false,
    `archive_retention_years` INTEGER NOT NULL DEFAULT 5,
    `last_archive_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `e_invoice_settings_business_id_key`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `e_invoices` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `invoice_series_id` VARCHAR(191) NOT NULL,
    `invoice_date` DATETIME(3) NOT NULL,
    `invoice_time` DATETIME(3) NOT NULL,
    `buyer_vkn_tckn` VARCHAR(191) NOT NULL,
    `buyer_title` VARCHAR(191) NOT NULL,
    `buyer_name` VARCHAR(191) NULL,
    `buyer_surname` VARCHAR(191) NULL,
    `buyer_address` TEXT NOT NULL,
    `buyer_district` VARCHAR(191) NOT NULL,
    `buyer_city` VARCHAR(191) NOT NULL,
    `buyer_country` VARCHAR(191) NOT NULL DEFAULT 'Türkiye',
    `buyer_email` VARCHAR(191) NULL,
    `buyer_phone` VARCHAR(191) NULL,
    `currency_code` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `subtotal_amount` DECIMAL(15, 2) NOT NULL,
    `vat_amount` DECIMAL(15, 2) NOT NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `payable_amount` DECIMAL(15, 2) NOT NULL,
    `invoice_uuid` VARCHAR(191) NULL,
    `ettn` VARCHAR(191) NULL,
    `gib_status` ENUM('DRAFT', 'CREATED', 'SIGNED', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `gib_status_date` DATETIME(3) NULL,
    `gib_error_code` VARCHAR(191) NULL,
    `gib_error_message` TEXT NULL,
    `ubl_xml_content` LONGTEXT NULL,
    `signed_xml_content` LONGTEXT NULL,
    `pdf_content` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `sent_at` DATETIME(3) NULL,

    UNIQUE INDEX `e_invoices_invoice_number_key`(`invoice_number`),
    UNIQUE INDEX `e_invoices_invoice_uuid_key`(`invoice_uuid`),
    UNIQUE INDEX `e_invoices_ettn_key`(`ettn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `e_invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `e_invoice_id` VARCHAR(191) NOT NULL,
    `order_item_id` VARCHAR(191) NULL,
    `item_name` VARCHAR(191) NOT NULL,
    `item_description` TEXT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `unit_code` VARCHAR(191) NOT NULL DEFAULT 'C62',
    `unit_price` DECIMAL(15, 4) NOT NULL,
    `line_amount` DECIMAL(15, 2) NOT NULL,
    `vat_rate` DECIMAL(5, 2) NOT NULL,
    `vat_amount` DECIMAL(15, 2) NOT NULL,
    `vat_exemption_code` VARCHAR(191) NULL,
    `vat_exemption_reason` VARCHAR(191) NULL,
    `discount_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `e_invoice_logs` (
    `id` VARCHAR(191) NOT NULL,
    `e_invoice_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `request_data` LONGTEXT NULL,
    `response_data` LONGTEXT NULL,
    `error_code` VARCHAR(191) NULL,
    `error_message` TEXT NULL,
    `gib_transaction_id` VARCHAR(191) NULL,
    `processing_time` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicles` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `plate_number` VARCHAR(191) NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NULL,
    `color` VARCHAR(191) NULL,
    `max_weight_kg` DECIMAL(8, 2) NOT NULL,
    `max_item_count` INTEGER NOT NULL,
    `max_volume_m3` DECIMAL(6, 2) NULL,
    `status` ENUM('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `assigned_driver_id` VARCHAR(191) NULL,
    `has_gps` BOOLEAN NOT NULL DEFAULT true,
    `has_refrigeration` BOOLEAN NOT NULL DEFAULT false,
    `can_handle_fragile` BOOLEAN NOT NULL DEFAULT true,
    `fuel_cost_per_km` DECIMAL(5, 3) NULL,
    `operating_cost_per_hour` DECIMAL(8, 2) NULL,
    `last_maintenance_date` DATETIME(3) NULL,
    `next_maintenance_km` INTEGER NULL,
    `current_km` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vehicles_plate_number_key`(`plate_number`),
    UNIQUE INDEX `vehicles_assigned_driver_id_key`(`assigned_driver_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_zones` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `boundaries` TEXT NULL,
    `center_lat` DOUBLE NULL,
    `center_lng` DOUBLE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `service_start_time` VARCHAR(191) NULL,
    `service_end_time` VARCHAR(191) NULL,
    `service_days` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `delivery_zones_business_id_city_district_key`(`business_id`, `city`, `district`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `routes` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `route_name` VARCHAR(191) NOT NULL,
    `routeType` ENUM('PICKUP_ONLY', 'DELIVERY_ONLY', 'MIXED', 'RETURN') NOT NULL DEFAULT 'MIXED',
    `status` ENUM('PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `planned_date` DATE NOT NULL,
    `planned_start_time` DATETIME(3) NOT NULL,
    `planned_end_time` DATETIME(3) NULL,
    `actual_start_time` DATETIME(3) NULL,
    `actual_end_time` DATETIME(3) NULL,
    `total_distance` DECIMAL(8, 2) NULL,
    `estimated_duration` INTEGER NULL,
    `actual_duration` INTEGER NULL,
    `total_weight` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `total_items` INTEGER NOT NULL DEFAULT 0,
    `optimizedFor` VARCHAR(191) NOT NULL DEFAULT 'distance',
    `optimization_score` DECIMAL(5, 2) NULL,
    `estimated_cost` DECIMAL(10, 2) NULL,
    `actual_cost` DECIMAL(10, 2) NULL,
    `notes` TEXT NULL,
    `driver_instructions` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_stops` (
    `id` VARCHAR(191) NOT NULL,
    `route_id` VARCHAR(191) NOT NULL,
    `delivery_zone_id` VARCHAR(191) NULL,
    `stopType` ENUM('PICKUP', 'DELIVERY', 'DEPOT', 'BREAK') NOT NULL,
    `status` ENUM('PENDING', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `sequence` INTEGER NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `customer_id` VARCHAR(191) NULL,
    `customer_name` VARCHAR(191) NULL,
    `customer_phone` VARCHAR(191) NULL,
    `planned_arrival` DATETIME(3) NULL,
    `estimated_arrival` DATETIME(3) NULL,
    `actual_arrival` DATETIME(3) NULL,
    `planned_departure` DATETIME(3) NULL,
    `actual_departure` DATETIME(3) NULL,
    `service_time` INTEGER NULL,
    `waiting_time` INTEGER NULL,
    `item_count` INTEGER NOT NULL DEFAULT 0,
    `weight` DECIMAL(8, 2) NOT NULL DEFAULT 0,
    `special_instructions` TEXT NULL,
    `completion_notes` TEXT NULL,
    `photo_url` VARCHAR(191) NULL,
    `signature_url` VARCHAR(191) NULL,
    `failure_reason` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_assignments` (
    `id` VARCHAR(191) NOT NULL,
    `route_id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NOT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `assigned_by` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'assigned',
    `accepted_at` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `notes` TEXT NULL,

    UNIQUE INDEX `route_assignments_route_id_vehicle_id_key`(`route_id`, `vehicle_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_delivery_zones` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `delivery_zone_id` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicle_delivery_zones_vehicle_id_delivery_zone_id_key`(`vehicle_id`, `delivery_zone_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_stop_orders` (
    `id` VARCHAR(191) NOT NULL,
    `route_stop_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NOT NULL,
    `actionType` VARCHAR(191) NOT NULL,
    `sequence` INTEGER NOT NULL,

    UNIQUE INDEX `route_stop_orders_route_stop_id_order_id_key`(`route_stop_id`, `order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle_tracking_logs` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `driver_id` VARCHAR(191) NULL,
    `route_id` VARCHAR(191) NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `accuracy` DOUBLE NULL,
    `heading` DOUBLE NULL,
    `speed` DOUBLE NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `battery` INTEGER NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vehicle_tracking_logs_vehicle_id_timestamp_idx`(`vehicle_id`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_assigned_user_id_fkey` FOREIGN KEY (`assigned_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_service_pricing_id_fkey` FOREIGN KEY (`service_pricing_id`) REFERENCES `service_pricings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_status_history` ADD CONSTRAINT `order_status_history_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_pricings` ADD CONSTRAINT `service_pricings_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_pricings` ADD CONSTRAINT `service_pricings_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_templates` ADD CONSTRAINT `notification_templates_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_messages` ADD CONSTRAINT `whatsapp_messages_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_templates` ADD CONSTRAINT `whatsapp_templates_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsapp_settings` ADD CONSTRAINT `whatsapp_settings_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `e_invoice_settings` ADD CONSTRAINT `e_invoice_settings_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `e_invoices` ADD CONSTRAINT `e_invoices_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `e_invoices` ADD CONSTRAINT `e_invoices_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `e_invoice_items` ADD CONSTRAINT `e_invoice_items_e_invoice_id_fkey` FOREIGN KEY (`e_invoice_id`) REFERENCES `e_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `e_invoice_items` ADD CONSTRAINT `e_invoice_items_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `e_invoice_logs` ADD CONSTRAINT `e_invoice_logs_e_invoice_id_fkey` FOREIGN KEY (`e_invoice_id`) REFERENCES `e_invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicles` ADD CONSTRAINT `vehicles_assigned_driver_id_fkey` FOREIGN KEY (`assigned_driver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_zones` ADD CONSTRAINT `delivery_zones_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `routes` ADD CONSTRAINT `routes_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_delivery_zone_id_fkey` FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stops` ADD CONSTRAINT `route_stops_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_assignments` ADD CONSTRAINT `route_assignments_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_assignments` ADD CONSTRAINT `route_assignments_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_assignments` ADD CONSTRAINT `route_assignments_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_assignments` ADD CONSTRAINT `route_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_delivery_zones` ADD CONSTRAINT `vehicle_delivery_zones_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_delivery_zones` ADD CONSTRAINT `vehicle_delivery_zones_delivery_zone_id_fkey` FOREIGN KEY (`delivery_zone_id`) REFERENCES `delivery_zones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stop_orders` ADD CONSTRAINT `route_stop_orders_route_stop_id_fkey` FOREIGN KEY (`route_stop_id`) REFERENCES `route_stops`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `route_stop_orders` ADD CONSTRAINT `route_stop_orders_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_tracking_logs` ADD CONSTRAINT `vehicle_tracking_logs_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_tracking_logs` ADD CONSTRAINT `vehicle_tracking_logs_driver_id_fkey` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle_tracking_logs` ADD CONSTRAINT `vehicle_tracking_logs_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
