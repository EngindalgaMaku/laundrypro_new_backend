// Temporary types until Prisma client is properly generated
export enum UserRole {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  EMPLOYEE = "EMPLOYEE",
  DRIVER = "DRIVER",
}

export enum BusinessType {
  LAUNDRY = "LAUNDRY",
  DRY_CLEANING = "DRY_CLEANING",
  CARPET_CLEANING = "CARPET_CLEANING",
  UPHOLSTERY_CLEANING = "UPHOLSTERY_CLEANING",
  CURTAIN_CLEANING = "CURTAIN_CLEANING",
  OTHER = "OTHER",
}

export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  IN_PROGRESS = "IN_PROGRESS",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  READY_FOR_DELIVERY = "READY_FOR_DELIVERY",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum Priority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  PAID = "PAID",
  REFUNDED = "REFUNDED",
  CANCELLED = "CANCELLED",
}

export enum PaymentMethod {
  CASH = "CASH",
  CREDIT_CARD = "CREDIT_CARD",
  BANK_TRANSFER = "BANK_TRANSFER",
  MOBILE_PAYMENT = "MOBILE_PAYMENT",
}

// ==========================================
// ROUTE PLANNING SYSTEM ENUMS
// ==========================================

/**
 * Route type enum defining the nature of a route
 */
export enum RouteType {
  PICKUP_ONLY = "PICKUP_ONLY", // Sadece teslim alma rotası
  DELIVERY_ONLY = "DELIVERY_ONLY", // Sadece teslim rotası
  MIXED = "MIXED", // Karma rota (teslim alma + teslim)
  RETURN = "RETURN", // Geri dönüş rotası
}

/**
 * Route status enum tracking the current state of a route
 */
export enum RouteStatus {
  PLANNED = "PLANNED", // Planlandı
  ASSIGNED = "ASSIGNED", // Sürücüye atandı
  IN_PROGRESS = "IN_PROGRESS", // Devam ediyor
  PAUSED = "PAUSED", // Durduruldu
  COMPLETED = "COMPLETED", // Tamamlandı
  CANCELLED = "CANCELLED", // İptal edildi
}

/**
 * Stop type enum defining the nature of a route stop
 */
export enum StopType {
  PICKUP = "PICKUP", // Teslim alma durağı
  DELIVERY = "DELIVERY", // Teslim durağı
  DEPOT = "DEPOT", // Depo/başlangıç noktası
  BREAK = "BREAK", // Mola durağı
}

/**
 * Vehicle status enum tracking vehicle availability and condition
 */
export enum VehicleStatus {
  AVAILABLE = "AVAILABLE", // Müsait
  IN_USE = "IN_USE", // Kullanımda
  MAINTENANCE = "MAINTENANCE", // Bakımda
  OUT_OF_SERVICE = "OUT_OF_SERVICE", // Hizmet dışı
  RETIRED = "RETIRED", // Emekli
}

/**
 * Stop status enum tracking the progress of a route stop
 */
export enum StopStatus {
  PENDING = "PENDING", // Beklemede
  EN_ROUTE = "EN_ROUTE", // Yolda
  ARRIVED = "ARRIVED", // Varış
  IN_PROGRESS = "IN_PROGRESS", // İşlem devam ediyor
  COMPLETED = "COMPLETED", // Tamamlandı
  FAILED = "FAILED", // Başarısız
  SKIPPED = "SKIPPED", // Atlandı
}

// ==========================================
// ROUTE PLANNING INTERFACE TYPES
// ==========================================

/**
 * Vehicle interface representing delivery vehicles
 */
export interface Vehicle {
  id: string;
  businessId: string;

  // Basic vehicle information
  plateNumber: string;
  brand: string;
  model: string;
  year?: number;
  color?: string;

  // Capacity information
  maxWeightKg: number;
  maxItemCount: number;
  maxVolumeM3?: number;

  // Operational information
  status: VehicleStatus;
  isActive: boolean;

  // Driver assignment
  assignedDriverId?: string;

