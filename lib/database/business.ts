import { prisma } from "@/lib/db";
import { Business, BusinessType } from "@prisma/client";

export interface CreateBusinessData {
  name: string;
  businessType: BusinessType;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  taxNumber?: string;
}

export interface UpdateBusinessData {
  name?: string;
  businessType?: BusinessType;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  taxNumber?: string;
  isActive?: boolean;
}

// Create a new business
export async function createBusiness(data: CreateBusinessData): Promise<Business> {
  return prisma.business.create({
    data,
  });
}

// Get business by ID
export async function getBusinessById(id: string): Promise<any> {
  const business = await (prisma as any).business.findUnique({
    where: { id },
    include: {
      services: {
        select: {
          category: true,
          name: true,
        },
      },
      businessServiceTypes: {
        where: { isActive: true },
        select: {
          serviceType: true,
        },
      },
    },
  });

  if (!business) return null;

  // Get business types from junction table, fallback to services, then single businessType
  let businessTypes: string[] = [];
  
  if (business.businessServiceTypes && business.businessServiceTypes.length > 0) {
    businessTypes = business.businessServiceTypes.map((bst: any) => bst.serviceType);
  } else if (business.services && business.services.length > 0) {
    businessTypes = [...new Set(business.services.map((service: any) => service.category))];
  } else {
    businessTypes = [business.businessType];
  }

  return {
    ...business,
    businessTypes,
  };
}

// Update business
export async function updateBusiness(
  id: string,
  data: UpdateBusinessData
): Promise<Business> {
  return prisma.business.update({
    where: { id },
    data,
  });
}

// Get all businesses
export async function getBusinesses(): Promise<Business[]> {
  return prisma.business.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

// Update business service types
export async function updateBusinessServiceTypes(
  businessId: string, 
  serviceTypes: string[]
): Promise<void> {
  // First, deactivate all existing service types
  await (prisma as any).businessServiceType.updateMany({
    where: { businessId },
    data: { isActive: false },
  });

  // Then, create or reactivate the new service types
  for (const serviceType of serviceTypes) {
    await (prisma as any).businessServiceType.upsert({
      where: {
        businessId_serviceType: {
          businessId,
          serviceType,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        businessId,
        serviceType,
        isActive: true,
      },
    });
  }
}

// Soft delete business
export async function deleteBusiness(id: string): Promise<Business> {
  return prisma.business.update({
    where: { id },
    data: { isActive: false },
  });
}
