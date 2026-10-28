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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Check, ChevronsUpDown, Plus, Trash2, Sparkles, Wallet } from "lucide-react"
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

interface CatalogService {
  id: string
  name: string
  category: string
  price: number
  description?: string
}

interface OrderLineItem {
  key: string
  serviceId?: string
  name: string
  quantity: number
  unitPrice: number
}

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
    paidAmount: "",
    paymentMethod: "CASH",
    deliveryDate: "",
    notes: "",
    deliveryNotes: "",
    referenceCode: "",
  })
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([])
  const [selectedItems, setSelectedItems] = useState<OrderLineItem[]>([])
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
    fetchServices()
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

      const response = await fetch("/api/customers?limit=500", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const customersData: Customer[] = await response.json()
        setCustomers(customersData)

        // Pre-select customer if ?customerId= is present in the URL
        try {
          const params = new URLSearchParams(window.location.search)
          const preselectedId = params.get("customerId")
          if (preselectedId) {
            const match = customersData.find((c) => c.id === preselectedId)
            if (match) {
              setSelectedCustomer(match)
            }
          }
        } catch {
          // ignore
        }
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error)
    }
  }

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return
      const response = await fetch("/api/services", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const list = Array.isArray(data) ? data : data.services ?? []
        setCatalogServices(
          list.map((s: any) => ({
            id: s.id,
            name: s.name,
            category: s.category,
            price: Number(s.price || 0),
            description: s.description,
          }))
        )
      }
    } catch (error) {
      console.error("Failed to fetch services:", error)
    }
  }

  const syncItemsToOrderData = (items: OrderLineItem[]) => {
    setSelectedItems(items)
    if (items.length === 0) return
    const total = items.reduce(
      (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0
    )
    const summaryText = items
      .map((it) => `${it.name} (${it.quantity} x ₺${it.unitPrice})`)
      .join(", ")
    setOrderData((prev) => ({
      ...prev,
      amount: String(Number(total.toFixed(2))),
      description: summaryText,
    }))
  }

  const handleAddCatalogService = (serviceId: string) => {
    const svc = catalogServices.find((s) => s.id === serviceId)
    if (!svc) return
    const next: OrderLineItem[] = [
      ...selectedItems,
      {
        key: `${svc.id}-${Date.now()}`,
        serviceId: svc.id,
        name: svc.name,
        quantity: 1,
        unitPrice: svc.price,
      },
    ]
    syncItemsToOrderData(next)
  }

  const handleUpdateLineItem = (
    key: string,
    field: "quantity" | "unitPrice" | "name",
    value: string
  ) => {
    const next = selectedItems.map((it) => {
      if (it.key !== key) return it
      if (field === "name") return { ...it, name: value }
      const num = parseFloat(value.replace(",", "."))
      return {
        ...it,
        [field]: Number.isFinite(num) && num >= 0 ? num : 0,
      }
    })
    syncItemsToOrderData(next)
  }

  const handleRemoveLineItem = (key: string) => {
    const next = selectedItems.filter((it) => it.key !== key)
    syncItemsToOrderData(next)
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
      const parsedPaidAmount = parseFloat((orderData.paidAmount || "").replace(',', '.')) || 0
      const combinedNotesParts: string[] = []
      if (orderData.description) combinedNotesParts.push(orderData.description)
      if (orderData.notes) combinedNotesParts.push(orderData.notes)
      if (orderData.deliveryNotes) combinedNotesParts.push(`Teslimat Notu: ${orderData.deliveryNotes}`)
      if (orderData.referenceCode) combinedNotesParts.push(`Referans: ${orderData.referenceCode}`)
      const combinedNotes = combinedNotesParts.join('\n')

      const payload = {
        customerId: selectedCustomer.id,
        totalAmount: parsedAmount,
        paidAmount: parsedPaidAmount > 0 ? parsedPaidAmount : undefined,
        paymentMethod: parsedPaidAmount > 0 ? orderData.paymentMethod : undefined,
        orderInfo: orderData.description.trim(),
        deliveryNotes: orderData.deliveryNotes.trim() || undefined,
        referenceCode: orderData.referenceCode.trim() || undefined,
        deliveryDate: orderData.deliveryDate ? new Date(orderData.deliveryDate) : undefined,
        notes: combinedNotes,
        priority: undefined,
        items:
          selectedItems.length > 0
            ? selectedItems.map((it) => ({
                serviceId: it.serviceId,
                serviceName: it.name,
                isManualEntry: !it.serviceId,
                quantity: it.quantity || 1,
                unitPrice: it.unitPrice || 0,
              }))
            : undefined,
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
            {/* Header: back link above the title on phones, beside it on wider screens */}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Yeni Sipariş</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Yeni bir sipariş oluşturun</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/orders")}
                className="-ml-2 w-fit text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Siparişler
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
                      {/* Optional Service Catalog Selector */}
                      {catalogServices.length > 0 && (
                        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3.5">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                              <Label className="flex items-center gap-1.5 text-sm font-semibold">
                                <Sparkles className="h-4 w-4 text-primary" />
                                Hizmet Kataloğundan Kalem Ekle (İsteğe Bağlı)
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Halı (m²), kuru temizleme (adet) veya çamaşır (kg) seçerek tutarı otomatik hesaplatabilirsiniz
                              </p>
                            </div>
                            <Select onValueChange={handleAddCatalogService}>
                              <SelectTrigger className="w-full sm:w-64 bg-card">
                                <SelectValue placeholder="+ Katalogdan hizmet seçin..." />
                              </SelectTrigger>
                              <SelectContent>
                                {catalogServices.map((svc) => (
                                  <SelectItem key={svc.id} value={svc.id}>
                                    {svc.name} — ₺{svc.price}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedItems.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-border">
                              {selectedItems.map((item, idx) => (
                                <div
                                  key={item.key}
                                  className="grid grid-cols-12 gap-2 items-center bg-card p-2 rounded-lg border border-border text-sm"
                                >
                                  <div className="col-span-12 sm:col-span-5">
                                    <span className="text-xs text-muted-foreground mr-1">
                                      #{idx + 1}
                                    </span>
                                    <span className="font-medium">{item.name}</span>
                                  </div>
                                  <div className="col-span-5 sm:col-span-3">
                                    <Label className="text-[10px] text-muted-foreground">
                                      Miktar / m² / Kg
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      className="h-8 text-xs"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleUpdateLineItem(
                                          item.key,
                                          "quantity",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="col-span-5 sm:col-span-3">
                                    <Label className="text-[10px] text-muted-foreground">
                                      Birim Fiyat (₺)
                                    </Label>
                                    <Input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      className="h-8 text-xs"
                                      value={item.unitPrice}
                                      onChange={(e) =>
                                        handleUpdateLineItem(
                                          item.key,
                                          "unitPrice",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="col-span-2 sm:col-span-1 flex justify-end pt-3">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => handleRemoveLineItem(item.key)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description">Sipariş Bilgisi *</Label>
                        <Textarea
                          id="description"
                          placeholder="Örn: 2 adet 6m² Yün Halı + 1 Yorgan vb."
                          value={orderData.description}
                          onChange={(e) => setOrderData((prev) => ({ ...prev, description: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Toplam Tutar (₺, KDV {pricesIncludeVat ? 'dahil' : 'hariç'}) *</Label>
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

                      {/* Initial Deposit / Payment Section */}
                      <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
                        <Label className="flex items-center gap-1.5 text-sm font-semibold">
                          <Wallet className="h-4 w-4 text-emerald-600" />
                          Alınan Peşinat / Ödeme (İsteğe Bağlı)
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="paidAmount" className="text-xs text-muted-foreground">
                              Şu An Alınan Tutar (₺)
                            </Label>
                            <Input
                              id="paidAmount"
                              type="text"
                              placeholder="0 (Teslimatta alınacaksa boş bırakın)"
                              value={orderData.paidAmount}
                              onChange={(e) =>
                                setOrderData((prev) => ({
                                  ...prev,
                                  paidAmount: e.target.value.replace(/[^0-9.,]/g, ""),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Ödeme Yöntemi</Label>
                            <Select
                              value={orderData.paymentMethod}
                              onValueChange={(val) =>
                                setOrderData((prev) => ({ ...prev, paymentMethod: val }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Nakit</SelectItem>
                                <SelectItem value="CREDIT_CARD">Kredi Kartı / POS</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Havale / EFT / IBAN</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
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
                            Ücretsiz planda günde {usage.limit ?? 50} sipariş oluşturabilirsiniz.
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
