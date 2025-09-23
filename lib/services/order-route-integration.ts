/**
 * Order-Route Integration Service
 * Handles automatic assignment of orders to routes based on location and priority
 */

import {
  PrismaClient,
  OrderStatus,
  RouteStatus,
  StopType,
} from "@prisma/client";
import LocationService, { Coordinates } from "./location-service";

const prisma = new PrismaClient();

export interface OrderLocationData {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  priority: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  pickupCoordinates?: Coordinates;
  deliveryCoordinates?: Coordinates;
  pickupDate?: Date;
  deliveryDate?: Date;
  estimatedWeight: number;
  itemCount: number;
  totalAmount: number;
}

export interface RouteOptimizationOptions {
  maxDistance?: number; // Maximum route distance in km
  maxDuration?: number; // Maximum route duration in minutes
  maxStops?: number; // Maximum stops per route
  prioritizeUrgent?: boolean;
  vehicleCapacityWeight?: number;
  vehicleCapacityItems?: number;
}

export interface RouteAssignmentResult {
  success: boolean;
  routeId?: string;
  routeName?: string;
  assignedStops: number;
  skippedOrders: string[];
  message: string;
}

export interface AutoRouteGenerationResult {
  success: boolean;
  generatedRoutes: {
    routeId: string;
    routeName: string;
    vehicleId: string;
    stopCount: number;
    totalDistance: number;
    estimatedDuration: number;
  }[];
  unassignedOrders: string[];
  message: string;
}

export class OrderRouteIntegrationService {
  /**
   * Get orders ready for route assignment
   */
  static async getOrdersReadyForRoutes(
    businessId: string,
    includeTypes: ("pickup" | "delivery")[] = ["pickup", "delivery"]
  ): Promise<OrderLocationData[]> {
    const statusFilters = [];

    if (includeTypes.includes("pickup")) {
      statusFilters.push("PENDING", "CONFIRMED");
    }

    if (includeTypes.includes("delivery")) {
      statusFilters.push("READY_FOR_DELIVERY", "OUT_FOR_DELIVERY");
    }

    const orders = await prisma.order.findMany({
      where: {
        businessId,
        status: { in: statusFilters as OrderStatus[] },
        // Only include orders not already assigned to active routes
        routeStopOrders: {
          none: {
            routeStop: {
              route: {
                status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
              },
            },
          },
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address: true,
            city: true,
            district: true,
            latitude: true,
            longitude: true,
          },
        },
        orderItems: {
          select: {
            quantity: true,
            totalPrice: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { pickupDate: "asc" },
        { deliveryDate: "asc" },
        { createdAt: "asc" },
      ],
    });

    return orders.map((order) => {
      const customerCoords =
        order.customer.latitude && order.customer.longitude
          ? {
              latitude: order.customer.latitude,
              longitude: order.customer.longitude,
            }
          : undefined;

      const estimatedWeight =
        order.orderItems.reduce(
          (total, item) => total + Number(item.quantity),
          0
        ) * 2; // Estimate 2kg per item
      const itemCount = order.orderItems.reduce(
        (total, item) => total + Number(item.quantity),
        0
      );

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        customerPhone: order.customer.phone,
        status: order.status,
        priority: order.priority,
        pickupAddress:
          order.pickupAddress || order.customer.address || undefined,
        deliveryAddress:
          order.deliveryAddress || order.customer.address || undefined,
        pickupCoordinates: customerCoords,
        deliveryCoordinates: customerCoords,
        pickupDate: order.pickupDate || undefined,
        deliveryDate: order.deliveryDate || undefined,
        estimatedWeight,
        itemCount,
        totalAmount: Number(order.totalAmount),
      };
    });
  }

