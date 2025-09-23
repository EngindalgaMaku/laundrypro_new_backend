import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/db";
import { BusinessType, UserRole } from "@/lib/types";

interface RegisterData {
  businessName: string;
  businessType: BusinessType; // Primary business type
  businessTypes?: string[]; // Multiple service types
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city: string;
  district: string;
  // KVKK and consent fields
  kvkkConsent?: boolean;
  privacyConsent?: boolean;
  termsConsent?: boolean;
  marketingConsent?: boolean;
  consentDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: RegisterData = await request.json();

    console.log("[REGISTER] Registration attempt:", {
      email: data.email,
      businessName: data.businessName,
      firstName: data.firstName,
      lastName: data.lastName,
      city: data.city,
      district: data.district,
    });

    // Validate required fields
    if (
      !data.businessName ||
      !data.businessType ||
      !data.email ||
      !data.password ||
      !data.firstName ||
      !data.lastName ||
      !data.city ||
      !data.district
    ) {
      return NextResponse.json(
        {
          error:
            "Tüm zorunlu alanlar doldurulmalıdır (İşletme adı, iş türü, e-posta, şifre, ad, soyad, il ve ilçe)",
        },
        { status: 400 }
      );
    }

    // Validate KVKK consents - these are required by law
    if (!data.kvkkConsent || !data.privacyConsent || !data.termsConsent) {
      return NextResponse.json(
        {
          error:
            "KVKK Aydınlatma Metni, Gizlilik Politikası ve Kullanım Şartları onayları zorunludur",
        },
        { status: 400 }
      );
    }

    console.log("[REGISTER] KVKK Consent validation passed:", {
      kvkkConsent: data.kvkkConsent,
      privacyConsent: data.privacyConsent,
      termsConsent: data.termsConsent,
      marketingConsent: data.marketingConsent,
      consentDate: data.consentDate,
    });

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu email adresi zaten kullanımda" },
        { status: 400 }
      );
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);

    // TypeScript hatalarını bypass ederek çalışan bir çözüm
    const result = await (prisma as any).$transaction(async (tx: any) => {
      // Create business first
      const business = await tx.business.create({
        data: {
          name: data.businessName,
          businessType: data.businessType,
          email: data.email,
          phone: data.phone,
          address: data.address,
          city: data.city,
          district: data.district,
        },
      });

      // Resolve RBAC role for OWNER (fallback-safe)
      const ownerRole = await tx.role.findUnique({
        where: { name: "OWNER" },
        select: { id: true },
      }).catch(() => null);

      // Create owner user with business relationship and RBAC roleId
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: UserRole.OWNER,
          businessId: business.id,
          // RBAC role mapping
          roleId: ownerRole?.id || null,
          // Store KVKK consent metadata in user record
          kvkkConsent: data.kvkkConsent || false,
          privacyConsent: data.privacyConsent || false,
          termsConsent: data.termsConsent || false,
          marketingConsent: data.marketingConsent || false,
          consentDate: data.consentDate
            ? new Date(data.consentDate)
            : new Date(),
        },
      });

      // Log consent information for audit trail
      console.log("[REGISTER] KVKK consents recorded:", {
        userId: user.id,
        kvkkConsent: data.kvkkConsent,
        privacyConsent: data.privacyConsent,
        termsConsent: data.termsConsent,
        marketingConsent: data.marketingConsent,
        consentDate: data.consentDate,
      });

      return { business, user };
    });

    const { business, user } = result;

    console.log("[REGISTER] User created successfully:", {
      userId: user.id,
      email: user.email,
      businessId: business.id,
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

    console.log("[REGISTER] Registration completed successfully");

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
