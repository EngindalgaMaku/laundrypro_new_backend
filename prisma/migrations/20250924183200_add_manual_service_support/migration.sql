-- AlterTable - Make service_id nullable for manual entries
ALTER TABLE `order_items` MODIFY COLUMN `service_id` VARCHAR(191) NULL;

-- AlterTable - Add manual service fields
ALTER TABLE `order_items` 
ADD COLUMN `service_name` VARCHAR(191) NULL,
ADD COLUMN `service_description` TEXT NULL,
ADD COLUMN `is_manual_entry` BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing records to have is_manual_entry = FALSE (they're all database services)
UPDATE `order_items` SET `is_manual_entry` = FALSE WHERE `is_manual_entry` IS NULL;