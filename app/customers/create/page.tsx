"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  turkishCities,
  getDistrictsByCity,
  getCityById,
} from "@/lib/turkish-locations";
import {
  MapPin,
  Navigation,
  User,
  Phone,
  Mail,
  Home,
  FileText,
  Save,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  businessType: string;
  businessName: string;
  business: {
    id: string;
    name: string;
    businessType: string;
    city?: string;
    district?: string;
    address?: string;
  };
}

export default function CreateCustomerPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const [customerData, setCustomerData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    district: "",
    customDistrict: "", // For "Diğer" option
    latitude: null as number | null,
    longitude: null as number | null,
    notes: "",
  });
  const [showCustomDistrict, setShowCustomDistrict] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Auto-select business city for customer
    if (parsedUser.business?.city) {
      setCustomerData((prev) => ({
        ...prev,
        city: parsedUser.business.city,
      }));
      toast.success(
        `Müşteri ili otomatik olarak ${
          getCityById(parsedUser.business.city)?.name ||
          parsedUser.business.city
        } seçildi`
      );
    }
  }, [router]);

  if (!user) {
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!customerData.name.trim()) {
      toast.error("Müşteri adı gereklidir");
      return;
    }

    if (!customerData.phone.trim()) {
      toast.error("Telefon numarası gereklidir");
      return;
    }

    // Validate city/district
    if (!customerData.city) {
      toast.error("Müşteri ili seçilmelidir");
      return;
    }

    // Validate custom district if "other" is selected
    if (
      customerData.district === "other" &&
      !customerData.customDistrict.trim()
    ) {
      toast.error("İlçe adı girilmelidir");
      return;
    }

    // Validate that customer city matches business city (if business city exists)
    if (user.business?.city && customerData.city !== user.business.city) {
      toast.error("Müşteri ili işletme ili ile aynı olmalıdır");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.");
        router.push("/");
        return;
      }

      // Prepare customer data for API
      const finalDistrict =
        customerData.district === "other"
          ? customerData.customDistrict
          : customerData.district;

      const [firstName, ...lastNameParts] = customerData.name.trim().split(" ");
      const lastName = lastNameParts.join(" ") || "";

      const customerPayload = {
        firstName: firstName,
        lastName: lastName,
        email: customerData.email || null,
        phone: customerData.phone.replace(/\s/g, ""), // Remove spaces for storage
        address: customerData.address || null,
        city: customerData.city,
        district: finalDistrict,
        latitude: customerData.latitude,
        longitude: customerData.longitude,
        notes: customerData.notes || null,
      };

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(customerPayload),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Müşteri başarıyla kaydedildi!");
        router.push("/customers");
      } else {
        const error = await response.json();
        toast.error(error.message || "Müşteri kaydedilirken hata oluştu");
      }
    } catch (error) {
      console.error("Customer creation error:", error);
      toast.error("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto bg-muted/20 custom-scrollbar">

          <div className="p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
                    Yeni Müşteri
                  </h1>
                  <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    Yeni bir müşteri kaydedin
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => router.push("/customers")}
                  className="w-full sm:w-auto"
                >
                  Geri Dön
                </Button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Customer Information */}
                  <div className="lg:col-span-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Müşteri Bilgileri</CardTitle>
                        <CardDescription>
                          Müşterinin temel bilgilerini girin
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Ad Soyad *</Label>
                          <Input
                            id="name"
                            placeholder="Örn: Ahmet Yılmaz"
                            value={customerData.name}
                            onChange={(e) =>
                              setCustomerData((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Telefon *</Label>
                            <Input
                              id="phone"
                              placeholder="Örn: 0555 123 45 67"
                              value={customerData.phone}
                              onChange={(e) => {
                                // Format phone number as user types
                                let value = e.target.value.replace(/\D/g, ""); // Remove non-digits

                                if (value.length > 0) {
                                  if (value.length <= 4) {
                                    value = value.replace(/(\d{4})/, "$1");
                                  } else if (value.length <= 7) {
                                    value = value.replace(
                                      /(\d{4})(\d{3})/,
                                      "$1 $2"
                                    );
                                  } else if (value.length <= 9) {
                                    value = value.replace(
                                      /(\d{4})(\d{3})(\d{2})/,
                                      "$1 $2 $3"
                                    );
                                  } else {
                                    value = value.replace(
                                      /(\d{4})(\d{3})(\d{2})(\d{2})/,
                                      "$1 $2 $3 $4"
                                    );
                                  }
                                }

                                setCustomerData((prev) => ({
                                  ...prev,
                                  phone: value,
                                }));
                              }}
                              maxLength={13}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">E-posta</Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="Örn: ahmet@example.com"
                              value={customerData.email}
                              onChange={(e) =>
                                setCustomerData((prev) => ({
                                  ...prev,
                                  email: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                        {/* City & District Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">İl *</Label>
                            <div className="relative">
                              <Select
                                value={customerData.city}
                                onValueChange={(value) =>
                                  setCustomerData((prev) => ({
                                    ...prev,
                                    city: value,
                                    district: "", // Reset district when city changes
                                  }))
                                }
                                disabled={!!user.business?.city} // Disabled if business city exists
                              >
                                <SelectTrigger
                                  className={
                                    user.business?.city ? "bg-muted" : ""
                                  }
                                >
                                  <SelectValue placeholder="İl seçin..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {turkishCities.map((city) => (
                                    <SelectItem key={city.id} value={city.id}>
                                      {city.name} ({city.plateCode})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {user.business?.city && (
                                <Badge
                                  variant="secondary"
                                  className="absolute -top-2 -right-2 text-xs"
                                >
                                  İşletme İli
                                </Badge>
                              )}
                            </div>
                            {user.business?.city && (
                              <p className="text-xs text-muted-foreground">
                                Müşteri ili işletme iliniz ile aynı olmalıdır
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="district">İlçe</Label>
                            <Select
                              value={customerData.district}
                              onValueChange={(value) => {
                                if (value === "other") {
                                  setShowCustomDistrict(true);
                                  setCustomerData((prev) => ({
                                    ...prev,
                                    district: value,
                                    customDistrict: "",
                                  }));
                                } else {
                                  setShowCustomDistrict(false);
                                  setCustomerData((prev) => ({
                                    ...prev,
                                    district: value,
                                    customDistrict: "",
                                  }));
                                }
                              }}
                              disabled={!customerData.city}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={
                                    customerData.city
                                      ? "İlçe seçin..."
                                      : "Önce il seçin"
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {customerData.city &&
                                  getDistrictsByCity(customerData.city).map(
                                    (district) => (
                                      <SelectItem
                                        key={district.id}
                                        value={district.id}
                                      >
                                        {district.name}
                                      </SelectItem>
                                    )
                                  )}
                                {customerData.city && (
                                  <SelectItem value="other">
                                    🔸 Diğer (Manuel Giriş)
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>

                            {/* Custom District Input */}
                            {showCustomDistrict && (
                              <div className="space-y-2">
                                <Label htmlFor="customDistrict">
                                  İlçe Adı (Manuel)
                                </Label>
                                <Input
                                  id="customDistrict"
                                  placeholder="İlçe adını yazın..."
                                  value={customerData.customDistrict}
                                  onChange={(e) =>
                                    setCustomerData((prev) => ({
                                      ...prev,
                                      customDistrict: e.target.value,
                                    }))
                                  }
                                  required={showCustomDistrict}
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Address with Map Integration */}
                        <div className="space-y-2">
                          <Label htmlFor="address">Detay Adres</Label>
                          <div className="space-y-2">
                            <Textarea
                              id="address"
                              placeholder="Mahalle, sokak, bina no, daire no..."
                              value={customerData.address}
                              onChange={(e) =>
                                setCustomerData((prev) => ({
                                  ...prev,
                                  address: e.target.value,
                                }))
                              }
                              rows={3}
                            />
                            {/* GPS Coordinates Input */}
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="space-y-1">
                                <Label htmlFor="latitude" className="text-xs">
                                  Enlem (Latitude)
                                </Label>
                                <Input
                                  id="latitude"
                                  placeholder="36.8490"
                                  value={customerData.latitude || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow numbers, dots, and minus sign
                                    if (
                                      value === "" ||
                                      /^-?\d*\.?\d*$/.test(value)
                                    ) {
                                      setCustomerData((prev) => ({
                                        ...prev,
                                        latitude: value
                                          ? parseFloat(value)
                                          : null,
                                      }));
                                    }
                                  }}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="longitude" className="text-xs">
                                  Boylam (Longitude)
                                </Label>
                                <Input
                                  id="longitude"
                                  placeholder="30.6296"
                                  value={customerData.longitude || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow numbers, dots, and minus sign
                                    if (
                                      value === "" ||
                                      /^-?\d*\.?\d*$/.test(value)
                                    ) {
                                      setCustomerData((prev) => ({
                                        ...prev,
                                        longitude: value
                                          ? parseFloat(value)
                                          : null,
                                      }));
                                    }
                                  }}
                                  className="text-sm"
                                />
                              </div>
                            </div>

                            {customerData.latitude &&
                              customerData.longitude && (
                                <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded border border-green-200">
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  <span className="text-sm text-green-800">
                                    GPS Koordinatları:{" "}
                                    {customerData.latitude.toFixed(4)},{" "}
                                    {customerData.longitude.toFixed(4)}
                                  </span>
                                </div>
                              )}

                            <div className="text-xs text-muted-foreground mt-1">
                              💡 Google Maps'ten koordinatları
                              kopyalayabilirsiniz: Haritada sağ tık →
                              koordinatları kopyala
                            </div>
                          </div>
                          {customerData.city && customerData.district && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {getCityById(customerData.city)?.name} /{" "}
                              {customerData.district === "other"
                                ? customerData.customDistrict || "Diğer"
                                : getDistrictsByCity(customerData.city).find(
                                    (d) => d.id === customerData.district
                                  )?.name}
                              {customerData.latitude &&
                                customerData.longitude && (
                                  <span className="ml-2 font-mono">
                                    ({customerData.latitude.toFixed(4)},{" "}
                                    {customerData.longitude.toFixed(4)})
                                  </span>
                                )}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notlar</Label>
                          <Textarea
                            id="notes"
                            placeholder="Müşteri hakkında özel notlar..."
                            value={customerData.notes}
                            onChange={(e) =>
                              setCustomerData((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Customer Summary */}
                  <div>
                    <Card className="sticky top-6">
                      <CardHeader>
                        <CardTitle>Müşteri Özeti</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Ad Soyad:
                            </span>
                            <span>{customerData.name || "-"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Telefon:
                            </span>
                            <span>{customerData.phone || "-"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              E-posta:
                            </span>
                            <span>{customerData.email || "-"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              İl/İlçe:
                            </span>
                            <span className="text-right text-xs">
                              {customerData.city && customerData.district
                                ? `${getCityById(customerData.city)?.name} / ${
                                    customerData.district === "other"
                                      ? customerData.customDistrict || "Diğer"
                                      : getDistrictsByCity(
                                          customerData.city
                                        ).find(
                                          (d) => d.id === customerData.district
                                        )?.name
                                  }`
                                : "-"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              Adres:
                            </span>
                            <span className="text-right text-xs">
                              {customerData.address
                                ? customerData.address.substring(0, 30) + "..."
                                : "-"}
                            </span>
                          </div>
                          {customerData.latitude && customerData.longitude && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">
                                GPS:
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                Seçili
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="border-t pt-4">
                          <div className="text-sm text-muted-foreground mb-2">
                            İlk müşteri kaydı
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Kayıt sonrası müşteri için sipariş
                            oluşturabilirsiniz.
                          </div>
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading
                            ? "Müşteri Kaydediliyor..."
                            : "Müşteri Kaydet"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
