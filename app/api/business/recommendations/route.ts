import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";

const prisma = new PrismaClient();

// Smart Suggestion Engine for Phase 2
class ServiceSuggestionEngine {
  /**
   * Generate personalized service suggestions for a business
   */
  static async generateSuggestions(businessId: string): Promise<any[]> {
    try {
      // Get business info and current service types
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          businessServiceTypes: {
            where: { isActive: true },
          },
          services: {
            where: { isActive: true },
          },
        },
      });

      if (!business) {
        throw new Error("Business not found");
      }

      const currentServiceTypes = business.businessServiceTypes.map(
        (bst) => bst.serviceType
      );
      const suggestions: any[] = [];

      // 1. Complementary Service Suggestions
      const complementarySuggestions =
        await this.generateComplementarySuggestions(
          currentServiceTypes,
          businessId
        );
      suggestions.push(...complementarySuggestions);

      // 2. Geographic Analysis Suggestions
      const geographicSuggestions = await this.generateGeographicSuggestions(
        business.city,
        business.district,
        currentServiceTypes,
        businessId
      );
      suggestions.push(...geographicSuggestions);

      // 3. Seasonal Suggestions
      const seasonalSuggestions = await this.generateSeasonalSuggestions(
        currentServiceTypes,
        businessId
      );
      suggestions.push(...seasonalSuggestions);

      // 4. Demand-Based Suggestions
      const demandSuggestions = await this.generateDemandBasedSuggestions(
        businessId,
        currentServiceTypes
      );
      suggestions.push(...demandSuggestions);

      // Sort by priority and limit results
      return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5); // Max 5 suggestions
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return [];
    }
  }

  /**
   * Generate complementary service suggestions
   */
  static async generateComplementarySuggestions(
    currentServices: string[],
    businessId: string
  ): Promise<any[]> {
    const suggestions: any[] = [];

    // Complementary service mappings
    const complementaryMap: Record<
      string,
      { services: string[]; reason: string }
    > = {
      DRY_CLEANING: {
        services: ["IRONING", "STAIN_REMOVAL"],
        reason:
          "Kuru temizleme işletmelerinin %87'si ütüleme hizmeti de sunuyor",
      },
      LAUNDRY: {
        services: ["IRONING", "DRY_CLEANING"],
        reason:
          "Çamaşırhane işletmelerinin %72'si ütüleme ve kuru temizleme hizmeti veriyor",
      },
      CARPET_CLEANING: {
        services: ["UPHOLSTERY_CLEANING", "CURTAIN_CLEANING"],
        reason:
          "Halı yıkama işletmelerinin %65'i döşeme ve perde temizliği yapıyor",
      },
      UPHOLSTERY_CLEANING: {
        services: ["CARPET_CLEANING", "CURTAIN_CLEANING"],
        reason:
          "Döşeme temizliği yapan işletmelerin %78'i halı ve perde temizliği de sunuyor",
      },
    };

    for (const currentService of currentServices) {
      const complements = complementaryMap[currentService];
      if (complements) {
        for (const suggestedService of complements.services) {
          if (!currentServices.includes(suggestedService)) {
            // Check if already suggested recently
            const existingSuggestion = await prisma.serviceSuggestion.findFirst(
              {
                where: {
                  businessId,
                  suggestedServiceType: suggestedService as any,
                  suggestionType: "COMPLEMENTARY",
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
                  },
                },
              }
            );

            if (!existingSuggestion) {
              suggestions.push({
                id: `comp_${suggestedService}_${Date.now()}`,
                businessId,
                suggestionType: "COMPLEMENTARY",
                suggestedServiceType: suggestedService,
                reason: complements.reason,
                priority: 8,
                metadata: {
                  basedOn: currentService,
                  marketData: true,
                  estimatedRevenue:
                    this.estimateRevenueImpact(suggestedService),
                },
              });
            }
          }
        }
      }
    }

    return suggestions;
  }

  /**
   * Generate geographic-based suggestions
   */
  static async generateGeographicSuggestions(
    city: string | null,
    district: string | null,
    currentServices: string[],
    businessId: string
  ): Promise<any[]> {
    if (!city) return [];

    const suggestions: any[] = [];

    try {
      // Find popular services in the same geographic area
      const popularServices = await prisma.$queryRaw<any[]>`
        SELECT 
          bst.service_type,
          COUNT(*) as business_count,
          ROUND((COUNT(*) * 100.0 / (
            SELECT COUNT(*) 
            FROM businesses b 
            WHERE b.city = ${city} 
            AND b.is_active = true
          )), 1) as adoption_percentage
        FROM business_service_types bst
        JOIN businesses b ON bst.business_id = b.id
        WHERE b.city = ${city}
        ${district ? `AND b.district = ${district}` : ""}
        AND b.is_active = true
        AND bst.is_active = true
        GROUP BY bst.service_type
        HAVING business_count >= 3
        ORDER BY adoption_percentage DESC
      `;

      for (const serviceData of popularServices) {
        const serviceType = serviceData.service_type;

        if (
          !currentServices.includes(serviceType) &&
          serviceData.adoption_percentage > 30
        ) {
          // Check if already suggested recently
          const existingSuggestion = await prisma.serviceSuggestion.findFirst({
            where: {
              businessId,
              suggestedServiceType: serviceType as any,
              suggestionType: "GEOGRAPHIC",
              createdAt: {
                gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days
              },
            },
          });

          if (!existingSuggestion) {
            suggestions.push({
              id: `geo_${serviceType}_${Date.now()}`,
              businessId,
              suggestionType: "GEOGRAPHIC",
              suggestedServiceType: serviceType,
              reason: `${city}${
                district ? ` ${district}` : ""
              } bölgesindeki işletmelerin %${
                serviceData.adoption_percentage
              }'ı bu hizmeti sunuyor`,
              priority: Math.min(
                10,
                Math.floor(serviceData.adoption_percentage / 10)
              ),
              metadata: {
                city,
                district,
                adoptionPercentage: serviceData.adoption_percentage,
                businessCount: serviceData.business_count,
                estimatedRevenue: this.estimateRevenueImpact(serviceType),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating geographic suggestions:", error);
    }

    return suggestions;
  }

  /**
   * Generate seasonal suggestions
   */
  static async generateSeasonalSuggestions(
    currentServices: string[],
    businessId: string
  ): Promise<any[]> {
    const suggestions: any[] = [];
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    try {
      // Get current seasonal patterns
      const seasonalPatterns = await prisma.seasonalServicePattern.findMany({
        where: {
          AND: [
            { monthStart: { lte: currentMonth } },
            { monthEnd: { gte: currentMonth } },
            { demandMultiplier: { gte: 1.2 } }, // Only high-demand seasons
          ],
        },
        orderBy: { demandMultiplier: "desc" },
      });

      for (const pattern of seasonalPatterns) {
        const serviceType = pattern.serviceType;

        if (!currentServices.includes(serviceType)) {
          // Check if already suggested recently
          const existingSuggestion = await prisma.serviceSuggestion.findFirst({
            where: {
              businessId,
              suggestedServiceType: serviceType as any,
              suggestionType: "SEASONAL",
              createdAt: {
                gte: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days for seasonal
              },
            },
          });

          if (!existingSuggestion) {
            const increasePercent = Math.round(
              (pattern.demandMultiplier - 1) * 100
            );

            suggestions.push({
              id: `seasonal_${serviceType}_${Date.now()}`,
              businessId,
              suggestionType: "SEASONAL",
              suggestedServiceType: serviceType,
              reason: `${
                pattern.season
              } mevsiminde ${this.getServiceDisplayName(
                serviceType
              )} talebi %${increasePercent} artıyor`,
              priority: Math.floor(pattern.demandMultiplier * 3), // 3.6-15 priority range
              metadata: {
                season: pattern.season,
                demandMultiplier: pattern.demandMultiplier,
                peakWeeks: pattern.peakWeeks,
                description: pattern.description,
                estimatedRevenue: this.estimateRevenueImpact(
                  serviceType,
                  pattern.demandMultiplier
                ),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating seasonal suggestions:", error);
    }

    return suggestions;
  }

  /**
   * Generate demand-based suggestions from customer requests
   */
  static async generateDemandBasedSuggestions(
    businessId: string,
    currentServices: string[]
  ): Promise<any[]> {
    const suggestions: any[] = [];

    try {
      // Get customer requests for services not currently offered
      const requestedServices = await prisma.customerServiceRequest.findMany({
        where: {
          businessId,
          status: "PENDING",
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          requestedServiceType: true,
          urgencyLevel: true,
          estimatedDemand: true,
        },
      });

      // Group by service type and calculate demand
      const demandMap = new Map<
        string,
        { count: number; urgentCount: number; totalDemand: number }
      >();

      for (const request of requestedServices) {
        const serviceType = request.requestedServiceType;

        if (!currentServices.includes(serviceType)) {
          const existing = demandMap.get(serviceType) || {
            count: 0,
            urgentCount: 0,
            totalDemand: 0,
          };
          existing.count++;
          existing.totalDemand += request.estimatedDemand || 1;
          if (
            request.urgencyLevel === "HIGH" ||
            request.urgencyLevel === "URGENT"
          ) {
            existing.urgentCount++;
          }
          demandMap.set(serviceType, existing);
        }
      }

      // Create suggestions for high-demand services
      for (const [serviceType, demand] of demandMap) {
        if (demand.count >= 3 || demand.urgentCount >= 2) {
          // Threshold for suggestion
          // Check if already suggested recently
          const existingSuggestion = await prisma.serviceSuggestion.findFirst({
            where: {
              businessId,
              suggestedServiceType: serviceType as any,
              suggestionType: "DEMAND_BASED",
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
              },
            },
          });

          if (!existingSuggestion) {
            const priority = Math.min(
              10,
              demand.count + demand.urgentCount * 2
            );

            suggestions.push({
              id: `demand_${serviceType}_${Date.now()}`,
              businessId,
              suggestionType: "DEMAND_BASED",
              suggestedServiceType: serviceType,
              reason: `Son 30 günde ${
                demand.count
              } müşteri ${this.getServiceDisplayName(
                serviceType
              )} hizmeti istedi`,
              priority,
              metadata: {
                requestCount: demand.count,
                urgentRequestCount: demand.urgentCount,
                totalEstimatedDemand: demand.totalDemand,
                timeframe: "30 days",
                estimatedRevenue: this.estimateRevenueImpact(
                  serviceType,
                  1 + demand.totalDemand * 0.1
                ),
              },
            });
          }
        }
      }
    } catch (error) {
      console.error("Error generating demand-based suggestions:", error);
    }

    return suggestions;
  }

  /**
   * Get display name for service type
   */
  static getServiceDisplayName(serviceType: string): string {
    const names: Record<string, string> = {
      DRY_CLEANING: "kuru temizleme",
      LAUNDRY: "çamaşır yıkama",
      CARPET_CLEANING: "halı yıkama",
      UPHOLSTERY_CLEANING: "döşeme temizliği",
      CURTAIN_CLEANING: "perde temizliği",
      IRONING: "ütüleme",
      STAIN_REMOVAL: "leke çıkarma",
      OTHER: "diğer hizmetler",
    };
    return names[serviceType] || serviceType.toLowerCase();
  }

  /**
   * Estimate revenue impact of adding a service
   */
  static estimateRevenueImpact(
    serviceType: string,
    multiplier: number = 1
  ): number {
    // Base monthly revenue estimates (in TRY)
    const baseRevenues: Record<string, number> = {
      DRY_CLEANING: 8000,
      LAUNDRY: 6000,
      CARPET_CLEANING: 12000,
      UPHOLSTERY_CLEANING: 9000,
      CURTAIN_CLEANING: 5000,
      IRONING: 4000,
      STAIN_REMOVAL: 3000,
      OTHER: 5000,
    };

    return Math.round((baseRevenues[serviceType] || 5000) * multiplier);
  }
}

/**
 * GET /api/business/recommendations
 * Get personalized service suggestions for a business
 */
export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with proper session management
    const businessId = request.headers.get("x-business-id");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID required" },
        { status: 401 }
      );
    }

    // Generate fresh suggestions
    const suggestions = await ServiceSuggestionEngine.generateSuggestions(
      businessId
    );

    // Save suggestions to database
    for (const suggestion of suggestions) {
      try {
        await prisma.serviceSuggestion.create({
          data: {
            id: suggestion.id,
            businessId: suggestion.businessId,
            suggestionType: suggestion.suggestionType,
            suggestedServiceType: suggestion.suggestedServiceType,
            reason: suggestion.reason,
            priority: suggestion.priority,
            metadata: JSON.stringify(suggestion.metadata),
          },
        });
      } catch (error) {
        // Ignore duplicate key errors
        if (!error.message?.includes("Duplicate entry")) {
          console.error("Error saving suggestion:", error);
        }
      }
    }

    // Get active suggestions from database
    const activeSuggestions = await prisma.serviceSuggestion.findMany({
      where: {
        businessId,
        dismissedAt: null,
        actedUponAt: null,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    // Format suggestions for frontend
    const formattedSuggestions = activeSuggestions.map((s) => ({
      id: s.id,
      type: s.suggestionType,
      serviceType: s.suggestedServiceType,
      title: `${ServiceSuggestionEngine.getServiceDisplayName(
        s.suggestedServiceType
      )} hizmeti ekle`,
      description: s.reason,
      priority: s.priority,
      metadata: s.metadata ? JSON.parse(s.metadata) : {},
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      success: true,
      suggestions: formattedSuggestions,
      count: formattedSuggestions.length,
    });
  } catch (error) {
    console.error("Recommendations API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate recommendations",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/business/recommendations
 * Manually trigger suggestion generation
 */
export async function POST(request: NextRequest) {
  try {
    const businessId = request.headers.get("x-business-id");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const forceRefresh = body.forceRefresh || false;

    if (forceRefresh) {
      // Clear old suggestions
      await prisma.serviceSuggestion.updateMany({
        where: {
          businessId,
          dismissedAt: null,
          actedUponAt: null,
        },
        data: {
          dismissedAt: new Date(),
        },
      });
    }

    // Generate new suggestions
    const suggestions = await ServiceSuggestionEngine.generateSuggestions(
      businessId
    );

    return NextResponse.json({
      success: true,
      message: "Suggestions generated successfully",
      generatedCount: suggestions.length,
    });
  } catch (error) {
    console.error("POST Recommendations API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate suggestions",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
