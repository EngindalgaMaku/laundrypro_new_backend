"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Search, Filter, X } from "lucide-react"
import { format } from "date-fns"
import { tr } from "date-fns/locale"

interface SearchFilters {
  query: string
  status: string
  businessType: string
  dateFrom: Date | undefined
  dateTo: Date | undefined
  amountMin: string
  amountMax: string
  customerType: string
}

interface AdvancedSearchModalProps {
  onSearch: (filters: SearchFilters) => void
  currentFilters: SearchFilters
  searchType: "orders" | "customers"
}

const orderStatuses = [
  { value: "", label: "Tüm Durumlar" },
  { value: "PENDING", label: "Beklemede" },
  { value: "IN_PROGRESS", label: "İşlemde" },
  { value: "COMPLETED", label: "Tamamlandı" },
  { value: "DELIVERED", label: "Teslim Edildi" },
  { value: "CANCELLED", label: "İptal" },
]

const businessTypes = [
  { value: "", label: "Tüm Hizmetler" },
  { value: "LAUNDRY", label: "Çamaşırhane" },
  { value: "DRY_CLEANING", label: "Kuru Temizleme" },
  { value: "CARPET_CLEANING", label: "Halı Yıkama" },
  { value: "UPHOLSTERY_CLEANING", label: "Koltuk Temizliği" },
  { value: "CURTAIN_CLEANING", label: "Perde Yıkama" },
  { value: "OTHER", label: "Diğer" },
]

const customerTypes = [
  { value: "", label: "Tüm Müşteriler" },
  { value: "active", label: "Aktif Müşteriler" },
  { value: "inactive", label: "Pasif Müşteriler" },
  { value: "vip", label: "VIP Müşteriler" },
  { value: "new", label: "Yeni Müşteriler" },
]

export function AdvancedSearchModal({ onSearch, currentFilters, searchType }: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>(currentFilters)
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = () => {
    onSearch(filters)
    setIsOpen(false)
  }

  const handleReset = () => {
    const resetFilters: SearchFilters = {
      query: "",
      status: "",
      businessType: "",
      dateFrom: undefined,
      dateTo: undefined,
      amountMin: "",
      amountMax: "",
      customerType: "",
    }
    setFilters(resetFilters)
    onSearch(resetFilters)
  }

  const activeFiltersCount = Object.values(filters).filter((value) => {
    if (value instanceof Date) return true
    return value && value !== ""
  }).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative bg-transparent">
          <Filter className="w-4 h-4 mr-2" />
          Gelişmiş Arama
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Search className="w-5 h-5 mr-2" />
            Gelişmiş Arama - {searchType === "orders" ? "Siparişler" : "Müşteriler"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Basic Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Temel Arama</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-query">Arama Terimi</Label>
                <Input
                  id="search-query"
                  placeholder={
                    searchType === "orders"
                      ? "Sipariş no, müşteri adı, hizmet türü..."
                      : "Müşteri adı, telefon, e-posta..."
                  }
                  value={filters.query}
                  onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Status and Type Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Durum ve Tür Filtreleri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchType === "orders" ? (
                  <div className="space-y-2">
                    <Label>Sipariş Durumu</Label>
                    <Select
                      value={filters.status}
                      onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Durum seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Müşteri Tipi</Label>
                    <Select
                      value={filters.customerType}
                      onValueChange={(value) => setFilters((prev) => ({ ...prev, customerType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Müşteri tipi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Hizmet Türü</Label>
                  <Select
                    value={filters.businessType}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, businessType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Hizmet türü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Date Range */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tarih Aralığı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Başlangıç Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateFrom ? format(filters.dateFrom, "dd MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={(date) => setFilters((prev) => ({ ...prev, dateFrom: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Bitiş Tarihi</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateTo ? format(filters.dateTo, "dd MMMM yyyy", { locale: tr }) : "Tarih seçin"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={(date) => setFilters((prev) => ({ ...prev, dateTo: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Range */}
          {searchType === "orders" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tutar Aralığı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount-min">Minimum Tutar (₺)</Label>
                    <Input
                      id="amount-min"
                      type="number"
                      placeholder="0"
                      value={filters.amountMin}
                      onChange={(e) => setFilters((prev) => ({ ...prev, amountMin: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount-max">Maksimum Tutar (₺)</Label>
                    <Input
                      id="amount-max"
                      type="number"
                      placeholder="1000"
                      value={filters.amountMax}
                      onChange={(e) => setFilters((prev) => ({ ...prev, amountMax: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Aktif Filtreler ({activeFiltersCount})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {filters.query && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Arama: {filters.query}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setFilters((prev) => ({ ...prev, query: "" }))}
                      />
                    </Badge>
                  )}
                  {filters.status && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Durum: {orderStatuses.find((s) => s.value === filters.status)?.label}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setFilters((prev) => ({ ...prev, status: "" }))}
                      />
                    </Badge>
                  )}
                  {filters.businessType && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Hizmet: {businessTypes.find((t) => t.value === filters.businessType)?.label}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setFilters((prev) => ({ ...prev, businessType: "" }))}
                      />
                    </Badge>
                  )}
                  {filters.dateFrom && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Başlangıç: {format(filters.dateFrom, "dd/MM/yyyy")}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setFilters((prev) => ({ ...prev, dateFrom: undefined }))}
                      />
                    </Badge>
                  )}
                  {filters.dateTo && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      Bitiş: {format(filters.dateTo, "dd/MM/yyyy")}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => setFilters((prev) => ({ ...prev, dateTo: undefined }))}
                      />
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6 border-t">
          <Button variant="outline" onClick={handleReset}>
            Filtreleri Temizle
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              🔍 Ara ({activeFiltersCount} filtre)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
