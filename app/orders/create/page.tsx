"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
// removed service select
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface User {
  id: string
  email: string
  businessType: string
  businessName: string
}

interface Customer {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
  city?: string
  district?: string
}

// services removed for now

export default function CreateOrderPage() {
  const [user, setUser] = useState<User | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [orderData, setOrderData] = useState({
    description: "",
    amount: "",
    deliveryDate: "",
    notes: "",
    deliveryNotes: "",
    referenceCode: "",
  })
  const router = useRouter()
  const [usage, setUsage] = useState<{plan: "FREE"|"PRO"; count: number; limit: number|null}>({plan:"FREE", count:0, limit:50})
  // From Settings > İşletme; tells staff whether the amount they type includes VAT
  const [pricesIncludeVat, setPricesIncludeVat] = useState(true)
  const [loadingUsage, setLoadingUsage] = useState(true)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (!userData) {
      router.push("/")
      return
    }
    setUser(JSON.parse(userData))
    fetchCustomers()
    ;(async() => {
      try {
        const resp = await fetch('/api/orders/daily-usage', {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
        })
        const data = await resp.json()
        if (data?.success) {
          setUsage({ plan: data.plan, count: data.count, limit: data.limit })
        }
      } catch (e) {
        console.error('daily usage fetch failed', e)
      } finally {
        setLoadingUsage(false)
      }
    })()
    fetch('/api/business/me', {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((data) => {
        const business = data?.business ?? data
        const value = business?.pricesIncludeVat ?? business?.settings?.pricesIncludeVat
        if (typeof value === 'boolean') setPricesIncludeVat(value)
      })
      .catch(() => {})
  }, [router])

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch("/api/customers", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const customersData = await response.json()
        setCustomers(customersData)
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    }
  }

  if (!user) {
    return <div className="p-6 text-muted-foreground">Yükleniyor…</div>
  }

  // services disabled

  const handleAmountChange = (value: string) => {
    let sanitized = value.replace(/[^0-9.,]/g, "")
    const firstSepIndex = sanitized.search(/[.,]/)
    if (firstSepIndex !== -1) {
      const head = sanitized.slice(0, firstSepIndex + 1)
      const tail = sanitized.slice(firstSepIndex + 1).replace(/[.,]/g, "")
      sanitized = head + tail
    }
    setOrderData((prev) => ({ ...prev, amount: sanitized }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedCustomer) {
      toast.error("Lütfen bir müşteri seçin")
      return
    }
    if (!orderData.description.trim()) {
      toast.error("Lütfen sipariş bilgisi girin")
      return
    }
    if (!orderData.amount.trim()) {
      toast.error("Lütfen tutar girin")
      return
    }

    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("Oturum bulunamadı")
      }

      const parsedAmount = parseFloat(orderData.amount.replace(',', '.')) || 0
      const combinedNotesParts: string[] = []
      if (orderData.description) combinedNotesParts.push(orderData.description)
      if (orderData.notes) combinedNotesParts.push(orderData.notes)
      if (orderData.deliveryNotes) combinedNotesParts.push(`Teslimat Notu: ${orderData.deliveryNotes}`)
      if (orderData.referenceCode) combinedNotesParts.push(`Referans: ${orderData.referenceCode}`)
      const combinedNotes = combinedNotesParts.join('\n')

      const payload = {
        customerId: selectedCustomer.id,
        // manual amount flow: no services, send totalAmount
        totalAmount: parsedAmount,
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : undefined,
        notes: combinedNotes,
        paymentMethod: undefined,
        priority: undefined,
        services: [],
      }

      const resp = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err?.error || `Sipariş oluşturulamadı (kod ${resp.status})`)
      }

      // const data = await resp.json()
      // Başarılı -> sipariş listesine dön
      router.push('/orders')
    } catch (err: any) {
      toast.error(err?.message || 'Beklenmeyen bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {/* Daily usage badge */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {loadingUsage ? (
                  <Badge variant="secondary">Kullanım yükleniyor...</Badge>
                ) : usage.plan === 'PRO' ? (
                  <Badge className="bg-purple-600">PRO</Badge>
                ) : (
                  <Badge variant="secondary">Bugün: {usage.count}/{usage.limit ?? 50} sipariş</Badge>
                )}
              </div>
            </div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">Yeni Sipariş</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Yeni bir sipariş oluşturun</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.push("/orders")}
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
                      <CardDescription>Sipariş sahibinin bilgilerini girin</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Müşteri Seç *</Label>
                        <Popover open={isCustomerSelectOpen} onOpenChange={setIsCustomerSelectOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isCustomerSelectOpen}
                              className="w-full justify-between"
                            >
                              {selectedCustomer
                                ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.phone}`
                                : "Müşteri seçin..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Müşteri ara..." />
                              <CommandEmpty>Müşteri bulunamadı.</CommandEmpty>
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={`${customer.firstName} ${customer.lastName} ${customer.phone}`}
                                    onSelect={() => {
                                      setSelectedCustomer(customer)
                                      setIsCustomerSelectOpen(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {customer.firstName} {customer.lastName}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        📞 {customer.phone}
                                        {customer.email && ` • ${customer.email}`}
                                        {customer.address && ` • ${customer.address}`}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {selectedCustomer && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <h4 className="font-medium mb-2">Seçili Müşteri Bilgileri</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Ad Soyad:</span> {selectedCustomer.firstName} {selectedCustomer.lastName}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Telefon:</span> {selectedCustomer.phone}
                            </div>
                            {selectedCustomer.email && (
                              <div>
                                <span className="text-muted-foreground">E-posta:</span> {selectedCustomer.email}
                              </div>
                            )}
                            {selectedCustomer.address && (
                              <div className="md:col-span-2">
                                <span className="text-muted-foreground">Adres:</span> {selectedCustomer.address}
                                {selectedCustomer.city && `, ${selectedCustomer.city}`}
                                {selectedCustomer.district && ` / ${selectedCustomer.district}`}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => router.push("/customers/create")}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Yeni Müşteri Ekle
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Details */}
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Sipariş Detayları</CardTitle>
                      <CardDescription>Sipariş bilgisi, tutar ve teslim tarihini girin</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Sipariş Bilgisi *</Label>
                        <Textarea
                          id="description"
                          placeholder="Örn: Ütü + Kuru temizleme vb."
                          value={orderData.description}
                          onChange={(e) => setOrderData((prev) => ({ ...prev, description: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Tutar (₺, KDV {pricesIncludeVat ? 'dahil' : 'hariç'}) *</Label>
                          <Input
                            id="amount"
                            type="text"
                            placeholder="150"
                            value={orderData.amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deliveryDate">Teslim Tarihi</Label>
                          <Input
                            id="deliveryDate"
                            type="date"
                            value={orderData.deliveryDate}
                            onChange={(e) => setOrderData((prev) => ({ ...prev, deliveryDate: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryNotes">Teslimat Notu</Label>
                        <Textarea
                          id="deliveryNotes"
                          placeholder="Teslimat sırasında dikkat edilmesi gerekenler..."
                          value={orderData.deliveryNotes}
                          onChange={(e) => setOrderData((prev) => ({ ...prev, deliveryNotes: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="referenceCode">Referans Kodu</Label>
                        <Input
                          id="referenceCode"
                          placeholder="Örn: REF-12345"
                          value={orderData.referenceCode}
                          onChange={(e) => setOrderData((prev) => ({ ...prev, referenceCode: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notlar</Label>
                        <Textarea
                          id="notes"
                          placeholder="Ek notlar..."
                          value={orderData.notes}
                          onChange={(e) => setOrderData((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Summary */}
                <div>
                  <Card className="sticky top-6">
                    <CardHeader>
                      <CardTitle>Sipariş Özeti</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Müşteri:</span>
                          <span>{selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sipariş Bilgisi:</span>
                          <span className="truncate max-w-[180px]" title={orderData.description}>{orderData.description || "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tutar:</span>
                          <span>{orderData.amount ? `₺${orderData.amount}` : "-"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Teslim:</span>
                          <span>{orderData.deliveryDate || "-"}</span>
                        </div>
                        {orderData.referenceCode && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Referans:</span>
                            <span>{orderData.referenceCode}</span>
                          </div>
                        )}
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-medium">
                          <span>Toplam:</span>
                          <span>{orderData.amount ? `₺${orderData.amount}` : "₺0"}</span>
                        </div>
                        {usage.plan !== 'PRO' && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Daha fazla limit ve gelişmiş özellikler için aboneliğinizi <strong>mobil uygulama</strong> üzerinden PRO'ya yükseltebilirsiniz.
                          </p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Sipariş Oluşturuluyor..." : "Sipariş Oluştur"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}
