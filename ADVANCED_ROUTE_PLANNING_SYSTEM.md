# Advanced Route Planning System with Order Integration

## Overview

This system provides comprehensive route planning capabilities with advanced order integration, location-based optimization, and real-time vehicle tracking. The implementation focuses on mobile-first functionality with automatic route suggestions based on vehicle location and order proximity.

## Key Features Implemented

### 🚚 **Order-to-Route Integration**

- Automatic assignment of pickup and delivery orders to routes
- Smart filtering based on order status (PENDING, CONFIRMED, READY_FOR_DELIVERY, OUT_FOR_DELIVERY)
- Capacity-aware assignment considering vehicle weight and item limits
- Priority-based order sequencing

### 📍 **Location-Based Optimization**

- Real-time GPS tracking for vehicles
- Distance-based route optimization using Haversine formula
- Proximity-based order clustering
- Automatic geocoding for addresses

### 🗺️ **Smart Route Generation**

- Automatic route creation based on available orders and vehicles
- Location clustering to create efficient routes
- Priority-based order sequencing (URGENT → HIGH → NORMAL → LOW)
- Vehicle capacity optimization

### 📱 **Mobile Applications**

- **Route Planning Screen**: Interactive interface for route management
- **Vehicle Tracking Screen**: Real-time GPS tracking for drivers
- **Location Services**: Enhanced mobile location utilities
- Real-time order suggestions based on vehicle location

## System Architecture

### Backend Components

#### 1. Location Service (`lib/services/location-service.ts`)

```typescript
class LocationService {
  // Distance calculation using Haversine formula
  static calculateDistance(point1: Coordinates, point2: Coordinates): number;

  // Route optimization using nearest neighbor algorithm
  static optimizeRoute(
    startPoint: Coordinates,
    destinations: Coordinates[]
  ): Coordinates[];

  // Find nearest locations to a reference point
  static findNearestLocation<T>(
    currentLocation: Coordinates,
    locations: T[]
  ): T;
}
```

#### 2. Order-Route Integration Service (`lib/services/order-route-integration.ts`)

```typescript
class OrderRouteIntegrationService {
  // Get orders ready for route assignment
  static async getOrdersReadyForRoutes(
    businessId: string,
    types: ("pickup" | "delivery")[]
  ): Promise<OrderLocationData[]>;

  // Assign orders to existing route automatically
  static async assignOrdersToRoute(
    routeId: string,
    businessId: string,
    options: RouteOptimizationOptions
  ): Promise<RouteAssignmentResult>;

  // Generate optimal routes automatically
  static async generateOptimalRoutes(
    businessId: string,
    targetDate: Date,
    options: RouteOptimizationOptions
  ): Promise<AutoRouteGenerationResult>;
}
```

#### 3. API Endpoints

- **GET** `/api/route-integration/available-orders` - Get orders available for routing
- **POST** `/api/route-integration/assign-orders` - Assign orders to a route
- **POST** `/api/route-integration/generate-routes` - Auto-generate optimal routes
- **GET** `/api/route-integration/nearby-orders` - Get nearby delivery orders
- **GET** `/api/route-integration/suggest-pickup-route` - Suggest optimal pickup route
- **POST** `/api/vehicle-tracking/update-location` - Update vehicle location
- **GET** `/api/vehicle-tracking/update-location` - Get vehicle tracking logs

### Mobile Components

#### 1. Enhanced Location Service (`mobile/src/services/mobile/LocationService.ts`)

```typescript
class LocationService {
  // Vehicle tracking
  static async startVehicleTracking(
    vehicleId: string,
    options: TrackingOptions
  ): Promise<LocationSubscription>;
  static async stopVehicleTracking(): Promise<void>;

  // Route planning
  static async getAvailableOrdersForRoutes(
    types: ("pickup" | "delivery")[]
  ): Promise<OrderLocationData[]>;
  static async getNearbyOrders(
    location: Coordinates,
    radiusKm: number
  ): Promise<OrderLocationData[]>;
  static async suggestPickupRoute(
    vehicleId: string,
    currentLocation: Coordinates,
    maxStops: number
  ): Promise<OrderLocationData[]>;

  // Route optimization
  static async generateOptimalRoutes(
    targetDate: Date,
    options: RouteOptimizationOptions
  ): Promise<any>;
  static async assignOrdersToRoute(
    routeId: string,
    options: RouteOptimizationOptions
  ): Promise<any>;
}
```

