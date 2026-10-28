"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building,
  Phone,
  ArrowRight,
  Loader2,
  Sparkles,
  Shield,
  MapPin,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { businessTypes } from "@/lib/business-types";
import {
  turkishCities,
  getDistrictsByCity,
  getCityById,
} from "@/lib/turkish-locations";

export function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    businessName: "",
    businessTypes: [] as string[],
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
    district: "",
    firstName: "",
    lastName: "",
    description: "",
  });
  // KVKK: the first three are required by /api/auth/register; marketing is optional
  const [consents, setConsents] = useState({
    kvkk: false,
    privacy: false,
    terms: false,
    marketing: false,
  });

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Giriş başarılı! Yönlendiriliyorsunuz...");
        // Force page reload to ensure localStorage is read properly
        window.location.href = "/dashboard";
      } else {
        toast.error(data.error || "Giriş başarısız");
      }
    } catch (error) {
      toast.error("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate mandatory fields
    if (!registerData.city) {
      toast.error("İl seçimi zorunludur");
      setIsLoading(false);
      return;
    }

    if (!registerData.district) {
      toast.error("İlçe seçimi zorunludur");
      setIsLoading(false);
      return;
    }

    if (registerData.password.length < 8) {
      toast.error("Şifre en az 8 karakter olmalıdır");
      setIsLoading(false);
      return;
    }

    if (!consents.kvkk || !consents.privacy || !consents.terms) {
      toast.error("Devam etmek için aydınlatma metni, gizlilik politikası ve kullanım şartlarını onaylayın");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Shape expected by /api/auth/register: { user, business, consents }
        body: JSON.stringify({
          user: {
            firstName:
              registerData.firstName ||
              registerData.businessName.split(" ")[0] ||
              "İşletme",
            lastName: registerData.lastName || "Sahibi",
            email: registerData.email,
            password: registerData.password,
            phone: registerData.phone || undefined,
          },
          business: {
            name: registerData.businessName,
            type: registerData.businessTypes[0] || "LAUNDRY",
            types: registerData.businessTypes,
            phone: registerData.phone || undefined,
            address: registerData.address || undefined,
            city: registerData.city,
            district: registerData.district,
          },
          consents: { ...consents, consentDate: new Date().toISOString() },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        toast.success("Kayıt başarılı! Hoş geldiniz!");
        // Force page reload to ensure localStorage is read properly
        window.location.href = "/dashboard";
      } else {
        toast.error(data.error || "Kayıt başarısız");
      }
    } catch (error) {
      toast.error("Bağlantı hatası. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      {/* Compact Glass Card */}
      <div className="relative bg-card border border-border rounded-xl shadow-card overflow-hidden">

        {/* Header Section */}
        <div className="relative p-3 sm:p-4 pb-2 sm:pb-3">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-3 sm:mb-4">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent rounded-full flex items-center justify-center">
                    {isLogin ? (
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    ) : (
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 leading-tight">
                  {isLogin ? "Hoş Geldiniz" : "Kayıt Olun"}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base font-medium">
                  {isLogin ? "Giriş yapın" : "Hesap oluşturun"}
                </p>
              </div>

              {/* Premium Mode Toggle */}
              <div className="relative mb-5 rounded-lg bg-muted p-1">
                <div className="relative grid grid-cols-2">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                      isLogin
                        ? "bg-card text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Giriş Yap
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`h-10 rounded-md text-sm font-semibold transition-colors ${
                      !isLogin
                        ? "bg-card text-foreground shadow-card"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Kayıt Ol
                  </button>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="px-3 sm:px-4 pb-3 sm:pb-4">
              {isLogin ? (
                /* Premium Login Form */
                <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Email Field */}
                    <div className="relative group">
                      <Label
                        htmlFor="email"
                        className="block text-foreground font-semibold mb-2 text-sm"
                      >
                        E-posta adresi
                      </Label>
                      <div className="relative">
                        <Mail
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "email"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <Input
                          id="email"
                          type="email"
                          placeholder="ornek@email.com"
                          value={loginData.email}
                          onChange={(e) =>
                            setLoginData((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          onFocus={() => setFocusedField("email")}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={`pl-12 h-11 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors focus:border-primary ${
                            focusedField === "email"
                              ? "border-primary"
                              : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="relative group">
                      <Label
                        htmlFor="password"
                        className="block text-foreground font-semibold mb-3 text-sm"
                      >
                        Şifre
                      </Label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "password"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••"
                          value={loginData.password}
                          onChange={(e) =>
                            setLoginData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          onFocus={() => setFocusedField("password")}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={`pl-12 pr-12 h-11 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors focus:border-primary ${
                            focusedField === "password"
                              ? "border-primary"
                              : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-300"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center space-x-3 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="w-4 h-4 rounded border-[color:var(--input-border)] text-primary focus:ring-ring/50 focus:ring-2"
                      />
                      <span className="font-medium">Beni hatırla</span>
                    </label>
                    <Link
                      href="/sifre-sifirla"
                      className="text-primary hover:underline font-semibold transition-colors"
                    >
                      Şifremi unuttum
                    </Link>
                  </div>

                  {/* Premium Login Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-md disabled:opacity-60 disabled:cursor-not-allowed group overflow-hidden relative"
                  >

                    <div className="relative flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <ArrowRight className="h-5 w-5 mr-2" />
                      )}
                      {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                    </div>
                  </Button>
                </form>
              ) : (
                /* Premium Register Form */
                <form
                  onSubmit={handleRegister}
                  className="space-y-3 sm:space-y-4"
                >
                  <div className="space-y-3 sm:space-y-4">
                    {/* Name Fields Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <Label
                          htmlFor="firstName"
                          className="block text-foreground font-semibold mb-3 text-sm"
                        >
                          Ad
                        </Label>
                        <div className="relative">
                          <User
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "firstName"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="Adınız"
                            value={registerData.firstName}
                            onChange={(e) =>
                              setRegisterData((prev) => ({
                                ...prev,
                                firstName: e.target.value,
                              }))
                            }
                            onFocus={() => setFocusedField("firstName")}
                            onBlur={() => setFocusedField(null)}
                            className={`pl-12 h-10 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors ${
                              focusedField === "firstName"
                                ? "border-primary"
                                : ""
                            }`}
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <Label
                          htmlFor="lastName"
                          className="block text-foreground font-semibold mb-3 text-sm"
                        >
                          Soyad
                        </Label>
                        <div className="relative">
                          <User
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "lastName"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Soyadınız"
                            value={registerData.lastName}
                            onChange={(e) =>
                              setRegisterData((prev) => ({
                                ...prev,
                                lastName: e.target.value,
                              }))
                            }
                            onFocus={() => setFocusedField("lastName")}
                            onBlur={() => setFocusedField(null)}
                            className={`pl-12 h-10 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors ${
                              focusedField === "lastName"
                                ? "border-primary"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Name */}
                    <div className="relative group">
                      <Label
                        htmlFor="businessName"
                        className="block text-foreground font-semibold mb-3 text-sm"
                      >
                        İşletme adı
                      </Label>
                      <div className="relative">
                        <Building
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "businessName"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <Input
                          id="businessName"
                          type="text"
                          placeholder="LaundryPro Temizlik Hizmetleri"
                          value={registerData.businessName}
                          onChange={(e) =>
                            setRegisterData((prev) => ({
                              ...prev,
                              businessName: e.target.value,
                            }))
                          }
                          onFocus={() => setFocusedField("businessName")}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={`pl-12 h-9 sm:h-10 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors ${
                            focusedField === "businessName"
                              ? "border-primary"
                              : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Business Types */}
                    <div className="space-y-3">
                      <Label className="block text-foreground font-semibold mb-3 text-sm">
                        Hizmet türleri
                      </Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        İşletmenizin sunduğu hizmetleri seçin (birden fazla
                        seçebilirsiniz)
                      </p>
                      <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
                        {businessTypes.map((type) => (
                          <div
                            key={type.value}
                            className="flex items-center space-x-3 p-3 bg-card rounded-md border border-border hover:bg-muted transition-colors"
                          >
                            <Checkbox
                              id={type.value}
                              checked={registerData.businessTypes.includes(
                                type.value
                              )}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setRegisterData((prev) => ({
                                    ...prev,
                                    businessTypes: [
                                      ...prev.businessTypes,
                                      type.value,
                                    ],
                                  }));
                                } else {
                                  setRegisterData((prev) => ({
                                    ...prev,
                                    businessTypes: prev.businessTypes.filter(
                                      (t) => t !== type.value
                                    ),
                                  }));
                                }
                              }}
                              className="border-[color:var(--input-border)] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{type.icon}</span>
                                <Label
                                  htmlFor={type.value}
                                  className="text-foreground font-medium cursor-pointer"
                                >
                                  {type.label}
                                </Label>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {type.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Email & Phone Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <Label
                          htmlFor="regEmail"
                          className="block text-foreground font-semibold mb-3 text-sm"
                        >
                          E-posta
                        </Label>
                        <div className="relative">
                          <Mail
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "regEmail"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Input
                            id="regEmail"
                            type="email"
                            placeholder="ornek@email.com"
                            value={registerData.email}
                            onChange={(e) =>
                              setRegisterData((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            onFocus={() => setFocusedField("regEmail")}
                            onBlur={() => setFocusedField(null)}
                            required
                            className={`pl-12 h-10 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors ${
                              focusedField === "regEmail"
                                ? "border-primary"
                                : ""
                            }`}
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <Label
                          htmlFor="phone"
                          className="block text-foreground font-semibold mb-3 text-sm"
                        >
                          Telefon
                        </Label>
                        <div className="relative">
                          <Phone
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "phone"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="0555 123 45 67"
                            value={registerData.phone}
                            onChange={(e) =>
                              setRegisterData((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                            onFocus={() => setFocusedField("phone")}
                            onBlur={() => setFocusedField(null)}
                            className={`pl-12 h-10 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors ${
                              focusedField === "phone"
                                ? "border-primary"
                                : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* City & District Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative group">
                        <Label
                          htmlFor="city"
                          className="block text-foreground font-semibold mb-3 text-sm"
                        >
                          İl *
                        </Label>
                        <div className="relative">
                          <MapPin
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "city"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Select
                            value={registerData.city}
                            onValueChange={(value) => {
                              setRegisterData((prev) => ({
                                ...prev,
                                city: value,
                                district: "", // Reset district when city changes
                              }));
                            }}
                            required
                          >
                            <SelectTrigger
                              className={`pl-12 h-10 bg-card border border-[color:var(--input-border)] text-foreground rounded-md transition-colors ${
                                focusedField === "city"
                                  ? "border-primary"
                                  : ""
                              }`}
                              onFocus={() => setFocusedField("city")}
                              onBlur={() => setFocusedField(null)}
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
                        </div>
                      </div>

                      <div className="relative group">
                        <Label
                          htmlFor="district"
                          className="block text-foreground font-semibold mb-3 text-sm"
                        >
                          İlçe *
                        </Label>
                        <div className="relative">
                          <Navigation
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "district"
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                          <Select
                            value={registerData.district}
                            onValueChange={(value) =>
                              setRegisterData((prev) => ({
                                ...prev,
                                district: value,
                              }))
                            }
                            disabled={!registerData.city}
                            required
                          >
                            <SelectTrigger
                              className={`pl-12 h-10 bg-card border border-[color:var(--input-border)] text-foreground rounded-md transition-colors disabled:opacity-50 ${
                                focusedField === "district"
                                  ? "border-primary"
                                  : ""
                              }`}
                              onFocus={() => setFocusedField("district")}
                              onBlur={() => setFocusedField(null)}
                            >
                              <SelectValue
                                placeholder={
                                  registerData.city
                                    ? "İlçe seçin..."
                                    : "Önce il seçin"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {registerData.city &&
                                getDistrictsByCity(registerData.city).map(
                                  (district) => (
                                    <SelectItem
                                      key={district.id}
                                      value={district.id}
                                    >
                                      {district.name}
                                    </SelectItem>
                                  )
                                )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="relative group">
                      <Label
                        htmlFor="address"
                        className="block text-foreground font-semibold mb-3 text-sm"
                      >
                        Detay adres
                      </Label>
                      <div className="relative">
                        <MapPin
                          className={`absolute left-4 top-4 h-5 w-5 transition-all duration-300 ${
                            focusedField === "address"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <Textarea
                          id="address"
                          placeholder="Mahalle, sokak, bina no, daire no..."
                          value={registerData.address}
                          onChange={(e) =>
                            setRegisterData((prev) => ({
                              ...prev,
                              address: e.target.value,
                            }))
                          }
                          onFocus={() => setFocusedField("address")}
                          onBlur={() => setFocusedField(null)}
                          className={`pl-12 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors resize-none h-20 ${
                            focusedField === "address"
                              ? "border-primary"
                              : ""
                          }`}
                        />
                      </div>
                      {registerData.city && registerData.district && (
                        <p className="text-xs text-primary/80 mt-2 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getCityById(registerData.city)?.name} /{" "}
                          {
                            getDistrictsByCity(registerData.city).find(
                              (d) => d.id === registerData.district
                            )?.name
                          }
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="relative group">
                      <Label
                        htmlFor="regPassword"
                        className="block text-foreground font-semibold mb-3 text-sm"
                      >
                        Şifre
                      </Label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "regPassword"
                              ? "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                        <Input
                          id="regPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="En az 8 karakter"
                          minLength={8}
                          value={registerData.password}
                          onChange={(e) =>
                            setRegisterData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          onFocus={() => setFocusedField("regPassword")}
                          onBlur={() => setFocusedField(null)}
                          required
                          className={`pl-12 pr-12 h-9 sm:h-10 bg-card border border-[color:var(--input-border)] text-foreground placeholder:text-muted-foreground rounded-md transition-colors ${
                            focusedField === "regPassword"
                              ? "border-primary"
                              : ""
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-all duration-300"
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* KVKK consents */}
                  <div className="space-y-2 text-sm text-foreground">
                    {(
                      [
                        ["kvkk", "/kvkk", "KVKK Aydınlatma Metni", "'ni okudum."],
                        ["privacy", "/gizlilik-politikasi", "Gizlilik Politikası", "'nı kabul ediyorum."],
                        ["terms", "/kullanim-sartlari", "Kullanım Şartları", "'nı kabul ediyorum."],
                      ] as const
                    ).map(([key, href, title, suffix]) => (
                      <label key={key} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consents[key]}
                          onChange={(e) => setConsents((prev) => ({ ...prev, [key]: e.target.checked }))}
                          required
                          aria-label={`${title}${suffix}`}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--input-border)]"
                        />
                        <span>
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-primary underline underline-offset-2"
                          >
                            {title}
                          </a>
                          {suffix} <span className="text-muted-foreground">(zorunlu)</span>
                        </span>
                      </label>
                    ))}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consents.marketing}
                        onChange={(e) => setConsents((prev) => ({ ...prev, marketing: e.target.checked }))}
                        aria-label="Ticari ileti almak istiyorum (isteğe bağlı)"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-[color:var(--input-border)]"
                      />
                      <span>Kampanya ve duyurular için ticari ileti almak istiyorum. (isteğe bağlı)</span>
                    </label>
                  </div>

                  {/* Premium Register Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-md disabled:opacity-60 disabled:cursor-not-allowed group overflow-hidden relative"
                  >

                    <div className="relative flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      ) : (
                        <Sparkles className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                      )}
                      {isLoading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                    </div>
                  </Button>
                </form>
              )}
            </div>
      </div>
    </div>
  );
}
