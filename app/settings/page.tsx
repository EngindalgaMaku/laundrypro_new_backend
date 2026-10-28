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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { businessTypes } from "@/lib/business-types"; // Removed static import
import {
  turkishCities,
  getDistrictsByCity,
  getCityById,
  normalizeCity,
  normalizeDistrict,
} from "@/lib/turkish-locations";
import { SaveConfirmationModal } from "@/components/ui/confirmation-modal";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { DEFAULT_VAT_RATE, TR_VAT_RATES, isStandardVatRate, isValidVatRate } from "@/lib/vat";

const VAT_RATE_LABELS: Record<number, string> = {
  20: "%20 (genel oran)",
  10: "%10 (indirimli oran)",
  1: "%1 (indirimli oran)",
  0: "%0 (istisna)",
};

interface User {
  id: string;
  email: string;
  role?: string;
  phone?: string;
  address?: string;
  city?: string;
  district?: string;
  description?: string;
  businessId?: string;
  business?: {
    id?: string;
    name?: string;
    businessType?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    district?: string;
    description?: string;
  } | null;
  businessTypes?: string[];
  businessType?: string;
  businessName?: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [plan, setPlan] = useState<"FREE" | "PRO">("FREE");
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessTypes: [] as string[],
    email: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    description: "",
    vatRate: DEFAULT_VAT_RATE,
    pricesIncludeVat: true,
  });
  // "Diğer" in the VAT list: the typed text, kept apart so "8," can be typed on the way to "8,5"
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [vatCustom, setVatCustom] = useState(false);
  const [vatInput, setVatInput] = useState("");
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    marketingEmails: false,
    whatsappNotifications: true,
    deliveryReminders: true,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [businessTypes, setBusinessTypes] = useState<Array<{value: string, label: string, description?: string}>>([]);
  const [loadingBusinessTypes, setLoadingBusinessTypes] = useState(true);
  const router = useRouter();

  // DEBUG: Log sidebar state changes
  console.log("SettingsPage - Sidebar States:", {
    isMobileMenuOpen,
    isSidebarCollapsed,
  });

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // Check if user has business, if not create one automatically
    checkAndCreateBusiness(parsedUser);

    fetchUserProfile(parsedUser.id);

    setBusinessData({
      businessName: parsedUser.business?.name || parsedUser.businessName || "",
      businessTypes:
        parsedUser.businessTypes ||
        [parsedUser.business?.businessType || parsedUser.businessType].filter(
          Boolean
        ),
      email: parsedUser.email,
      phone: parsedUser.phone || parsedUser.business?.phone || "",
      address: parsedUser.address || parsedUser.business?.address || "",
      city: parsedUser.city || parsedUser.business?.city || "",
      district: parsedUser.district || parsedUser.business?.district || "",
      description: parsedUser.description || parsedUser.business?.description || "",
      // Replaced by the saved values once /api/business/[id] responds
      vatRate: DEFAULT_VAT_RATE,
      pricesIncludeVat: true,
    });

    // Fetch plan/entitlements
    (async () => {
      try {
        const resp = await fetch("/api/subscriptions/plan");
        const data = await resp.json();
        if (data?.plan) setPlan(data.plan);
      } catch (e) {
        console.error("Failed to load plan", e);
      } finally {
        setLoadingPlan(false);
      }
    })();
  }, [router]);

  // Fetch business types from API
  useEffect(() => {
    const fetchBusinessTypes = async () => {
      try {
        const response = await fetch('/api/business/types');
        const data = await response.json();
        if (data.success && data.businessTypes) {
          console.log("🔍 [SETTINGS] Business types from API:", data.businessTypes);
          setBusinessTypes(data.businessTypes);
        } else {
          // Fallback to default types
          setBusinessTypes([
            { value: "DRY_CLEANING", label: "Kuru Temizleme" },
            { value: "LAUNDRY", label: "Çamaşırhane" },
            { value: "CARPET_CLEANING", label: "Halı Yıkama" },
            { value: "UPHOLSTERY_CLEANING", label: "Döşeme Temizleme" },
            { value: "CURTAIN_CLEANING", label: "Perde Temizleme" },
            { value: "OTHER", label: "Diğer" },
          ]);
        }
      } catch (error) {
        console.error("Error fetching business types:", error);
        // Fallback to default types
        setBusinessTypes([
          { value: "DRY_CLEANING", label: "Kuru Temizleme" },
          { value: "LAUNDRY", label: "Çamaşırhane" },
          { value: "CARPET_CLEANING", label: "Halı Yıkama" },
          { value: "UPHOLSTERY_CLEANING", label: "Döşeme Temizleme" },
          { value: "CURTAIN_CLEANING", label: "Perde Temizleme" },
          { value: "OTHER", label: "Diğer" },
        ]);
      } finally {
        setLoadingBusinessTypes(false);
      }
    };

    fetchBusinessTypes();
  }, []);

  const checkAndCreateBusiness = async (user: any) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Check if user already has a business
      const userResponse = await fetch(`/api/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (userResponse.ok) {
        const userResult = await userResponse.json();
        // The API wraps the record as { user: {...} }
        const userData = userResult.user ?? userResult;

        // If user doesn't have a business, create one
        if (!userData.businessId && !userData.business) {
          
          const businessResponse = await fetch(`/api/business`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              businessName: user.businessName || `${user.firstName || "İşletme"} ${user.lastName || "Sahibi"}`,
              email: user.email,
              phone: user.phone || "",
              address: user.address || "",
              city: user.city || "",
              district: user.district || "",
              description: user.description || "",
              businessTypes: user.businessTypes || ["LAUNDRY"],
            }),
          });

          if (businessResponse.ok) {
            const businessResult = await businessResponse.json();
            
            // Update localStorage with new business info
            const updatedUser = {
              ...user,
              businessId: businessResult.business.id,
              business: businessResult.business
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            toast.success("İşletme bilgileriniz otomatik oluşturuldu!");
          }
        }
      }
    } catch (error) {
      console.error("Auto business creation error:", error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch user data
      const userResponse = await fetch(`/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        
        // If user has a business, fetch business data
        if (userData.businessId) {
          const businessResponse = await fetch(`/api/business/${userData.businessId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (businessResponse.ok) {
            const businessResult = await businessResponse.json();
            const businessData = businessResult.business ?? businessResult;
            console.log("🔍 [SETTINGS] Business data from API:", businessData);
            
            setBusinessData((prev) => ({
              ...prev,
              businessName: businessData.name || prev.businessName,
              businessTypes: businessData.businessTypes || businessData.services?.map((s: any) => s.category) || [businessData.businessType].filter(Boolean) || prev.businessTypes,
              email: businessData.email || prev.email,
              phone: userData.phone || businessData.phone || "",
              address: businessData.address || "",
              // older records hold slugs ("ankara"); the selects use display names
              city: normalizeCity(businessData.city || ""),
              district: normalizeDistrict(businessData.city || "", businessData.district || ""),
              description: businessData.description || "",
              vatRate: Number(businessData.vatRate ?? businessData.settings?.taxRate ?? DEFAULT_VAT_RATE),
              pricesIncludeVat: businessData.pricesIncludeVat ?? true,
            }));
            
            console.log("✅ [SETTINGS] Updated business data with types:", {
              businessTypes: businessData.businessTypes || businessData.services?.map((s: any) => s.category) || [businessData.businessType].filter(Boolean)
            });
          }
        } else {
          // No business associated, use user data only
          setBusinessData((prev) => ({
            ...prev,
            phone: userData.phone || "",
            address: "",
            city: "",
            district: "",
            description: "",
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch user profile:", error);
    }
  };

  if (!user) {
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>;
  }

  const handleBusinessUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!businessData.city) {
      toast.error("İşletme ili seçilmelidir");
      return;
    }
    if (vatCustom && !isValidVatRate(Number(vatInput.replace(",", ".")))) {
      toast.error("KDV oranını 0 ile 100 arasında girin");
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  };

  const confirmBusinessUpdate = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);


    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.");
        router.push("/");
        return;
      }

      // Update business data if user has a business
      let businessResponse;
      const businessId = user?.business?.id || user?.businessId;
      
      
      if (businessId) {
        // Update existing business
        businessResponse = await fetch(`/api/business/${businessId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(businessData),
        });
      } else {
        // Create new business and associate with user
        businessResponse = await fetch(`/api/business`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...businessData,
            userId: user?.id
          }),
        });
      }

      // Update user data (personal info)
      const userResponse = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: businessData.email,
          phone: businessData.phone,
        }),
      });


      if (userResponse.ok && (!businessResponse || businessResponse.ok)) {
        const updatedUserData = await userResponse.json();
        let updatedBusinessData = null;
        if (businessResponse) {
          updatedBusinessData = await businessResponse.json();
        }

        // Update local storage with new business data
        const updatedUser = {
          ...user,
          businessId: updatedBusinessData?.business?.id || user?.businessId,
          business: {
            id: updatedBusinessData?.business?.id || user?.business?.id,
            name: businessData.businessName,
            businessType: businessData.businessTypes[0] || "LAUNDRY",
            email: businessData.email,
            phone: businessData.phone,
            address: businessData.address,
            city: businessData.city,
            district: businessData.district,
            description: businessData.description,
          },
          businessTypes: businessData.businessTypes,
          email: businessData.email,
          phone: businessData.phone,
        };
        
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);

        toast.success("İşletme bilgileri başarıyla güncellendi!");
      } else {
        let errorMessage = "Güncelleme başarısız oldu.";
        try {
          if (!userResponse.ok) {
            const userError = await userResponse.json();
            errorMessage = userError.message || errorMessage;
          } else if (businessResponse && !businessResponse.ok) {
            const businessError = await businessResponse.json();
            errorMessage = businessError.message || errorMessage;
          }
        } catch (e) {
          // Error parsing response, use default message
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Update error:", error);
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessTypeToggle = (typeValue: string, checked: boolean) => {
    if (checked) {
      setBusinessData((prev) => ({
        ...prev,
        businessTypes: [...prev.businessTypes, typeValue],
      }));
    } else {
      setBusinessData((prev) => ({
        ...prev,
        businessTypes: prev.businessTypes.filter((type) => type !== typeValue),
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => {
          console.log("DEBUG: Settings page sidebar closing");
          setIsMobileMenuOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => {
          console.log("DEBUG: Settings page sidebar collapse toggling");
          setIsSidebarCollapsed(!isSidebarCollapsed);
        }}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          user={user}
          onMenuClick={() => {
            console.log("DEBUG: Settings page menu button clicked");
            setIsMobileMenuOpen(true);
          }}
          isMobileMenuOpen={isMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Ayarlar
              </h1>
              <p className="text-muted-foreground mt-1">
                İşletme ve hesap ayarlarınızı yönetin
              </p>
            </div>

            {/* Plan badge & Upgrade CTA */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Üyelik Planı</CardTitle>
                  <CardDescription>Geçerli planınızı görüntüleyin ve daha fazla özellik için yükseltin</CardDescription>
                </div>
                <div>
                  {loadingPlan ? (
                    <Badge variant="secondary">Yükleniyor...</Badge>
                  ) : plan === "PRO" ? (
                    <Badge className="bg-purple-600">PRO</Badge>
                  ) : (
                    <Badge variant="secondary">FREE</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {plan === "PRO"
                    ? "PRO plan ile gelişmiş entegrasyonlar ve daha yüksek limitlerin keyfini çıkarın."
                    : "FREE plan kullanıyorsunuz. PRO ile WhatsApp entegrasyonu ve e-Fatura gibi gelişmiş özellikleri açabilirsiniz."}
                </div>
                {plan !== "PRO" && (
                  <Button
                    onClick={() => toast.info("PRO'ya yükseltme henüz etkin değil.")}
                    className="w-full sm:w-auto"
                  >
                    PRO'ya Yükselt
                  </Button>
                )}
              </CardContent>
            </Card>
            <Tabs defaultValue="business" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="business">İşletme</TabsTrigger>
                <TabsTrigger value="account">Hesap</TabsTrigger>
                <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
                <TabsTrigger value="security">Güvenlik</TabsTrigger>
              </TabsList>

              {/* Business Settings */}
              <TabsContent value="business">
                <Card>
                  <CardHeader>
                    <CardTitle>İşletme Bilgileri</CardTitle>
                    <CardDescription>
                      İşletmenizin temel bilgilerini güncelleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleBusinessUpdate} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="businessName">İşletme Adı</Label>
                          <Input
                            id="businessName"
                            value={businessData.businessName}
                            onChange={(e) =>
                              setBusinessData((prev) => ({
                                ...prev,
                                businessName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">E-posta</Label>
                          <Input
                            id="email"
                            type="email"
                            value={businessData.email}
                            onChange={(e) =>
                              setBusinessData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label>İşletme Türleri</Label>
                        <p className="text-sm text-muted-foreground">
                          İşletmenizin sunduğu hizmet türlerini seçin (birden
                          fazla seçebilirsiniz)
                        </p>
                        {loadingBusinessTypes ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2 text-sm text-muted-foreground">Hizmet türleri yükleniyor...</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {businessTypes.map((type) => (
                              <div
                                key={type.value}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={type.value}
                                  checked={businessData.businessTypes.includes(
                                    type.value
                                  )}
                                  onCheckedChange={(checked) =>
                                    handleBusinessTypeToggle(
                                      type.value,
                                      checked as boolean
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={type.value}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {type.label}
                                  {type.description && (
                                    <span className="block text-xs text-muted-foreground">
                                      {type.description}
                                    </span>
                                  )}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                        {businessData.businessTypes.length > 0 && !loadingBusinessTypes && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-medium text-green-800">
                              Seçilen Hizmetler ({businessData.businessTypes.length}):
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              {businessData.businessTypes.map(typeValue => {
                                const type = businessTypes.find(t => t.value === typeValue);
                                return type ? type.label : typeValue;
                              }).join(", ")}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefon</Label>
                          <Input
                            id="phone"
                            value={businessData.phone}
                            onChange={(e) =>
                              setBusinessData((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                      </div>

                      {/* City & District Selection */}
                      <div className="space-y-3">
                        <div>
                          <Label className="text-base font-medium">Konum Bilgileri</Label>
                          <p className="text-sm text-muted-foreground">
                            İşletmenizin bulunduğu il ve ilçe bilgileri müşteri eşleştirme ve teslimat rotaları için kullanılır
                          </p>
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">İl *</Label>
                          <Select
                            value={businessData.city}
                            onValueChange={(value) =>
                              setBusinessData((prev) => ({
                                ...prev,
                                city: value,
                                district: "", // Reset district when city changes
                              }))
                            }
                          >
                            <SelectTrigger>
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
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="district">İlçe</Label>
                          <Select
                            value={businessData.district}
                            onValueChange={(value) =>
                              setBusinessData((prev) => ({
                                ...prev,
                                district: value,
                              }))
                            }
                            disabled={!businessData.city}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  businessData.city ? "İlçe seçin..." : "Önce il seçin"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {businessData.city &&
                                getDistrictsByCity(businessData.city).map((district) => (
                                  <SelectItem key={district.id} value={district.id}>
                                    {district.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Adres</Label>
                        <Textarea
                          id="address"
                          value={businessData.address}
                          onChange={(e) =>
                            setBusinessData((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Açıklama</Label>
                        <Textarea
                          id="description"
                          placeholder="İşletmeniz hakkında kısa açıklama..."
                          value={businessData.description}
                          onChange={(e) =>
                            setBusinessData((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-4 rounded-lg border border-border p-4">
                        <div>
                          <h3 className="font-semibold text-foreground">Vergi (KDV)</h3>
                          <p className="text-sm text-muted-foreground">
                            Faturalarda kullanılır. Kuru temizleme, çamaşırhane, halı ve koltuk
                            yıkama hizmetleri genel oran olan %20'ye tabidir. Emin değilseniz
                            mali müşavirinize danışın.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vat-rate">KDV oranı</Label>
                          <Select
                            value={vatCustom || !isStandardVatRate(businessData.vatRate) ? "custom" : String(businessData.vatRate)}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                setVatCustom(true);
                                setVatInput("");
                                return;
                              }
                              setVatCustom(false);
                              setBusinessData((prev) => ({ ...prev, vatRate: Number(value) }));
                            }}
                          >
                            <SelectTrigger id="vat-rate" className="w-full sm:w-64">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[...TR_VAT_RATES].reverse().map((rate) => (
                                <SelectItem key={rate} value={String(rate)}>
                                  {VAT_RATE_LABELS[rate] ?? `%${rate}`}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Diğer (oranı elle girin)</SelectItem>
                            </SelectContent>
                          </Select>
                          {(vatCustom || !isStandardVatRate(businessData.vatRate)) && (
                            <div className="space-y-1.5">
                              <div className="relative w-full sm:w-64">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                                <Input
                                  id="vat-rate-custom"
                                  inputMode="decimal"
                                  className="pl-7"
                                  aria-label="KDV oranı (yüzde)"
                                  value={vatCustom ? vatInput : String(businessData.vatRate).replace(".", ",")}
                                  onChange={(e) => {
                                    const text = e.target.value.replace(",", ".");
                                    setVatCustom(true);
                                    setVatInput(e.target.value);
                                    const rate = Number(text);
                                    if (text.trim() !== "" && isValidVatRate(rate)) {
                                      setBusinessData((prev) => ({ ...prev, vatRate: rate }));
                                    }
                                  }}
                                />
                              </div>
                              {vatCustom && (vatInput.trim() === "" || !isValidVatRate(Number(vatInput.replace(",", ".")))) ? (
                                <p className="text-sm text-destructive">0 ile 100 arasında bir oran girin (örn. 18 veya 8,5).</p>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  Türkiye'de yürürlükteki oranlar %0, %1, %10 ve %20'dir. Farklı bir oranı yalnızca
                                  mevzuat değişirse veya mali müşaviriniz önerirse kullanın.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Label htmlFor="prices-include-vat">Fiyatlar KDV dahil</Label>
                            <p className="text-sm text-muted-foreground">
                              {businessData.pricesIncludeVat
                                ? "Siparişte girilen tutar KDV dahildir; fatura bu tutardan KDV'yi ayırır."
                                : "Siparişte girilen tutar KDV hariçtir; fatura KDV'yi üzerine ekler."}
                            </p>
                          </div>
                          <Switch
                            id="prices-include-vat"
                            checked={businessData.pricesIncludeVat}
                            onCheckedChange={(checked) =>
                              setBusinessData((prev) => ({ ...prev, pricesIncludeVat: checked }))
                            }
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Güncelleniyor..." : "Bilgileri Güncelle"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Account Settings */}
              <TabsContent value="account">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Hesap Bilgileri</CardTitle>
                      <CardDescription>
                        Giriş bilgilerinizi yönetin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Mevcut E-posta</Label>
                        <Input value={user.email} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Hesap Türü</Label>
                        <Input value="İşletme Sahibi" disabled />
                      </div>
                      <div className="space-y-2">
                        <Label>Üyelik Tarihi</Label>
                        <Input value="15 Ocak 2024" disabled />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Şifre Değiştir</CardTitle>
                      <CardDescription>
                        Hesap güvenliğiniz için düzenli olarak şifrenizi
                        değiştirin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Mevcut Şifre</Label>
                        <Input id="currentPassword" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Yeni Şifre</Label>
                        <Input id="newPassword" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Yeni Şifre (Tekrar)
                        </Label>
                        <Input id="confirmPassword" type="password" />
                      </div>
                      <Button>Şifreyi Güncelle</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Notifications */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Bildirim Ayarları</CardTitle>
                    <CardDescription>
                      Hangi bildirimleri almak istediğinizi seçin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>E-posta Bildirimleri</Label>
                        <p className="text-sm text-muted-foreground">
                          Önemli güncellemeler için e-posta alın
                        </p>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            emailNotifications: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Bildirimleri</Label>
                        <p className="text-sm text-muted-foreground">
                          Acil durumlar için SMS alın
                        </p>
                      </div>
                      <Switch
                        checked={notifications.smsNotifications}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            smsNotifications: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>WhatsApp Bildirimleri</Label>
                        <p className="text-sm text-muted-foreground">
                          WhatsApp üzerinden bildirim alın
                        </p>
                      </div>
                      <Switch
                        checked={notifications.whatsappNotifications}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            whatsappNotifications: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Sipariş Güncellemeleri</Label>
                        <p className="text-sm text-muted-foreground">
                          Sipariş durumu değişikliklerinde bildirim alın
                        </p>
                      </div>
                      <Switch
                        checked={notifications.orderUpdates}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            orderUpdates: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Teslimat Hatırlatıcıları</Label>
                        <p className="text-sm text-muted-foreground">
                          Teslimat zamanı yaklaştığında hatırlatıcı alın
                        </p>
                      </div>
                      <Switch
                        checked={notifications.deliveryReminders}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            deliveryReminders: checked,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Pazarlama E-postaları</Label>
                        <p className="text-sm text-muted-foreground">
                          Yeni özellikler ve promosyonlar hakkında bilgi alın
                        </p>
                      </div>
                      <Switch
                        checked={notifications.marketingEmails}
                        onCheckedChange={(checked) =>
                          setNotifications((prev) => ({
                            ...prev,
                            marketingEmails: checked,
                          }))
                        }
                      />
                    </div>
                    <Button>Bildirim Ayarlarını Kaydet</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security */}
              <TabsContent value="security">
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Güvenlik Ayarları</CardTitle>
                      <CardDescription>
                        Hesabınızın güvenliğini artırın
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>İki Faktörlü Doğrulama</Label>
                          <p className="text-sm text-muted-foreground">
                            Hesabınız için ek güvenlik katmanı
                          </p>
                        </div>
                        <Button variant="outline">Etkinleştir</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Oturum Geçmişi</Label>
                          <p className="text-sm text-muted-foreground">
                            Son giriş yapılan cihazları görüntüle
                          </p>
                        </div>
                        <Button variant="outline">Görüntüle</Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Veri İndirme</Label>
                          <p className="text-sm text-muted-foreground">
                            Tüm verilerinizi indirin
                          </p>
                        </div>
                        <Button variant="outline">İndir</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-destructive">
                    <CardHeader>
                      <CardTitle className="text-destructive">
                        Tehlikeli Bölge
                      </CardTitle>
                      <CardDescription>
                        Bu işlemler geri alınamaz
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Hesabı Sil</Label>
                          <p className="text-sm text-muted-foreground">
                            Hesabınızı ve tüm verilerinizi kalıcı olarak silin
                          </p>
                        </div>
                        <Button variant="destructive" onClick={() => setIsDeleteAccountOpen(true)}>
                          Hesabı Sil
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Çıkış Yap</Label>
                          <p className="text-sm text-muted-foreground">
                            Mevcut oturumdan çıkış yapın
                          </p>
                        </div>
                        <Button variant="outline" onClick={handleLogout}>
                          Çıkış Yap
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      <DeleteAccountDialog
        open={isDeleteAccountOpen}
        onOpenChange={setIsDeleteAccountOpen}
        isOwner={user?.role === "OWNER"}
      />

      {/* Confirmation Modal */}
      <SaveConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmBusinessUpdate}
        title="İşletme Bilgilerini Güncelle"
        description="İşletme bilgilerinizi güncellemek istediğinize emin misiniz? Bu değişiklikler tüm sistemde geçerli olacaktır."
        isLoading={isLoading}
      />
    </div>
  );
}
