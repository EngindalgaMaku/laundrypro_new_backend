"use client";

import { useState } from "react";
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

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registerData,
          businessType: registerData.businessTypes[0] || "LAUNDRY",
          firstName:
            registerData.firstName ||
            registerData.businessName.split(" ")[0] ||
            "İşletme",
          lastName: registerData.lastName || "Sahibi",
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
      <div className="relative backdrop-blur-xl bg-white/[0.08] border border-white/20 rounded-2xl shadow-xl overflow-hidden">
        {/* Shimmer Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full"></div>

        {/* Header Section */}
        <div className="relative p-3 sm:p-4 pb-2 sm:pb-3">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-3 sm:mb-4">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    {isLogin ? (
                      <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    ) : (
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
                    )}
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/50 to-purple-600/50 rounded-xl blur-md opacity-60 -z-10"></div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent mb-2 leading-tight">
                  {isLogin ? "Hoş Geldiniz" : "Kayıt Olun"}
                </h1>
                <p className="text-white/70 text-sm sm:text-base font-medium">
                  {isLogin ? "Giriş yapın" : "Hesap oluşturun"}
                </p>
              </div>

              {/* Premium Mode Toggle */}
              <div className="relative bg-white/10 p-1 rounded-xl mb-4 sm:mb-6 border border-white/20">
                <div
                  className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r shadow-lg rounded-xl transition-all duration-700 ease-out ${
                    isLogin
                      ? "left-1 from-blue-500 to-purple-600 shadow-blue-500/50"
                      : "left-[calc(50%+4px-1px)] from-emerald-500 to-cyan-600 shadow-emerald-500/50"
                  }`}
                />
                <div className="relative grid grid-cols-2">
                  <button
                    onClick={() => setIsLogin(true)}
                    className={`py-4 px-6 rounded-xl font-bold text-sm transition-all duration-500 ${
                      isLogin
                        ? "text-white shadow-lg transform scale-105"
                        : "text-white/60 hover:text-white/90 hover:scale-105"
                    }`}
                  >
                    GİRİŞ YAP
                  </button>
                  <button
                    onClick={() => setIsLogin(false)}
                    className={`py-4 px-6 rounded-xl font-bold text-sm transition-all duration-500 ${
                      !isLogin
                        ? "text-white shadow-lg transform scale-105"
                        : "text-white/60 hover:text-white/90 hover:scale-105"
                    }`}
                  >
                    KAYIT OL
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
                        className="block text-white/90 font-semibold mb-2 text-sm tracking-wide"
                      >
                        E-POSTA ADRESİ
                      </Label>
                      <div className="relative">
                        <Mail
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "email"
                              ? "text-blue-400 scale-110"
                              : "text-white/50"
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
                          className={`pl-12 h-12 sm:h-14 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/10 focus:bg-white/10 focus:border-blue-400/70 focus:shadow-xl focus:shadow-blue-500/20 ${
                            focusedField === "email"
                              ? "border-blue-400/70 shadow-xl shadow-blue-500/20 scale-[1.02]"
                              : "hover:border-white/40"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="relative group">
                      <Label
                        htmlFor="password"
                        className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                      >
                        ŞİFRE
                      </Label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "password"
                              ? "text-blue-400 scale-110"
                              : "text-white/50"
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
                          className={`pl-12 pr-12 h-12 sm:h-14 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-xl transition-all duration-300 hover:bg-white/10 focus:bg-white/10 focus:border-blue-400/70 focus:shadow-xl focus:shadow-blue-500/20 ${
                            focusedField === "password"
                              ? "border-blue-400/70 shadow-xl shadow-blue-500/20 scale-[1.02]"
                              : "hover:border-white/40"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-all duration-300 hover:scale-110"
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
                    <label className="flex items-center space-x-3 text-white/70 cursor-pointer hover:text-white/90 transition-colors">
                      <input
                        type="checkbox"
                        defaultChecked={true}
                        className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-500/50 focus:ring-2"
                      />
                      <span className="font-medium">Beni hatırla</span>
                    </label>
                    <button
                      type="button"
                      className="text-blue-400 hover:text-blue-300 font-semibold transition-all duration-300 hover:scale-105"
                    >
                      Şifremi unuttum
                    </button>
                  </div>

                  {/* Premium Login Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 sm:h-14 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 hover:from-blue-700 hover:via-blue-800 hover:to-purple-800 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed group overflow-hidden relative"
                  >
                    {/* Button Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-pulse"></div>

                    <div className="relative flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      ) : (
                        <ArrowRight className="h-6 w-6 mr-3 transition-transform duration-300 group-hover:translate-x-1" />
                      )}
                      {isLoading ? "Giriş yapılıyor..." : "GİRİŞ YAP"}
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
                          className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                        >
                          AD
                        </Label>
                        <div className="relative">
                          <User
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "firstName"
                                ? "text-emerald-400 scale-110"
                                : "text-white/50"
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
                            className={`pl-12 h-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                              focusedField === "firstName"
                                ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                                : "hover:border-white/40"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <Label
                          htmlFor="lastName"
                          className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                        >
                          SOYAD
                        </Label>
                        <div className="relative">
                          <User
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "lastName"
                                ? "text-emerald-400 scale-110"
                                : "text-white/50"
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
                            className={`pl-12 h-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                              focusedField === "lastName"
                                ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                                : "hover:border-white/40"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Business Name */}
                    <div className="relative group">
                      <Label
                        htmlFor="businessName"
                        className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                      >
                        İŞLETME ADI
                      </Label>
                      <div className="relative">
                        <Building
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "businessName"
                              ? "text-emerald-400 scale-110"
                              : "text-white/50"
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
                          className={`pl-12 h-9 sm:h-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                            focusedField === "businessName"
                              ? "border-emerald-400/70 shadow-xl shadow-emerald-500/20 scale-[1.02]"
                              : "hover:border-white/40"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Business Types */}
                    <div className="space-y-3">
                      <Label className="block text-white/90 font-semibold mb-3 text-sm tracking-wide">
                        HİZMET TÜRLERİ
                      </Label>
                      <p className="text-xs text-white/70 mb-3">
                        İşletmenizin sunduğu hizmetleri seçin (birden fazla
                        seçebilirsiniz)
                      </p>
                      <div className="grid grid-cols-1 gap-3 max-h-40 overflow-y-auto">
                        {businessTypes.map((type) => (
                          <div
                            key={type.value}
                            className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-all duration-300"
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
                              className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{type.icon}</span>
                                <Label
                                  htmlFor={type.value}
                                  className="text-white/90 font-medium cursor-pointer"
                                >
                                  {type.label}
                                </Label>
                              </div>
                              <p className="text-xs text-white/60 mt-1">
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
                          className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                        >
                          E-POSTA
                        </Label>
                        <div className="relative">
                          <Mail
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "regEmail"
                                ? "text-emerald-400 scale-110"
                                : "text-white/50"
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
                            className={`pl-12 h-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                              focusedField === "regEmail"
                                ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                                : "hover:border-white/40"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="relative group">
                        <Label
                          htmlFor="phone"
                          className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                        >
                          TELEFON
                        </Label>
                        <div className="relative">
                          <Phone
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "phone"
                                ? "text-emerald-400 scale-110"
                                : "text-white/50"
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
                            className={`pl-12 h-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                              focusedField === "phone"
                                ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                                : "hover:border-white/40"
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
                          className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                        >
                          İL *
                        </Label>
                        <div className="relative">
                          <MapPin
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "city"
                                ? "text-emerald-400 scale-110"
                                : "text-white/50"
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
                              className={`pl-12 h-10 bg-white/5 border-2 border-white/20 text-white rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                                focusedField === "city"
                                  ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20"
                                  : "hover:border-white/40"
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
                          className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                        >
                          İLÇE *
                        </Label>
                        <div className="relative">
                          <Navigation
                            className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                              focusedField === "district"
                                ? "text-emerald-400 scale-110"
                                : "text-white/50"
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
                              className={`pl-12 h-10 bg-white/5 border-2 border-white/20 text-white rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 disabled:opacity-50 ${
                                focusedField === "district"
                                  ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20"
                                  : "hover:border-white/40"
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
                        className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                      >
                        DETAY ADRES
                      </Label>
                      <div className="relative">
                        <MapPin
                          className={`absolute left-4 top-4 h-5 w-5 transition-all duration-300 ${
                            focusedField === "address"
                              ? "text-emerald-400 scale-110"
                              : "text-white/50"
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
                          className={`pl-12 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 resize-none h-20 ${
                            focusedField === "address"
                              ? "border-emerald-400/70 shadow-lg shadow-emerald-500/20 scale-[1.02]"
                              : "hover:border-white/40"
                          }`}
                        />
                      </div>
                      {registerData.city && registerData.district && (
                        <p className="text-xs text-emerald-400/80 mt-2 flex items-center gap-1">
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
                        className="block text-white/90 font-semibold mb-3 text-sm tracking-wide"
                      >
                        ŞİFRE
                      </Label>
                      <div className="relative">
                        <Lock
                          className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 transition-all duration-300 ${
                            focusedField === "regPassword"
                              ? "text-emerald-400 scale-110"
                              : "text-white/50"
                          }`}
                        />
                        <Input
                          id="regPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••"
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
                          className={`pl-12 pr-12 h-9 sm:h-10 bg-white/5 border-2 border-white/20 text-white placeholder:text-white/50 rounded-lg transition-all duration-300 hover:bg-white/10 focus:bg-white/10 ${
                            focusedField === "regPassword"
                              ? "border-emerald-400/70 shadow-xl shadow-emerald-500/20 scale-[1.02]"
                              : "hover:border-white/40"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/80 transition-all duration-300 hover:scale-110"
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

                  {/* Premium Register Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 sm:h-14 bg-gradient-to-r from-emerald-600 via-emerald-700 to-cyan-700 hover:from-emerald-700 hover:via-emerald-800 hover:to-cyan-800 text-white font-bold text-base sm:text-lg rounded-xl transition-all duration-500 hover:shadow-2xl hover:shadow-emerald-500/30 hover:scale-[1.02] disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed group overflow-hidden relative"
                  >
                    {/* Button Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-pulse"></div>

                    <div className="relative flex items-center justify-center">
                      {isLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin mr-3" />
                      ) : (
                        <Sparkles className="h-6 w-6 mr-3 transition-transform duration-300 group-hover:rotate-12" />
                      )}
                      {isLoading ? "Hesap oluşturuluyor..." : "HESAP OLUŞTUR"}
                    </div>
                  </Button>
                </form>
              )}
            </div>

        {/* Premium Bottom Accent */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 opacity-60"></div>
      </div>
    </div>
  );
}