#### 2. Route Planning Screen (`mobile/src/screens/routes/RoutePlanningScreen.tsx`)

- **Suggested Orders Tab**: Shows AI-recommended pickup orders based on vehicle location
- **Nearby Orders Tab**: Displays delivery orders within configurable radius
- **Available Orders Tab**: Lists all orders ready for route assignment
- **Auto-Generate Routes**: Creates optimal routes automatically
- **Manual Assignment**: Assign selected orders to existing routes

#### 3. Vehicle Tracking Screen (`mobile/src/screens/routes/VehicleTrackingScreen.tsx`)

- Real-time GPS tracking with start/stop controls
- Live tracking statistics (duration, distance, speed)
- Location display with map integration
- Route planning integration

## Database Schema

The system utilizes the existing comprehensive database schema with these key tables:

### Core Route Planning Tables

```sql
-- Vehicles with tracking capabilities
Vehicle {
  id, plateNumber, maxWeightKg, maxItemCount
  hasGps, currentKm, assignedDriverId
  latitude?, longitude? -- Current position
}

-- Routes with optimization data
Route {
  id, routeName, routeType, status
  plannedDate, plannedStartTime, plannedEndTime
  totalDistance, estimatedDuration, optimizedFor
  optimizationScore, totalWeight, totalItems
}

-- Route stops with location data
RouteStop {
  id, routeId, sequence, stopType, status
  address, latitude, longitude
  customerId, customerName, customerPhone
  plannedArrival, actualArrival, itemCount, weight
}

-- Real-time vehicle tracking
VehicleTrackingLog {
  id, vehicleId, driverId, routeId
  latitude, longitude, accuracy, heading, speed
  status, timestamp
}

-- Order-stop relationships
RouteStopOrder {
  id, routeStopId, orderId, actionType, sequence
}
```

### Location-Enhanced Tables

```sql
-- Customers with coordinates
Customer {
  id, firstName, lastName, phone, address
  city, district, latitude?, longitude?
}

-- Orders with pickup/delivery addresses
Order {
  id, customerId, status, priority
  pickupAddress?, deliveryAddress?
  pickupDate?, deliveryDate?
}
```

## Usage Examples

### 1. Auto-Generate Routes

```typescript
// API Call
POST /api/route-integration/generate-routes
{
  "targetDate": "2025-01-15",
  "maxStops": 15,
  "prioritizeUrgent": true,
  "vehicleCapacityWeight": 1000,
  "vehicleCapacityItems": 50
}

// Response
{
  "success": true,
  "generatedRoutes": [
    {
      "routeId": "route-123",
      "routeName": "Auto Route - Kadıköy - 2025-01-15",
      "vehicleId": "vehicle-456",
      "stopCount": 12,
      "totalDistance": 45.7,
      "estimatedDuration": 180
    }
  ],
  "unassignedOrders": [],
  "message": "Generated 1 routes with 12 stops"
}
```

### 2. Get Nearby Orders

```typescript
// API Call
GET /api/route-integration/nearby-orders?latitude=41.0082&longitude=28.9784&radius=5

// Response
{
  "success": true,
  "orders": [
    {
      "orderId": "order-789",
      "orderNumber": "ORD-12345",
      "customerName": "Ahmet Yılmaz",
      "customerPhone": "+905551234567",
      "status": "READY_FOR_DELIVERY",
      "priority": "HIGH",
      "deliveryAddress": "Kadıköy, İstanbul",
      "deliveryCoordinates": {
        "latitude": 40.9925,
        "longitude": 29.0249
      },
      "distance": 1.2
    }
  ],
  "count": 1,
  "radiusKm": 5
}
```

### 3. Start Vehicle Tracking (Mobile)