  /**
   * Assign orders to an existing route automatically
   */
  static async assignOrdersToRoute(
    routeId: string,
    businessId: string,
    options: RouteOptimizationOptions = {}
  ): Promise<RouteAssignmentResult> {
    // Get route details
    const route = await prisma.route.findFirst({
      where: { id: routeId, businessId },
      include: {
        vehicle: {
          select: {
            maxWeightKg: true,
            maxItemCount: true,
            maxVolumeM3: true,
          },
        },
        stops: {
          include: {
            orders: true,
          },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!route) {
      return {
        success: false,
        assignedStops: 0,
        skippedOrders: [],
        message: "Route not found",
      };
    }

    if (route.status !== "PLANNED") {
      return {
        success: false,
        assignedStops: 0,
        skippedOrders: [],
        message: "Can only assign orders to planned routes",
      };
    }

    // Get available orders
    const availableOrders = await this.getOrdersReadyForRoutes(businessId);

    if (availableOrders.length === 0) {
      return {
        success: true,
        routeId,
        routeName: route.routeName,
        assignedStops: 0,
        skippedOrders: [],
        message: "No orders available for assignment",
      };
    }

    // Calculate current route capacity usage
    const currentWeight = Number(route.totalWeight);
    const currentItems = route.totalItems;
    const maxWeight = Number(route.vehicle.maxWeightKg);
    const maxItems = route.vehicle.maxItemCount;

    // Filter orders that fit capacity constraints
    const eligibleOrders = availableOrders.filter((order) => {
      const wouldExceedWeight =
        currentWeight + order.estimatedWeight > maxWeight;
      const wouldExceedItems = currentItems + order.itemCount > maxItems;

      return !wouldExceedWeight && !wouldExceedItems;
    });

    // Get route center point if stops exist
    let routeCenter: Coordinates | null = null;
    if (route.stops.length > 0) {
      const stopCoordinates = route.stops
        .filter((stop) => stop.latitude && stop.longitude)
        .map((stop) => ({
          latitude: stop.latitude!,
          longitude: stop.longitude!,
        }));

      if (stopCoordinates.length > 0) {
        routeCenter = LocationService.getCenterPoint(stopCoordinates);
      }
    }

    // Sort orders by distance to route center or by priority
    let ordersToAssign = eligibleOrders;
    if (routeCenter) {
      const ordersWithCoords = eligibleOrders.filter(
        (o) => o.pickupCoordinates
      );
      const ordersWithoutCoords = eligibleOrders.filter(
        (o) => !o.pickupCoordinates
      );

      // Convert to format expected by LocationService
      const coordsForSorting = ordersWithCoords.map((o) => ({
        ...o,
        coordinates: o.pickupCoordinates,
      }));

      const sortedWithCoords = LocationService.sortByDistance(
        routeCenter,
        coordsForSorting
      ).map(({ distance, coordinates, ...order }) => order);

      ordersToAssign = [...sortedWithCoords, ...ordersWithoutCoords];
    }

    // Apply additional filters
    const maxStops = options.maxStops || 20;
    const remainingCapacity = maxStops - route.stops.length;
    ordersToAssign = ordersToAssign.slice(0, remainingCapacity);

    // Assign orders to route
    let assignedCount = 0;
    const skippedOrders: string[] = [];

    for (const order of ordersToAssign) {
      try {
        // Determine stop type based on order status
        const stopType: StopType =
          order.status === "PENDING" || order.status === "CONFIRMED"
            ? "PICKUP"
            : "DELIVERY";

        // Create route stop
        const stopSequence = route.stops.length + assignedCount + 1;

        const routeStop = await prisma.routeStop.create({
          data: {
            routeId,
            stopType,
            sequence: stopSequence,
            address:
              stopType === "PICKUP"
                ? order.pickupAddress!
                : order.deliveryAddress!,
            latitude: order.pickupCoordinates?.latitude,
            longitude: order.pickupCoordinates?.longitude,
            customerId: order.customerId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            itemCount: order.itemCount,
            weight: order.estimatedWeight,
            plannedArrival:
              stopType === "PICKUP" ? order.pickupDate : order.deliveryDate,
          },
        });

        // Link order to route stop
        await prisma.routeStopOrder.create({
          data: {
            routeStopId: routeStop.id,
            orderId: order.orderId,
            actionType: stopType.toLowerCase(),
            sequence: 1,
          },
        });

        assignedCount++;
      } catch (error) {
        console.error(`Failed to assign order ${order.orderNumber}:`, error);
        skippedOrders.push(order.orderNumber);
      }
    }

    // Update route totals
    if (assignedCount > 0) {
      const newTotalWeight =
        currentWeight +
        ordersToAssign
          .slice(0, assignedCount)
          .reduce((sum, order) => sum + order.estimatedWeight, 0);

      const newTotalItems =
        currentItems +
        ordersToAssign
          .slice(0, assignedCount)
          .reduce((sum, order) => sum + order.itemCount, 0);

      await prisma.route.update({
        where: { id: routeId },
        data: {
          totalWeight: newTotalWeight,
          totalItems: newTotalItems,
          updatedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      routeId,
      routeName: route.routeName,
      assignedStops: assignedCount,
      skippedOrders,
      message: `Successfully assigned ${assignedCount} orders to route`,
    };
  }

  /**
   * Generate routes automatically based on available orders and vehicles
   */
  static async generateOptimalRoutes(
    businessId: string,
    targetDate: Date,
    options: RouteOptimizationOptions = {}
  ): Promise<AutoRouteGenerationResult> {
    // Get available vehicles
    const availableVehicles = await prisma.vehicle.findMany({
      where: {
        businessId,
        isActive: true,
        status: "AVAILABLE",
        // Check if vehicle is not already assigned for the target date
        routes: {
          none: {
            plannedDate: {
              gte: new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate()
              ),
              lt: new Date(
                targetDate.getFullYear(),
                targetDate.getMonth(),
                targetDate.getDate() + 1
              ),
            },
            status: { in: ["PLANNED", "ASSIGNED", "IN_PROGRESS"] },
          },
        },
      },
      include: {
        assignedDriver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (availableVehicles.length === 0) {
      return {
        success: false,
        generatedRoutes: [],
        unassignedOrders: [],
        message: "No available vehicles for the target date",
      };
    }

    // Get orders ready for routing
    const availableOrders = await this.getOrdersReadyForRoutes(businessId);

    if (availableOrders.length === 0) {
      return {
        success: true,
        generatedRoutes: [],
        unassignedOrders: [],
        message: "No orders available for routing",
      };
    }

    // Group orders by location to create efficient routes
    const locationGroups = this.groupOrdersByLocation(availableOrders);
    const generatedRoutes = [];
    const unassignedOrders: string[] = [];

    let vehicleIndex = 0;

    for (const locationGroup of locationGroups) {
      if (vehicleIndex >= availableVehicles.length) {
        // No more vehicles available
        locationGroup.orders.forEach((order) =>
          unassignedOrders.push(order.orderNumber)
        );
        continue;
      }

      const vehicle = availableVehicles[vehicleIndex];

      // Create route
      try {
        const routeName = `Auto Route - ${locationGroup.centerName} - ${
          targetDate.toISOString().split("T")[0]
        }`;

        const route = await prisma.route.create({
          data: {
            businessId,
            vehicleId: vehicle.id,
            routeName,
            routeType: "MIXED",
            status: "PLANNED",
            plannedDate: targetDate,
            plannedStartTime: new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              9,
              0
            ),
            plannedEndTime: new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate(),
              17,
              0
            ),
            optimizedFor: "distance",
            totalWeight: locationGroup.totalWeight,
            totalItems: locationGroup.totalItems,
          },
        });

        // Add stops to route
        const optimizedOrders = this.optimizeOrderSequence(
          locationGroup.orders,
          locationGroup.center
        );

        for (let i = 0; i < optimizedOrders.length; i++) {
          const order = optimizedOrders[i];
          const stopType: StopType =
            order.status === "PENDING" || order.status === "CONFIRMED"
              ? "PICKUP"
              : "DELIVERY";

          const routeStop = await prisma.routeStop.create({
            data: {
              routeId: route.id,
              stopType,
              sequence: i + 1,
              address:
                stopType === "PICKUP"
                  ? order.pickupAddress!
                  : order.deliveryAddress!,
              latitude: order.pickupCoordinates?.latitude,
              longitude: order.pickupCoordinates?.longitude,
              customerId: order.customerId,
              customerName: order.customerName,
              customerPhone: order.customerPhone,
              itemCount: order.itemCount,
              weight: order.estimatedWeight,
              plannedArrival:
                stopType === "PICKUP" ? order.pickupDate : order.deliveryDate,
            },
          });

          // Link order to route stop
          await prisma.routeStopOrder.create({
            data: {
              routeStopId: routeStop.id,
              orderId: order.orderId,
              actionType: stopType.toLowerCase(),
              sequence: 1,
            },
          });
        }

        // Calculate route distance and duration
        const routeDistance = this.calculateRouteDistance(optimizedOrders);
        const estimatedDuration =
          LocationService.estimateTravelTime(routeDistance);

        // Update route with calculated values
        await prisma.route.update({
          where: { id: route.id },
          data: {
            totalDistance: routeDistance,
            estimatedDuration,
          },
        });

        generatedRoutes.push({
          routeId: route.id,
          routeName,
          vehicleId: vehicle.id,
          stopCount: optimizedOrders.length,
          totalDistance: routeDistance,
          estimatedDuration,
        });

        vehicleIndex++;
      } catch (error) {
        console.error("Failed to create route:", error);
        locationGroup.orders.forEach((order) =>
          unassignedOrders.push(order.orderNumber)
        );
      }
    }

    return {
      success: true,
      generatedRoutes,
      unassignedOrders,
      message: `Generated ${
        generatedRoutes.length
      } routes with ${generatedRoutes.reduce(
        (sum, r) => sum + r.stopCount,
        0
      )} stops`,
    };
  }

  /**
   * Group orders by geographical location
   */
  private static groupOrdersByLocation(orders: OrderLocationData[]) {
    // Simple clustering by city/district or coordinates
    const groups = new Map<
      string,
      {
        orders: OrderLocationData[];
        center: Coordinates;
        centerName: string;
        totalWeight: number;
        totalItems: number;
      }
    >();

    for (const order of orders) {
      // Use customer address or default location
      let groupKey = "default";
      let center: Coordinates = { latitude: 41.0082, longitude: 28.9784 }; // Istanbul default
      let centerName = "Mixed Location";

      if (order.pickupCoordinates) {
        // Round coordinates to create location clusters
        const roundedLat =
          Math.round(order.pickupCoordinates.latitude * 100) / 100;
        const roundedLng =
          Math.round(order.pickupCoordinates.longitude * 100) / 100;
        groupKey = `${roundedLat},${roundedLng}`;
        center = order.pickupCoordinates;
        centerName = order.pickupAddress?.split(",")[0] || "Location Cluster";
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          orders: [],
          center,
          centerName,
          totalWeight: 0,
          totalItems: 0,
        });
      }

      const group = groups.get(groupKey)!;
      group.orders.push(order);
      group.totalWeight += order.estimatedWeight;
      group.totalItems += order.itemCount;
    }

    return Array.from(groups.values());
  }

  /**
   * Optimize the sequence of orders within a location group
   */
  private static optimizeOrderSequence(
    orders: OrderLocationData[],
    startPoint: Coordinates
  ): OrderLocationData[] {
    // Separate pickup and delivery orders
    const pickupOrders = orders.filter(
      (o) => o.status === "PENDING" || o.status === "CONFIRMED"
    );
    const deliveryOrders = orders.filter(
      (o) =>
        o.status === "READY_FOR_DELIVERY" || o.status === "OUT_FOR_DELIVERY"
    );

    // Prioritize by urgency and optimize by location
    const optimizedPickups = this.sortOrdersByPriorityAndLocation(
      pickupOrders,
      startPoint
    );
    const optimizedDeliveries = this.sortOrdersByPriorityAndLocation(
      deliveryOrders,
      startPoint
    );

    // Combine: pickups first, then deliveries
    return [...optimizedPickups, ...optimizedDeliveries];
  }

  /**
   * Sort orders by priority and location proximity
   */
  private static sortOrdersByPriorityAndLocation(
    orders: OrderLocationData[],
    referencePoint: Coordinates
  ): OrderLocationData[] {
    const priorityWeights = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };

    return orders
      .map((order) => ({
        ...order,
        distance: order.pickupCoordinates
          ? LocationService.calculateDistance(
              referencePoint,
              order.pickupCoordinates
            )
          : 999, // High penalty for orders without coordinates
        priorityWeight:
          priorityWeights[order.priority as keyof typeof priorityWeights] || 2,
      }))
      .sort((a, b) => {
        // First sort by priority (higher priority first)
        if (a.priorityWeight !== b.priorityWeight) {
          return b.priorityWeight - a.priorityWeight;
        }
        // Then sort by distance (closer first)
        return a.distance - b.distance;
      })
      .map(({ distance, priorityWeight, ...order }) => order);
  }

  /**
   * Calculate total distance for a sequence of orders
   */
  private static calculateRouteDistance(orders: OrderLocationData[]): number {
    const coordinates = orders
      .filter((order) => order.pickupCoordinates)
      .map((order) => order.pickupCoordinates!);

    if (coordinates.length < 2) return 0;

    return LocationService.calculateRouteDistance(coordinates);
  }

  /**
   * Get orders that can be delivered to a specific location
   */
  static async getNearbyDeliveryOrders(
    businessId: string,
    location: Coordinates,
    radiusKm: number = 5
  ): Promise<OrderLocationData[]> {
    const orders = await this.getOrdersReadyForRoutes(businessId, ["delivery"]);

    return orders.filter((order) => {
      if (!order.deliveryCoordinates) return false;
      return LocationService.isWithinRadius(
        location,
        order.deliveryCoordinates,
        radiusKm
      );
    });
  }

  /**
   * Suggest optimal pickup route based on vehicle location
   */
  static async suggestPickupRoute(
    businessId: string,
    vehicleId: string,
    currentLocation: Coordinates,
    maxStops: number = 10
  ): Promise<OrderLocationData[]> {
    const orders = await this.getOrdersReadyForRoutes(businessId, ["pickup"]);

    // Convert to format expected by LocationService and sort by distance
    const ordersWithCoords = orders
      .filter((o) => o.pickupCoordinates)
      .map((o) => ({
        ...o,
        coordinates: o.pickupCoordinates,
      }));

    const sortedOrders = LocationService.sortByDistance(
      currentLocation,
      ordersWithCoords
    );

    // Apply capacity and stop limits and remove distance/coordinates properties
    return sortedOrders
      .slice(0, maxStops)
      .map(({ distance, coordinates, ...order }) => order as OrderLocationData);
  }

  /**
   * Remove an order from a given route. Cleans up empty stops and updates totals.
   */
  static async removeOrderFromRoute(
    routeId: string,
    orderId: string,
    businessId: string
  ): Promise<{ success: boolean; message: string }>
  {
    // Fetch route
    const route = await prisma.route.findFirst({
      where: { id: routeId, businessId },
      include: { stops: true },
    });

    if (!route) {
      throw new Error("Route not found");
    }

    if (!(["PLANNED", "ASSIGNED"] as RouteStatus[]).includes(route.status as RouteStatus)) {
      const err: any = new Error("Only PLANNED or ASSIGNED routes can be modified");
      err.code = "ROUTE_NOT_MODIFIABLE";
      err.routeStatus = route.status;
      throw err;
    }

    // Find the routeStopOrder entry by orderId
    const rso = await prisma.routeStopOrder.findFirst({
      where: {
        orderId,
        routeStop: { routeId },
      },
      include: { routeStop: true },
    });

    if (!rso) {
      return { success: true, message: "Order not linked to the route" };
    }

    // Delete the link
    await prisma.routeStopOrder.delete({ where: { id: rso.id } });

    // If stop has no more orders, delete the stop
    const remainingCount = await prisma.routeStopOrder.count({ where: { routeStopId: rso.routeStopId } });
    if (remainingCount === 0) {
      await prisma.routeStop.delete({ where: { id: rso.routeStopId } });
    }

    // Recalculate totals from remaining stops
    const stops = await prisma.routeStop.findMany({ where: { routeId } });
    const totalItems = stops.reduce((sum, s) => sum + (s.itemCount || 0), 0);
    const totalWeight = stops.reduce((sum, s) => sum + Number(s.weight || 0), 0);

    await prisma.route.update({
      where: { id: routeId },
      data: { totalItems, totalWeight, updatedAt: new Date() },
    });

    return { success: true, message: "Order removed from route" };
  }
}

export default OrderRouteIntegrationService;
