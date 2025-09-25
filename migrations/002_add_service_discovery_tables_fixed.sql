-- ==========================================
-- PHASE 2: PROGRESSIVE SERVICE DISCOVERY SYSTEM
-- Migration 002: Add Service Discovery Tables (FIXED VERSION)
-- ==========================================

-- Service Suggestions Table
-- Tracks generated recommendations for businesses
CREATE TABLE IF NOT EXISTS service_suggestions (
  id varchar(191) PRIMARY KEY,
  business_id varchar(191) NOT NULL,
  suggestion_type ENUM('COMPLEMENTARY', 'GEOGRAPHIC', 'SEASONAL', 'DEMAND_BASED') NOT NULL,
  suggested_service_type ENUM('DRY_CLEANING', 'LAUNDRY', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
  reason TEXT,
  priority INT DEFAULT 5,
  shown_at DATETIME NULL,
  dismissed_at DATETIME NULL,
  acted_upon_at DATETIME NULL,
  metadata JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for efficient queries
  INDEX idx_business_suggestions (business_id, created_at),
  INDEX idx_suggestion_type (suggestion_type),
  INDEX idx_suggested_service_type (suggested_service_type),
  INDEX idx_priority_status (business_id, priority, shown_at),
  INDEX idx_active_suggestions (business_id, dismissed_at, acted_upon_at),
  
  -- Foreign key constraint
  CONSTRAINT fk_service_suggestions_business 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Service Expansion History Table  
-- Tracks when businesses add new service types
CREATE TABLE IF NOT EXISTS service_expansion_history (
  id varchar(191) PRIMARY KEY,
  business_id varchar(191) NOT NULL,
  service_type ENUM('DRY_CLEANING', 'LAUNDRY', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
  expansion_reason ENUM('SUGGESTION', 'MANUAL', 'CUSTOMER_REQUEST', 'SEASONAL', 'MARKET_ANALYSIS') DEFAULT 'MANUAL',
  suggestion_id varchar(191) NULL,
  expanded_from_category varchar(191) NULL,
  success_metrics JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for analytics
  INDEX idx_business_expansion (business_id, created_at),
  INDEX idx_expansion_reason (expansion_reason),
  INDEX idx_service_type_expansion (service_type, created_at),
  INDEX idx_suggestion_tracking (suggestion_id),
  
  -- Foreign key constraints
  CONSTRAINT fk_expansion_history_business 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_expansion_history_suggestion 
    FOREIGN KEY (suggestion_id) REFERENCES service_suggestions(id) ON DELETE SET NULL
);

-- Customer Service Requests Table
-- Tracks requests for services that businesses don't currently offer
CREATE TABLE IF NOT EXISTS customer_service_requests (
  id varchar(191) PRIMARY KEY,
  business_id varchar(191) NOT NULL,
  customer_id varchar(191) NULL,
  requested_service_type ENUM('DRY_CLEANING', 'LAUNDRY', 'CARPET_CLEANING', 'UPHOLSTERY_CLEANING', 'CURTAIN_CLEANING', 'IRONING', 'STAIN_REMOVAL', 'OTHER') NOT NULL,
  requested_service_name varchar(191) NOT NULL,
  request_description TEXT NULL,
  request_source ENUM('ORDER_MODAL', 'PHONE_CALL', 'WHATSAPP', 'IN_PERSON', 'OTHER') DEFAULT 'ORDER_MODAL',
  customer_contact varchar(191) NULL,
  urgency_level ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  estimated_demand INT DEFAULT 1,
  status ENUM('PENDING', 'ACKNOWLEDGED', 'PLANNED', 'IMPLEMENTED', 'REJECTED') DEFAULT 'PENDING',
  response_sent_at DATETIME NULL,
  implemented_at DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for demand analysis
  INDEX idx_business_requests (business_id, created_at),
  INDEX idx_requested_service_type (requested_service_type, created_at),
  INDEX idx_request_status (status, created_at),
  INDEX idx_urgency_analysis (business_id, urgency_level, status),
  INDEX idx_demand_tracking (business_id, requested_service_type, status),
  
  -- Foreign key constraints
  CONSTRAINT fk_customer_requests_business 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_requests_customer 
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

-- Service Suggestion Analytics Table
-- Tracks performance metrics for suggestions
CREATE TABLE IF NOT EXISTS service_suggestion_analytics (
  id varchar(191) PRIMARY KEY,
  business_id varchar(191) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  suggestion_type ENUM('COMPLEMENTARY', 'GEOGRAPHIC', 'SEASONAL', 'DEMAND_BASED') NOT NULL,
  total_suggestions INT DEFAULT 0,
  shown_suggestions INT DEFAULT 0,
  dismissed_suggestions INT DEFAULT 0,
  acted_upon_suggestions INT DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
  avg_time_to_action_hours DECIMAL(8,2) DEFAULT 0.00,
  revenue_impact DECIMAL(10,2) DEFAULT 0.00,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique constraint to prevent duplicates
  UNIQUE KEY unique_business_period_type (business_id, period_start, period_end, suggestion_type),
  
  -- Indexes for reporting
  INDEX idx_business_analytics (business_id, period_start),
  INDEX idx_type_performance (suggestion_type, conversion_rate),
  INDEX idx_period_analysis (period_start, period_end),
  
  -- Foreign key constraint
  CONSTRAINT fk_suggestion_analytics_business 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
);

-- Business Service Discovery Settings Table
-- Per-business configuration for discovery system
CREATE TABLE IF NOT EXISTS business_discovery_settings (
  id varchar(191) PRIMARY KEY,
  business_id varchar(191) NOT NULL UNIQUE,
  discovery_enabled BOOLEAN DEFAULT TRUE,
  suggestion_frequency ENUM('DAILY', 'WEEKLY', 'MONTHLY') DEFAULT 'WEEKLY',
  max_suggestions_per_period INT DEFAULT 3,
  auto_dismiss_after_days INT DEFAULT 30,
  preferred_suggestion_types JSON NULL, -- Array of enabled suggestion types
  geographic_scope ENUM('CITY', 'DISTRICT', 'NATIONWIDE') DEFAULT 'CITY',
  seasonal_suggestions_enabled BOOLEAN DEFAULT TRUE,
  demand_threshold_for_suggestions INT DEFAULT 3,
  last_suggestion_generated_at DATETIME NULL,
  total_suggestions_generated INT DEFAULT 0,
  total_suggestions_acted_upon INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT fk_discovery_settings_business 
    FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    
  -- Indexes
  INDEX idx_discovery_enabled (discovery_enabled),
  INDEX idx_suggestion_schedule (suggestion_frequency, last_suggestion_generated_at)
);

-- Insert default seasonal patterns (only if not exists)
INSERT IGNORE INTO seasonal_service_patterns (id, service_type, season, month_start, month_end, demand_multiplier, peak_weeks, description, geographic_relevance) VALUES
('season_dry_winter', 'DRY_CLEANING', 'WINTER', 12, 2, 1.40, '[50, 51, 52, 1, 2, 3, 4]', 'Kış mevsiminde mont, palto ve kalın giysilerin temizlik talebi artar', 'TURKEY'),
('season_dry_fall', 'DRY_CLEANING', 'FALL', 9, 11, 1.25, '[36, 37, 44, 45]', 'Sonbahar mevsiminde mevsim değişimi ile beraber kış giysilerinin hazırlanması', 'TURKEY'),
('season_carpet_spring', 'CARPET_CLEANING', 'SPRING', 3, 5, 1.60, '[12, 13, 14, 15, 16, 17, 18]', 'Bahar temizliği döneminde halı yıkama talebi en yüksek seviyeye çıkar', 'TURKEY'),
('season_carpet_fall', 'CARPET_CLEANING', 'FALL', 9, 11, 1.35, '[36, 37, 38, 39, 40]', 'Sonbahar döneminde kış hazırlıkları için halı temizliği talebi artar', 'TURKEY'),
('season_curtain_spring', 'CURTAIN_CLEANING', 'SPRING', 3, 5, 1.80, '[12, 13, 14, 15, 16]', 'Bahar temizliği döneminde perde yıkama talebi pik yapar', 'TURKEY'),
('season_upholstery_spring', 'UPHOLSTERY_CLEANING', 'SPRING', 3, 5, 1.45, '[12, 13, 14, 15, 16, 17]', 'Bahar temizliğinde koltuk ve döşeme temizliği talebi artar', 'TURKEY'),
('season_laundry_summer', 'LAUNDRY', 'SUMMER', 6, 8, 1.20, '[24, 25, 26, 27, 28, 29, 30, 31, 32]', 'Yaz döneminde sıcaklık nedeniyle çamaşır yıkama sıklığı artar', 'TURKEY');

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_businesses_discovery_ready ON businesses (id, is_active, onboarding_completed);
CREATE INDEX IF NOT EXISTS idx_services_category_active ON services (business_id, category, is_active);
CREATE INDEX IF NOT EXISTS idx_business_service_types_active ON business_service_types (business_id, service_type, is_active);

-- Create a view for easy suggestion analytics
CREATE OR REPLACE VIEW v_suggestion_performance AS
SELECT 
    b.id as business_id,
    b.name as business_name,
    b.city,
    b.district,
    COUNT(s.id) as total_suggestions,
    COUNT(CASE WHEN s.shown_at IS NOT NULL THEN 1 END) as shown_suggestions,
    COUNT(CASE WHEN s.dismissed_at IS NOT NULL THEN 1 END) as dismissed_suggestions,
    COUNT(CASE WHEN s.acted_upon_at IS NOT NULL THEN 1 END) as acted_upon_suggestions,
    CASE 
        WHEN COUNT(CASE WHEN s.shown_at IS NOT NULL THEN 1 END) > 0 
        THEN ROUND((COUNT(CASE WHEN s.acted_upon_at IS NOT NULL THEN 1 END) * 100.0) / COUNT(CASE WHEN s.shown_at IS NOT NULL THEN 1 END), 2)
        ELSE 0 
    END as conversion_rate_percent,
    AVG(CASE 
        WHEN s.acted_upon_at IS NOT NULL AND s.shown_at IS NOT NULL 
        THEN TIMESTAMPDIFF(HOUR, s.shown_at, s.acted_upon_at) 
    END) as avg_hours_to_action
FROM businesses b
LEFT JOIN service_suggestions s ON b.id = s.business_id
WHERE b.is_active = TRUE
GROUP BY b.id, b.name, b.city, b.district;