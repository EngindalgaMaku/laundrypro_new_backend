import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { BusinessType, UserRole } from "@/lib/types";

interface RegisterData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
  };
  business: {
    name: string;
    type?: BusinessType; // Primary business type (optional)
    types?: string[]; // Multiple service types (optional)
    phone?: string;
    address?: string;
    city: string;
    district: string;
  };
  consents: {
    kvkk: boolean;
    privacy: boolean;
    terms: boolean;
    marketing: boolean;
    consentDate: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const data: RegisterData = await request.json();

    console.log("[REGISTER] Registration attempt:", {
      email: data.user.email,
      businessName: data.business.name,
      firstName: data.user.firstName,
      lastName: data.user.lastName,
      city: data.business.city,
      district: data.business.district,
      businessTypes: data.business.types,
    });

    // Validate required fields
    if (
      !data.business.name ||
      !data.user.email ||
      !data.user.password ||
      !data.user.firstName ||
      !data.user.lastName ||
      !data.business.city ||
      !data.business.district
    ) {
      return NextResponse.json(
        {
          error:
            "Tüm zorunlu alanlar doldurulmalıdır (İşletme adı, e-posta, şifre, ad, soyad, il ve ilçe)",
        },
        { status: 400 }
      );
    }

    // Validate KVKK consents - these are required by law
    if (!data.consents.kvkk || !data.consents.privacy || !data.consents.terms) {
      return NextResponse.json(
        {
          error:
            "KVKK Aydınlatma Metni, Gizlilik Politikası ve Kullanım Şartları onayları zorunludur",
        },
        { status: 400 }
      );
    }

    console.log("[REGISTER] KVKK Consent validation passed:", {
      kvkkConsent: data.consents.kvkk,
      privacyConsent: data.consents.privacy,
      termsConsent: data.consents.terms,
      marketingConsent: data.consents.marketing,
      consentDate: data.consents.consentDate,
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.user.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanımda" },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.user.password, saltRounds);

    // TypeScript hatalarını bypass ederek çalışan bir çözüm
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Create business first
      const business = await tx.business.create({
        data: {
          name: data.business.name,
          businessType: data.business.type || "DRY_CLEANING", // Default fallback
          email: data.user.email,
          phone: data.business.phone,
          address: data.business.address,
          city: data.business.city,
          district: data.business.district,
        },
      });

      // Create business service types for multiple services (optional)
      if (data.business.types && data.business.types.length > 0) {
        const serviceTypePromises = data.business.types.map((serviceType) =>
          tx.businessServiceType.create({
            data: {
              businessId: business.id,
              serviceType: serviceType,
              isActive: true,
            },
          })
        );
        await Promise.all(serviceTypePromises);

        console.log(
          "[REGISTER] Created business service types:",
          data.business.types
        );
      } else {
        console.log(
          "[REGISTER] No service types provided - will be set up during onboarding"
        );
      }

      // Resolve RBAC role for OWNER (fallback-safe)
      const ownerRole = await tx.role
        .findUnique({
          where: { name: "OWNER" },
          select: { id: true },
        })
        .catch(() => null);

      // Create owner user with business relationship and RBAC roleId
      const user = await tx.user.create({
        data: {
          email: data.user.email,
          passwordHash,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          phone: data.user.phone,
          role: UserRole.OWNER,
          businessId: business.id,
          // RBAC role mapping
          roleId: ownerRole?.id || null,
          // Store KVKK consent metadata in user record
          kvkkConsent: data.consents.kvkk || false,
          privacyConsent: data.consents.privacy || false,
          termsConsent: data.consents.terms || false,
          marketingConsent: data.consents.marketing || false,
          consentDate: data.consents.consentDate
            ? new Date(data.consents.consentDate)
            : new Date(),
        },
      });

      // Log consent information for audit trail
      console.log("[REGISTER] KVKK consents recorded:", {
        userId: user.id,
        kvkkConsent: data.consents.kvkk,
        privacyConsent: data.consents.privacy,
        termsConsent: data.consents.terms,
        marketingConsent: data.consents.marketing,
        consentDate: data.consents.consentDate,
      });

      return { business, user };
    });

    const { business, user } = result;

    console.log("[REGISTER] User created successfully:", {
      userId: user.id,
      email: user.email,
      businessId: business.id,
      serviceTypes: data.business.types,
    });

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        businessId: business.id,
        role: user.role,
      },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "7d" }
    );

    console.log(
      "[REGISTER] Registration completed successfully with multiple service types"
    );

    // Return success response
    return NextResponse.json(
      {
        message: "Kayıt başarılı",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          business: {
            id: business.id,
            name: business.name,
            businessType: business.businessType,
            serviceTypes: data.business.types || [],
            email: business.email,
            phone: business.phone,
            address: business.address,
            city: business.city,
            district: business.district,
          },
        },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
