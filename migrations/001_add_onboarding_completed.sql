-- Migration: Add onboarding_completed field to businesses table
-- Date: 2025-09-25
-- Description: Phase 1 of Long-Term Hybrid Registration - Add onboarding tracking

ALTER TABLE `businesses` 
ADD COLUMN `onboarding_completed` BOOLEAN NOT NULL DEFAULT FALSE 
AFTER `is_active`;

-- Update existing businesses to have onboarding completed (since they already have service types)
UPDATE `businesses` 
SET `onboarding_completed` = TRUE 
WHERE EXISTS (
    SELECT 1 FROM `business_service_types` 
    WHERE `business_service_types`.`business_id` = `businesses`.`id`
);

-- Add index for performance
CREATE INDEX `idx_businesses_onboarding_completed` ON `businesses` (`onboarding_completed`);