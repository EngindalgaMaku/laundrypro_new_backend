"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  DollarSign,
  Package,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ServicePricing {
  id?: string;
  name: string;
  description?: string;
  pricingType: "FIXED" | "PER_M2" | "PER_KG" | "PER_ITEM" | "HOURLY";
  basePrice: number;
  minQuantity: number;
  maxQuantity: number;
  unit: string;
  isActive: boolean;
}

interface Service {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  category: string;
  isActive: boolean;
  price: number;
  pricings: ServicePricing[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "DRY_CLEANING", label: "Kuru Temizleme", icon: "🧥" },
  { value: "LAUNDRY", label: "Çamaşır Yıkama", icon: "👕" },
  { value: "IRONING", label: "Ütüleme", icon: "🔥" },
  { value: "CARPET_CLEANING", label: "Halı Yıkama", icon: "🏠" },
  { value: "UPHOLSTERY_CLEANING", label: "Döşeme Temizlik", icon: "🛋️" },
  { value: "CURTAIN_CLEANING", label: "Perde Temizlik", icon: "🪟" },
  { value: "STAIN_REMOVAL", label: "Leke Çıkarma", icon: "✨" },
  { value: "OTHER", label: "Diğer", icon: "📦" },
];

const PRICING_TYPES = [
  { value: "FIXED", label: "Sabit Fiyat", unit: "adet" },
  { value: "PER_M2", label: "Metrekare Başı", unit: "m²" },
  { value: "PER_KG", label: "Kilo Başı", unit: "kg" },
  { value: "PER_ITEM", label: "Adet Başı", unit: "adet" },
  { value: "HOURLY", label: "Saatlik", unit: "saat" },
];

