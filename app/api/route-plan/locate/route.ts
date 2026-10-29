import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { geocodeAddress } from "@/lib/geocode";

// Approximate matches are not saved on the customer, so they are remembered here instead of
// costing several paced lookups on every route load
const approximateCache = new Map<string, Awaited<ReturnType<typeof geocodeAddress>>>();

async function lookup(parts: { address?: string | null; district?: string | null; city?: string | null }) {
  const key = [parts.address, parts.district, parts.city].map((p) => (p || "").trim().toLocaleLowerCase("tr")).join("|");
  if (approximateCache.has(key)) return approximateCache.get(key) ?? null;
  const found = await geocodeAddress(parts);
  if (!found || found.precision !== "address") {
    if (approximateCache.size > 5000) approximateCache.clear();
    approximateCache.set(key, found);
  }
  return found;
}

const validCoordinate =(lat: unknown, lng: unknown) =>
  typeof lat === "number" && typeof lng === "number" && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/**
 * Coordinates for one route stop.
 * - { customerId }: look the customer's address up; a street-level match is saved on the
 *   customer so the next route needs no lookup.
 * - { customerId, latitude, longitude }: the driver is at the door ("Konumu kaydet"); save it.
 * - { address, district, city }: an order-specific address; looked up, not saved.
 */
export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const { customerId, latitude, longitude } = body as Record<string, unknown>;

  if (typeof customerId !== "string") {
    const found = await lookup({
      address: typeof body.address === "string" ? body.address : "",
      district: typeof body.district === "string" ? body.district : "",
      city: typeof body.city === "string" ? body.city : "",
    });
    return found ? NextResponse.json(found) : NextResponse.json({ error: "Adres bulunamadı" }, { status: 404 });
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: user.businessId },
    select: { id: true, address: true, district: true, city: true },
  });
  if (!customer) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  if (latitude !== undefined || longitude !== undefined) {
    if (!validCoordinate(latitude, longitude)) {
      return NextResponse.json({ error: "Geçersiz konum" }, { status: 400 });
    }
    const coords = { latitude: Number((latitude as number).toFixed(6)), longitude: Number((longitude as number).toFixed(6)) };
    await prisma.customer.update({ where: { id: customer.id }, data: coords });
    return NextResponse.json({ ...coords, precision: "address", saved: true });
  }

  const found = await lookup(customer);
  if (!found) return NextResponse.json({ error: "Adres bulunamadı" }, { status: 404 });
  if (found.precision === "address") {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { latitude: found.latitude, longitude: found.longitude },
    });
  }
  return NextResponse.json({ ...found, saved: found.precision === "address" });
}
