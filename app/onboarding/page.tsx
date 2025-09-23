"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BusinessTypeSelector } from "@/components/business/business-type-selector"
import { getBusinessTypeLabels } from "@/lib/business-types"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessTypes: [] as string[], // Changed from businessType to businessTypes array
    email: "",
    password: "",
    phone: "",
    address: "",
    description: "",
  })
  const router = useRouter()

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      // Mock successful registration
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: "1",
          email: businessData.email,
          businessTypes: businessData.businessTypes, // Store multiple business types
          businessName: businessData.businessName,
        }),
      )
      router.push("/dashboard")
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-3xl">🧺</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">LaundryPro'ya Hoş Geldiniz</h1>
          <p className="text-muted-foreground mt-2">
            Adım {step} / 3 - {step === 1 ? "İşletme Türleri" : step === 2 ? "İşletme Bilgileri" : "Hesap Oluştur"}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-3 mb-8 shadow-inner">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Step 1: Business Type Selection */}
        {step === 1 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">İşletme Türlerinizi Seçin</CardTitle>
              <CardDescription className="text-lg">
                Hangi tür temizlik hizmetleri veriyorsunuz? Birden fazla seçebilirsiniz.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BusinessTypeSelector
                selectedTypes={businessData.businessTypes}
                onSelect={(types) => setBusinessData((prev) => ({ ...prev, businessTypes: types }))}
                multiSelect={true}
              />
              <div className="flex justify-end mt-6">
                <Button
                  onClick={handleNext}
                  disabled={businessData.businessTypes.length === 0}
                  className="px-8 py-3 text-lg font-semibold"
                >
                  Devam Et ({businessData.businessTypes.length} seçildi)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Business Information */}
        {step === 2 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">İşletme Bilgileri</CardTitle>
              <CardDescription className="text-lg">
                {getBusinessTypeLabels(businessData.businessTypes)} işletmenizin bilgilerini girin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-base font-semibold">
                    İşletme Adı *
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="Örnek Temizlik"
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData((prev) => ({ ...prev, businessName: e.target.value }))}
                    required
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-base font-semibold">
                    Telefon *
                  </Label>
                  <Input
                    id="phone"
                    placeholder="0555 123 45 67"
                    value={businessData.phone}
                    onChange={(e) => setBusinessData((prev) => ({ ...prev, phone: e.target.value }))}
                    required
                    className="h-12 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-base font-semibold">
                  Adres
                </Label>
                <Textarea
                  id="address"
                  placeholder="İşletme adresi"
                  value={businessData.address}
                  onChange={(e) => setBusinessData((prev) => ({ ...prev, address: e.target.value }))}
                  className="min-h-[100px] text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">
                  Açıklama
                </Label>
                <Textarea
                  id="description"
                  placeholder="İşletmeniz hakkında kısa açıklama..."
                  value={businessData.description}
                  onChange={(e) => setBusinessData((prev) => ({ ...prev, description: e.target.value }))}
                  className="min-h-[100px] text-base"
                />
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack} className="px-8 py-3 text-lg bg-transparent">
                  Geri
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!businessData.businessName || !businessData.phone}
                  className="px-8 py-3 text-lg font-semibold"
                >
                  Devam Et
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Account Creation */}
        {step === 3 && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Hesap Oluştur</CardTitle>
              <CardDescription className="text-lg">Son adım! Giriş bilgilerinizi belirleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">
                  E-posta *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={businessData.email}
                  onChange={(e) => setBusinessData((prev) => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-semibold">
                  Şifre *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Güçlü bir şifre seçin"
                  value={businessData.password}
                  onChange={(e) => setBusinessData((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  className="h-12 text-base"
                />
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-primary/5 to-secondary/5 p-6 rounded-xl border border-primary/20 mt-8">
                <h3 className="font-bold text-lg mb-4 text-primary">İşletme Özeti:</h3>
                <div className="space-y-3 text-base">
                  <p>
                    <span className="text-muted-foreground font-medium">İşletme:</span>
                    <span className="ml-2 font-semibold">{businessData.businessName}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground font-medium">Hizmet Türleri:</span>
                    <span className="ml-2 font-semibold">{getBusinessTypeLabels(businessData.businessTypes)}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground font-medium">Telefon:</span>
                    <span className="ml-2 font-semibold">{businessData.phone}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground font-medium">E-posta:</span>
                    <span className="ml-2 font-semibold">{businessData.email}</span>
                  </p>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack} className="px-8 py-3 text-lg bg-transparent">
                  Geri
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!businessData.email || !businessData.password || isLoading}
                  className="px-8 py-3 text-lg font-bold"
                >
                  {isLoading ? "🚀 İşletme Kuruluyor..." : "✨ LaundryPro'yu Başlat"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