export default function ServicesManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    isActive: true,
    pricings: [
      {
        name: "Standart",
        description: "",
        pricingType: "FIXED" as const,
        basePrice: 0,
        minQuantity: 1,
        maxQuantity: 0,
        unit: "adet",
        isActive: true,
      },
    ] as ServicePricing[],
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      } else {
        toast({
          title: "Hata",
          description: "Servisler yüklenirken bir hata oluştu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      toast({
        title: "Hata",
        description: "Bağlantı hatası",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateService = async () => {
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Servis başarıyla oluşturuldu",
        });
        setIsCreateModalOpen(false);
        resetForm();
        fetchServices();
      } else {
        const error = await response.json();
        toast({
          title: "Hata",
          description: error.error || "Servis oluşturulurken hata oluştu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating service:", error);
      toast({
        title: "Hata",
        description: "Bağlantı hatası",
        variant: "destructive",
      });
    }
  };

  const handleUpdateService = async () => {
    if (!currentService) return;

    try {
      const response = await fetch(`/api/services/${currentService.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Servis başarıyla güncellendi",
        });
        setIsEditModalOpen(false);
        setCurrentService(null);
        resetForm();
        fetchServices();
      } else {
        const error = await response.json();
        toast({
          title: "Hata",
          description: error.error || "Servis güncellenirken hata oluştu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        title: "Hata",
        description: "Bağlantı hatası",
        variant: "destructive",
      });
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Bu servisi silmek istediğinizden emin misiniz?")) return;

    try {
      const response = await fetch(`/api/services/${serviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Başarılı",
          description: "Servis başarıyla silindi",
        });
        fetchServices();
      } else {
        const error = await response.json();
        toast({
          title: "Hata",
          description: error.error || "Servis silinirken hata oluştu",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Hata",
        description: "Bağlantı hatası",
        variant: "destructive",
      });
    }
  };

  const openEditModal = (service: Service) => {
    setCurrentService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      category: service.category,
      isActive: service.isActive,
      pricings:
        service.pricings.length > 0
          ? service.pricings
          : [
              {
                name: "Standart",
                description: "",
                pricingType: "FIXED" as const,
                basePrice: service.price || 0,
                minQuantity: 1,
                maxQuantity: 0,
                unit: "adet",
                isActive: true,
              },
            ],
    });
    setIsEditModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      isActive: true,
      pricings: [
        {
          name: "Standart",
          description: "",
          pricingType: "FIXED" as const,
          basePrice: 0,
          minQuantity: 1,
          maxQuantity: 0,
          unit: "adet",
          isActive: true,
        },
      ],
    });
  };

  const addPricingOption = () => {
    setFormData({
      ...formData,
      pricings: [
        ...formData.pricings,
        {
          name: `Seçenek ${formData.pricings.length + 1}`,
          description: "",
          pricingType: "FIXED" as const,
          basePrice: 0,
          minQuantity: 1,
          maxQuantity: 0,
          unit: "adet",
          isActive: true,
        },
      ],
    });
  };

  const updatePricingOption = (
    index: number,
    updates: Partial<ServicePricing>
  ) => {
    const updatedPricings = [...formData.pricings];
    updatedPricings[index] = { ...updatedPricings[index], ...updates };

    // Auto-update unit when pricing type changes
    if (updates.pricingType) {
      const pricingType = PRICING_TYPES.find(
        (pt) => pt.value === updates.pricingType
      );
      if (pricingType) {
        updatedPricings[index].unit = pricingType.unit;
      }
    }

    setFormData({ ...formData, pricings: updatedPricings });
  };

  const removePricingOption = (index: number) => {
    if (formData.pricings.length > 1) {
      const updatedPricings = formData.pricings.filter((_, i) => i !== index);
      setFormData({ ...formData, pricings: updatedPricings });
    }
  };

  // Filter services
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const stats = {
    total: services.length,
    active: services.filter((s) => s.isActive).length,
    inactive: services.filter((s) => !s.isActive).length,
    categories: new Set(services.map((s) => s.category)).size,
  };

  const renderServiceModal = (isEdit: boolean) => (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Servisi Düzenle" : "Yeni Servis Oluştur"}
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Servis Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="ör: Halı Yıkama - Yün"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Kategori *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Açıklama</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Servis hakkında detaylı açıklama..."
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isActive: checked })
            }
          />
          <Label htmlFor="isActive">Servis aktif</Label>
        </div>

        {/* Pricing Options */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">
              Fiyatlandırma Seçenekleri
            </Label>
            <Button
              type="button"
              onClick={addPricingOption}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Fiyat Seçeneği Ekle
            </Button>
          </div>

          {formData.pricings.map((pricing, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Fiyatlandırma #{index + 1}</h4>
                  {formData.pricings.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removePricingOption(index)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Seçenek Adı</Label>
                    <Input
                      value={pricing.name}
                      onChange={(e) =>
                        updatePricingOption(index, { name: e.target.value })
                      }
                      placeholder="ör: Standart, Premium, Express"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fiyatlandırma Türü</Label>
                    <Select
                      value={pricing.pricingType}
                      onValueChange={(value) =>
                        updatePricingOption(index, {
                          pricingType: value as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICING_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label} ({type.unit})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Birim Fiyat (₺)</Label>
                    <Input
                      type="number"
                      value={pricing.basePrice}
                      onChange={(e) =>
                        updatePricingOption(index, {
                          basePrice: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Birim</Label>
                    <Input
                      value={pricing.unit}
                      onChange={(e) =>
                        updatePricingOption(index, { unit: e.target.value })
                      }
                      placeholder="adet, m², kg, saat"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Min Miktar</Label>
                    <Input
                      type="number"
                      value={pricing.minQuantity}
                      onChange={(e) =>
                        updatePricingOption(index, {
                          minQuantity: Number(e.target.value),
                        })
                      }
                      placeholder="1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Max Miktar (0 = sınırsız)</Label>
                    <Input
                      type="number"
                      value={pricing.maxQuantity}
                      onChange={(e) =>
                        updatePricingOption(index, {
                          maxQuantity: Number(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Açıklama</Label>
                  <Textarea
                    value={pricing.description}
                    onChange={(e) =>
                      updatePricingOption(index, {
                        description: e.target.value,
                      })
                    }
                    placeholder="Bu fiyatlandırma seçeneği hakkında açıklama..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={pricing.isActive}
                    onCheckedChange={(checked) =>
                      updatePricingOption(index, { isActive: checked })
                    }
                  />
                  <Label>Bu fiyatlandırma seçeneği aktif</Label>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            type="button"
            onClick={isEdit ? handleUpdateService : handleCreateService}
            disabled={!formData.name || !formData.category}
          >
            {isEdit ? "Güncelle" : "Oluştur"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isEdit) {
                setIsEditModalOpen(false);
                setCurrentService(null);
              } else {
                setIsCreateModalOpen(false);
              }
              resetForm();
            }}
          >
            İptal
          </Button>
        </div>
      </div>
    </DialogContent>
  );

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Hizmet Yönetimi</h1>
          <p className="text-muted-foreground">
            İşletmenizin hizmetlerini ve fiyatlandırmalarını yönetin
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Servis
            </Button>
          </DialogTrigger>
          {renderServiceModal(false)}
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Servis</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasif</CardTitle>
            <EyeOff className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">
              {stats.inactive}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kategori</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Servis ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Kategori filtrele" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hizmetler ({filteredServices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse">Yükleniyor...</div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || categoryFilter !== "all"
                ? "Filtreye uygun servis bulunamadı"
                : "Henüz servis bulunmuyor"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Servis</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Fiyat Seçenekleri</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => {
                  const category = CATEGORIES.find(
                    (c) => c.value === service.category
                  );
                  return (
                    <TableRow key={service.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.name}</div>
                          {service.description && (
                            <div className="text-sm text-muted-foreground">
                              {service.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {category?.icon} {category?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {service.pricings.slice(0, 2).map((pricing) => (
                            <div key={pricing.id} className="text-sm">
                              <span className="font-medium">
                                ₺{pricing.basePrice.toLocaleString("tr-TR")}
                              </span>
                              <span className="text-muted-foreground">
                                /{pricing.unit} ({pricing.name})
                              </span>
                            </div>
                          ))}
                          {service.pricings.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{service.pricings.length - 2} seçenek daha
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={service.isActive ? "default" : "secondary"}
                        >
                          {service.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Dialog
                            open={
                              isEditModalOpen &&
                              currentService?.id === service.id
                            }
                            onOpenChange={setIsEditModalOpen}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(service)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            {renderServiceModal(true)}
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