  // Features and constraints
  hasGps: boolean;
  hasRefrigeration: boolean;
  canHandleFragile: boolean;

  // Cost information
  fuelCostPerKm?: number;
  operatingCostPerHour?: number;

  // Maintenance information
  lastMaintenanceDate?: Date;
  nextMaintenanceKm?: number;
  currentKm: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Delivery zone interface representing service areas
 */
export interface DeliveryZone {
  id: string;
  businessId: string;

  // Geographic information
  name: string;
  city: string;
  district: string;

  // Zone boundaries (polygon coordinates)
  boundaries?: string; // GeoJSON polygon coordinates

  // Center coordinates
  centerLat?: number;
  centerLng?: number;

  // Operational information
  isActive: boolean;
  priority: number; // 1=high, 5=low

  // Time constraints
  serviceStartTime?: string; // "09:00"
  serviceEndTime?: string; // "18:00"

  // Service days (JSON array)
  serviceDays?: string; // ["monday", "tuesday", ...]

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Route interface representing planned delivery routes
 */
export interface Route {
  id: string;
  businessId: string;
  vehicleId: string;

  // Route information
  routeName: string;
  routeType: RouteType;
  status: RouteStatus;

  // Planned date and times
  plannedDate: Date;
  plannedStartTime: Date;
  plannedEndTime?: Date;

  // Actual times
  actualStartTime?: Date;
  actualEndTime?: Date;

  // Route statistics
  totalDistance?: number; // km
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes

  // Capacity usage
  totalWeight: number;
  totalItems: number;

  // Optimization information
  optimizedFor: string; // distance, time, priority
  optimizationScore?: number;

  // Cost calculation
  estimatedCost?: number;
  actualCost?: number;

  // Notes and instructions
  notes?: string;
  driverInstructions?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Route stop interface representing individual stops on a route
 */
export interface RouteStop {
  id: string;
  routeId: string;
  deliveryZoneId?: string;

  // Stop information
  stopType: StopType;
  status: StopStatus;
  sequence: number; // Stop order (1, 2, 3, ...)

  // Location information
  address: string;
  latitude?: number;
  longitude?: number;

  // Customer and order information
  customerId?: string;
  customerName?: string;
  customerPhone?: string;

  // Time information
  plannedArrival?: Date;
  estimatedArrival?: Date;
  actualArrival?: Date;
  plannedDeparture?: Date;
  actualDeparture?: Date;

  // Service information
  serviceTime?: number; // minutes
  waitingTime?: number; // minutes

  // Load information
  itemCount: number;
  weight: number;

  // Instructions and notes
  specialInstructions?: string;
  completionNotes?: string;

  // Photo and signature
  photoUrl?: string;
  signatureUrl?: string;

  // Failure status
  failureReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Route assignment interface for vehicle-route assignments
 */
export interface RouteAssignment {
  id: string;
  routeId: string;
  vehicleId: string;
  driverId: string;

  // Assignment information
  assignedAt: Date;
  assignedBy: string; // User ID

  // Status information
  status: string; // assigned, accepted, rejected, completed
  acceptedAt?: Date;
  completedAt?: Date;

  // Notes
  notes?: string;
}

/**
 * Vehicle delivery zone relationship interface
 */
export interface VehicleDeliveryZone {
  id: string;
  vehicleId: string;
  deliveryZoneId: string;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Route stop order relationship interface
 */
export interface RouteStopOrder {
  id: string;
  routeStopId: string;
  orderId: string;
  actionType: string; // "pickup", "delivery"
  sequence: number; // Order sequence at this stop
}

/**
 * Vehicle tracking log interface for real-time GPS tracking
 */
export interface VehicleTrackingLog {
  id: string;
  vehicleId: string;
  driverId?: string;
  routeId?: string;

  // Location information
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy (meters)
  heading?: number; // Direction (degrees)
  speed?: number; // Speed (km/h)

  // Status information
  status: string; // active, idle, offline
  battery?: number; // Device battery level

  // Timestamp
  timestamp: Date;
}