```typescript
// Mobile App
const subscription = await LocationService.startVehicleTracking("vehicle-123", {
  routeId: "route-456",
  driverId: "driver-789",
  updateInterval: 30000, // 30 seconds
  distanceFilter: 100, // 100 meters
});

// Automatically sends location updates to server
```

### 4. Suggest Pickup Route (Mobile)

```typescript
// Mobile App
const suggestedOrders = await LocationService.suggestPickupRoute(
  "vehicle-123",
  currentLocation,
  10 // max stops
);

// Returns orders sorted by distance and priority
```

## Route Optimization Algorithm

### 1. Order Clustering

- Groups orders by geographical location (rounded coordinates)
- Creates location clusters to minimize travel distance
- Considers delivery zones and districts

### 2. Priority-Based Sequencing

```typescript
const priorityWeights = {
  URGENT: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
};

// Orders are sorted by: Priority Weight → Distance → Pickup Date
```

### 3. Nearest Neighbor Optimization

- Starts from vehicle's current location or depot
- Selects nearest unvisited destination
- Minimizes total route distance
- Considers vehicle capacity constraints

### 4. Mixed Route Handling

- Prioritizes pickup orders first
- Sequences delivery orders after pickups
- Optimizes stop order within each category

## Real-Time Features

### Vehicle Tracking

- **Update Frequency**: 30 seconds or 100 meters movement
- **Data Transmitted**: GPS coordinates, speed, heading, accuracy
- **Battery Optimization**: Configurable update intervals
- **Offline Support**: Queues updates when offline

### Route Suggestions

- **Context-Aware**: Considers vehicle location and capacity
- **Real-Time Updates**: Updates suggestions as orders change
- **Distance-Based**: Shows orders within configurable radius
- **Priority Integration**: Weighs urgent orders higher

## Performance Considerations

### Database Optimization

- Indexed location columns for fast spatial queries
- Optimized route queries with proper joins
- Efficient vehicle tracking log storage with time-based partitioning

### Mobile Performance

- Background location updates with minimal battery impact
- Efficient API calls with pagination and filtering
- Local caching of route data for offline access
- Optimized UI updates to prevent unnecessary re-renders

### API Performance

- Route optimization runs asynchronously for large datasets
- Cached geocoding results to reduce external API calls
- Efficient distance calculations using pre-computed coordinates
- Batch processing for multiple order assignments

## Security & Privacy

### Location Privacy

- Location data encrypted in transit
- GPS tracking only active during work hours
- User consent required for location sharing
- Data retention policies for tracking logs

### API Security

- Authentication required for all route planning endpoints
- Business-level data isolation
- Rate limiting on resource-intensive operations
- Input validation and sanitization

## Monitoring & Analytics

### Route Performance Metrics

- Average route completion time
- On-time delivery percentage
- Distance optimization efficiency
- Vehicle utilization rates

### System Health Monitoring

- API response times
- Database query performance
- Mobile app crash rates
- GPS tracking accuracy

## Future Enhancements

### Advanced Features

- **Machine Learning**: Route optimization using historical data
- **Traffic Integration**: Real-time traffic data for route planning
- **Customer Preferences**: Delivery time windows and preferences
- **Multi-Depot**: Support for multiple warehouses/depots

### Mobile Enhancements

- **Offline Maps**: Cached map data for offline route viewing
- **Voice Navigation**: Turn-by-turn navigation integration
- **Photo Capture**: Delivery proof and damage documentation
- **Digital Signatures**: Customer signature capture

### Analytics & Reporting

- **Route Performance Dashboard**: Visual analytics for route efficiency
- **Driver Performance**: Individual driver statistics and rankings
- **Cost Analysis**: Fuel costs and route profitability analysis
- **Customer Satisfaction**: Delivery time and route quality metrics

---

## Getting Started

1. **Backend Setup**: All API endpoints are already implemented and ready to use
2. **Mobile Integration**: Import the enhanced LocationService in your React Native app
3. **Database**: The existing schema supports all route planning features
4. **Testing**: Use the provided API endpoints to test route generation and optimization

The system is production-ready and provides a comprehensive foundation for advanced route planning with order integration and location-based optimization.
