/**
 * Location Service for GPS tracking, distance calculation, and geocoding
 * Handles all location-related operations for the route planning system
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  address: string;
  city?: string;
  district?: string;
  coordinates?: Coordinates;
}

export interface DistanceCalculationResult {
  distanceKm: number;
  estimatedDurationMinutes: number;
  route?: Coordinates[];
}

export interface LocationTrackingData {
  vehicleId: string;
  driverId?: string;
  routeId?: string;
  coordinates: Coordinates;
  accuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export class LocationService {
  // Haversine formula for calculating distance between two coordinates
  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) *
        Math.cos(this.toRadians(point2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Convert degrees to radians
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Estimate travel time based on distance (using average city speed)
  static estimateTravelTime(
    distanceKm: number,
    averageSpeedKmh: number = 30
  ): number {
    return Math.round((distanceKm / averageSpeedKmh) * 60); // minutes
  }

  // Calculate distance and estimated time between two points
  static calculateDistanceAndTime(
    origin: Coordinates,
    destination: Coordinates,
    averageSpeedKmh: number = 30
  ): DistanceCalculationResult {
    const distanceKm = this.calculateDistance(origin, destination);
    const estimatedDurationMinutes = this.estimateTravelTime(
      distanceKm,
      averageSpeedKmh
    );

    return {
      distanceKm,
      estimatedDurationMinutes,
    };
  }

  // Find the nearest point to a given location from an array of points
  static findNearestLocation<T extends { coordinates?: Coordinates }>(
    currentLocation: Coordinates,
    locations: T[]
  ): { nearest: T | null; distance: number; index: number } {
    if (locations.length === 0) {
      return { nearest: null, distance: Infinity, index: -1 };
    }

    let nearest = locations[0];
    let nearestIndex = 0;
    let minDistance = Infinity;

    locations.forEach((location, index) => {
      if (location.coordinates) {
        const distance = this.calculateDistance(
          currentLocation,
          location.coordinates
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = location;
          nearestIndex = index;
        }
      }
    });

    return {
      nearest: nearest.coordinates ? nearest : null,
      distance: minDistance,
      index: nearestIndex,
    };
  }

  // Sort locations by distance from a reference point
  static sortByDistance<T extends { coordinates?: Coordinates }>(
    referencePoint: Coordinates,
    locations: T[]
  ): (T & { distance: number })[] {
    return locations
      .filter((location) => location.coordinates)
      .map((location) => ({
        ...location,
        distance: this.calculateDistance(referencePoint, location.coordinates!),
      }))
      .sort((a, b) => a.distance - b.distance);
  }

  // Check if a point is within a certain radius of another point
  static isWithinRadius(
    center: Coordinates,
    point: Coordinates,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusKm;
  }

  // Get bounding box for a set of coordinates
  static getBoundingBox(coordinates: Coordinates[]): {
    north: number;
    south: number;
    east: number;
    west: number;
    center: Coordinates;
  } {
    if (coordinates.length === 0) {
      throw new Error("Cannot create bounding box for empty coordinates array");
    }

    let north = coordinates[0].latitude;
    let south = coordinates[0].latitude;
    let east = coordinates[0].longitude;
    let west = coordinates[0].longitude;

    coordinates.forEach((coord) => {
      north = Math.max(north, coord.latitude);
      south = Math.min(south, coord.latitude);
      east = Math.max(east, coord.longitude);
      west = Math.min(west, coord.longitude);
    });

    return {
      north,
      south,
      east,
      west,
      center: {
        latitude: (north + south) / 2,
        longitude: (east + west) / 2,
      },
    };
  }

  // Geocoding helper - Convert address to coordinates (mock implementation)
  // In production, this would use Google Maps API, OpenStreetMap, or similar
  static async geocodeAddress(
    address: string,
    city?: string
  ): Promise<Coordinates | null> {
    // Mock implementation for Turkish cities - in production use real geocoding API
    const turkishCities: { [key: string]: Coordinates } = {
      istanbul: { latitude: 41.0082, longitude: 28.9784 },
      ankara: { latitude: 39.9334, longitude: 32.8597 },
      izmir: { latitude: 38.4237, longitude: 27.1428 },
      bursa: { latitude: 40.1885, longitude: 29.061 },
      antalya: { latitude: 36.8969, longitude: 30.7133 },
      adana: { latitude: 37.0, longitude: 35.3213 },
      konya: { latitude: 37.8713, longitude: 32.4846 },
      şanlıurfa: { latitude: 37.1674, longitude: 38.7955 },
      gaziantep: { latitude: 37.0662, longitude: 37.3833 },
      kayseri: { latitude: 38.7312, longitude: 35.4787 },
    };

    // Simple city-based geocoding
    if (city) {
      const cityKey = city.toLowerCase().replace("ı", "i");
      const cityCoords = turkishCities[cityKey];
      if (cityCoords) {
        // Add small random offset for different addresses in same city
        return {
          latitude: cityCoords.latitude + (Math.random() - 0.5) * 0.01,
          longitude: cityCoords.longitude + (Math.random() - 0.5) * 0.01,
        };
      }
    }

    // Default to Istanbul center if no match
    console.warn(`Could not geocode address: ${address}, city: ${city}`);
    return { latitude: 41.0082, longitude: 28.9784 };
  }

  // Reverse geocoding - Convert coordinates to address (mock implementation)
  static async reverseGeocode(coordinates: Coordinates): Promise<string> {
    // Mock implementation - in production use real reverse geocoding API
    return `Address at ${coordinates.latitude.toFixed(
      4
    )}, ${coordinates.longitude.toFixed(4)}`;
  }

  // Calculate the center point of multiple coordinates
  static getCenterPoint(coordinates: Coordinates[]): Coordinates {
    if (coordinates.length === 0) {
      throw new Error("Cannot calculate center of empty coordinates array");
    }

    const sum = coordinates.reduce(
      (acc, coord) => ({
        latitude: acc.latitude + coord.latitude,
        longitude: acc.longitude + coord.longitude,
      }),
      { latitude: 0, longitude: 0 }
    );

    return {
      latitude: sum.latitude / coordinates.length,
      longitude: sum.longitude / coordinates.length,
    };
  }

  // Check if coordinates are valid
  static isValidCoordinates(coordinates: any): coordinates is Coordinates {
    return (
      coordinates &&
      typeof coordinates.latitude === "number" &&
      typeof coordinates.longitude === "number" &&
      coordinates.latitude >= -90 &&
      coordinates.latitude <= 90 &&
      coordinates.longitude >= -180 &&
      coordinates.longitude <= 180
    );
  }

  // Format coordinates for display
  static formatCoordinates(
    coordinates: Coordinates,
    precision: number = 4
  ): string {
    return `${coordinates.latitude.toFixed(
      precision
    )}, ${coordinates.longitude.toFixed(precision)}`;
  }

  // Calculate total distance for a route with multiple waypoints
  static calculateRouteDistance(waypoints: Coordinates[]): number {
    if (waypoints.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += this.calculateDistance(waypoints[i], waypoints[i + 1]);
    }

    return totalDistance;
  }

  // Optimize route using nearest neighbor algorithm (simple TSP solution)
  static optimizeRoute(
    startPoint: Coordinates,
    destinations: (Coordinates & { id?: string })[],
    endPoint?: Coordinates
  ): (Coordinates & { id?: string })[] {
    if (destinations.length === 0) return [];
    if (destinations.length === 1) return destinations;

    const optimizedRoute: (Coordinates & { id?: string })[] = [];
    const unvisited = [...destinations];
    let currentPoint = startPoint;

    // Greedy nearest neighbor algorithm
    while (unvisited.length > 0) {
      let minDistance = Infinity;
      let nearestIndex = 0;

      // Find nearest unvisited destination
      unvisited.forEach((destination, index) => {
        const distance = this.calculateDistance(currentPoint, destination);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });

      // Move to nearest destination
      const nearestDestination = unvisited[nearestIndex];
      optimizedRoute.push(nearestDestination);
      currentPoint = nearestDestination;
      unvisited.splice(nearestIndex, 1);
    }

    return optimizedRoute;
  }
}

// Mobile-specific location utilities
export class MobileLocationService {
  // Request location permission (to be implemented in mobile app)
  static async requestLocationPermission(): Promise<boolean> {
    // Implementation will be in React Native
    return true;
  }

  // Get current device location (to be implemented in mobile app)
  static async getCurrentLocation(): Promise<Coordinates | null> {
    // Implementation will be in React Native using expo-location
    return null;
  }

  // Start location tracking (to be implemented in mobile app)
  static async startLocationTracking(
    callback: (location: Coordinates) => void,
    options?: {
      accuracy?: "high" | "balanced" | "low";
      interval?: number; // milliseconds
      distanceFilter?: number; // meters
    }
  ): Promise<string | null> {
    // Implementation will be in React Native
    // Returns tracking ID that can be used to stop tracking
    return null;
  }

  // Stop location tracking
  static async stopLocationTracking(trackingId: string): Promise<void> {
    // Implementation will be in React Native
  }

  // Check if location services are enabled
  static async isLocationEnabled(): Promise<boolean> {
    // Implementation will be in React Native
    return true;
  }
}

export default LocationService;
