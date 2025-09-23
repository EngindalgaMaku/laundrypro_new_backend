"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  business: {
    name: string;
    businessType: string;
  };
}

interface ServicePricing {
  id: string;
  name: string;
  description?: string;
  pricingType: string;
  basePrice: number;
  minQuantity?: number;
  maxQuantity?: number;
  unit?: string;
  isActive: boolean;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  category: string;
  isActive: boolean;
  pricings: ServicePricing[];
  createdAt: string;
  updatedAt: string;
}

const serviceCategories = [
  { value: "LAUNDRY", label: "Çamaşır Yıkama" },
  { value: "DRY_CLEANING", label: "Kuru Temizleme" },
  { value: "CARPET_CLEANING", label: "Halı Yıkama" },
  { value: "UPHOLSTERY_CLEANING", label: "Döşeme Temizlik" },
  { value: "CURTAIN_CLEANING", label: "Perde Temizlik" },
  { value: "IRONING", label: "Ütüleme" },
  { value: "STAIN_REMOVAL", label: "Leke Çıkarma" },
  { value: "OTHER", label: "Diğer" },
];

const pricingTypes = [
  { value: "FIXED", label: "Sabit Fiyat" },
  { value: "PER_ITEM", label: "Parça Başına" },
  { value: "PER_KG", label: "Kilo Başına" },
  { value: "PER_M2", label: "Metrekare Başına" },
  { value: "HOURLY", label: "Saatlik" },
];

export default function ServicesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    category: "",
    pricings: [
      {
        name: "Standart",
        description: "",
        pricingType: "FIXED",
        basePrice: 0,
        minQuantity: 1,
        maxQuantity: null,
        unit: "adet",
      }
    ]
  });
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      router.push("/");
      return;
    }
    setUser(JSON.parse(userData));
    fetchServices();
  }, [router]);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/services", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const servicesData = await response.json();
        setServices(servicesData);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddService = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch("/api/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newService),
      });

      if (response.ok) {
        toast.success("Hizmet başarıyla eklendi!");
        setNewService({
          name: "",
          description: "",
          category: "",
          pricings: [
            {
              name: "Standart",
              description: "",
              pricingType: "FIXED",
              basePrice: 0,
              minQuantity: 1,
              maxQuantity: null,
              unit: "adet",
            }
          ]
        });
        setIsAddServiceOpen(false);
        fetchServices();
      } else {
        const error = await response.json();
        toast.error(error.error || "Hizmet eklenemedi");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    }
  };

  const addPricing = () => {
    setNewService(prev => ({
      ...prev,
      pricings: [
        ...prev.pricings,
        {
          name: "",
          description: "",
          pricingType: "FIXED",
          basePrice: 0,
          minQuantity: 1,
          maxQuantity: null,
          unit: "adet",
        }
      ]
    }));
  };

  const removePricing = (index: number) => {
    if (newService.pricings.length > 1) {
      setNewService(prev => ({
        ...prev,
        pricings: prev.pricings.filter((_, i) => i !== index)
      }));
    }
  };

  const updatePricing = (index: number, field: string, value: any) => {
    setNewService(prev => ({
      ...prev,
      pricings: prev.pricings.map((pricing, i) => 
        i === index ? { ...pricing, [field]: value } : pricing
      )
    }));
  };

  if (!user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
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
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Hizmet Yönetimi
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Hizmetlerinizi ve fiyatlarınızı yönetin
                </p>
              </div>
              <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Hizmet Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Yeni Hizmet Ekle</DialogTitle>
                    <DialogDescription className="text-sm">
                      Yeni bir hizmet ve fiyatlandırma seçenekleri ekleyin
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 sm:space-y-6">
                    {/* Service Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="serviceName">Hizmet Adı *</Label>
                        <Input
                          id="serviceName"
                          value={newService.name}
                          onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Salon Halısı Yıkama"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="serviceCategory">Kategori *</Label>
                        <Select
                          value={newService.category}
                          onValueChange={(value) => setNewService(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Kategori seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {serviceCategories.map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serviceDescription">Açıklama</Label>
                      <Textarea
                        id="serviceDescription"
                        value={newService.description}
                        onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Hizmet açıklaması..."
                      />
                    </div>

                    {/* Pricing Options */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Fiyatlandırma Seçenekleri</h3>
                        <Button type="button" variant="outline" size="sm" onClick={addPricing}>
                          <Plus className="h-4 w-4 mr-2" />
                          Fiyat Ekle
                        </Button>
                      </div>
                      
                      {newService.pricings.map((pricing, index) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">Fiyat Seçeneği {index + 1}</CardTitle>
                              {newService.pricings.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePricing(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Fiyat Adı</Label>
                                <Input
                                  value={pricing.name}
                                  onChange={(e) => updatePricing(index, 'name', e.target.value)}
                                  placeholder="Küçük Boy, Orta Boy..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Fiyatlandırma Tipi</Label>
                                <Select
                                  value={pricing.pricingType}
                                  onValueChange={(value) => updatePricing(index, 'pricingType', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {pricingTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>Fiyat (₺)</Label>
                                <Input
                                  type="number"
                                  value={pricing.basePrice}
                                  onChange={(e) => updatePricing(index, 'basePrice', parseFloat(e.target.value) || 0)}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Birim</Label>
                                <Input
                                  value={pricing.unit || ""}
                                  onChange={(e) => updatePricing(index, 'unit', e.target.value)}
                                  placeholder="adet, kg, m2..."
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Min. Miktar</Label>
                                <Input
                                  type="number"
                                  value={pricing.minQuantity || ""}
                                  onChange={(e) => updatePricing(index, 'minQuantity', parseInt(e.target.value) || 1)}
                                  placeholder="1"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Açıklama</Label>
                              <Textarea
                                value={pricing.description}
                                onChange={(e) => updatePricing(index, 'description', e.target.value)}
                                placeholder="Fiyat açıklaması..."
                                rows={2}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddServiceOpen(false)}>
                      İptal
                    </Button>
                    <Button 
                      onClick={handleAddService}
                      disabled={!newService.name || !newService.category}
                    >
                      Hizmet Ekle
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {services.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {serviceCategories.find(cat => cat.value === service.category)?.label}
                        </CardDescription>
                      </div>
                      <Badge variant={service.isActive ? "default" : "secondary"}>
                        {service.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {service.description && (
                      <p className="text-sm text-muted-foreground">
                        {service.description}
                      </p>
                    )}
                    
                    {/* Pricing Options */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Fiyat Seçenekleri ({service.pricings.length})
                      </h4>
                      <div className="space-y-2">
                        {service.pricings.slice(0, 3).map((pricing) => (
                          <div key={pricing.id} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {pricing.name}
                              {pricing.unit && ` (${pricing.unit})`}
                            </span>
                            <span className="font-medium">₺{pricing.basePrice}</span>
                          </div>
                        ))}
                        {service.pricings.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{service.pricings.length - 3} daha fazla seçenek
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Düzenle
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {services.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
                  <DollarSign className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Henüz hizmet eklenmemiş</h3>
                <p className="text-muted-foreground mb-4">
                  İlk hizmetinizi ekleyerek başlayın
                </p>
                <Button onClick={() => setIsAddServiceOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Hizmeti Ekle
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
