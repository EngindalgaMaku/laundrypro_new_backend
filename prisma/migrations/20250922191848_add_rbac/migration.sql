-- AlterTable
ALTER TABLE `orders` ADD COLUMN `delivery_notes` TEXT NULL,
    ADD COLUMN `order_info` TEXT NULL,
    ADD COLUMN `reference_code` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `consent_date` DATETIME(3) NULL,
    ADD COLUMN `custom_permissions` TEXT NULL,
    ADD COLUMN `failed_login_attempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `kvkk_consent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `last_password_change` DATETIME(3) NULL,
    ADD COLUMN `locked_until` DATETIME(3) NULL,
    ADD COLUMN `marketing_consent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `privacy_consent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `role_id` VARCHAR(191) NULL,
    ADD COLUMN `terms_consent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `two_factor_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `two_factor_secret` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `plan` ENUM('FREE', 'PRO') NOT NULL DEFAULT 'FREE',
    `provider` VARCHAR(191) NULL,
    `product_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `period_end` DATETIME(3) NULL,
    `trial_end` DATETIME(3) NULL,
    `last_verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `subscriptions_business_id_key`(`business_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `conditions` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `permissions_name_key`(`name`),
    INDEX `permissions_category_action_idx`(`category`, `action`),
    INDEX `permissions_resource_idx`(`resource`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `is_system` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `conditions` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `role_permissions_role_id_idx`(`role_id`),
    INDEX `role_permissions_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `role_permissions_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `session_id` VARCHAR(191) NOT NULL,
    `device_info` TEXT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `last_activity` DATETIME(3) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_sessions_session_id_key`(`session_id`),
    INDEX `user_sessions_user_id_is_active_idx`(`user_id`, `is_active`),
    INDEX `user_sessions_session_id_is_active_idx`(`session_id`, `is_active`),
    INDEX `user_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `resource_id` VARCHAR(191) NULL,
    `permission` VARCHAR(191) NOT NULL,
    `result` VARCHAR(191) NOT NULL,
    `metadata` TEXT NULL,
    `ip_address` VARCHAR(191) NULL,
    `user_agent` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `permission_audit_logs_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `permission_audit_logs_action_created_at_idx`(`action`, `created_at`),
    INDEX `permission_audit_logs_resource_action_idx`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `business_service_types` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `service_type` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `business_service_types_business_id_service_type_key`(`business_id`, `service_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `business_id` VARCHAR(191) NOT NULL,
    `order_id` VARCHAR(191) NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `invoice_date` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
    `customer_id` VARCHAR(191) NULL,
    `customer_name` VARCHAR(191) NOT NULL,
    `customer_phone` VARCHAR(191) NULL,
    `customer_email` VARCHAR(191) NULL,
    `customer_address` TEXT NULL,
    `customer_vkn_tckn` VARCHAR(191) NULL,
    `currency_code` VARCHAR(191) NOT NULL DEFAULT 'TRY',
    `subtotal_amount` DECIMAL(15, 2) NOT NULL,
    `tax_amount` DECIMAL(15, 2) NOT NULL,
    `total_amount` DECIMAL(15, 2) NOT NULL,
    `payment_status` ENUM('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `payment_method` ENUM('CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT') NULL,
    `notes` TEXT NULL,
    `due_date` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `pdf_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` VARCHAR(191) NOT NULL,
    `invoice_id` VARCHAR(191) NOT NULL,
    `order_item_id` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `quantity` DECIMAL(10, 3) NOT NULL,
    `unit_price` DECIMAL(15, 4) NOT NULL,
    `line_amount` DECIMAL(15, 2) NOT NULL,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `tax_amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `line_total` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_sessions` ADD CONSTRAINT `user_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_audit_logs` ADD CONSTRAINT `permission_audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `business_service_types` ADD CONSTRAINT `business_service_types_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_business_id_fkey` FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
