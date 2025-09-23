"use client";

import type React from "react";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  turkishCities,
  getDistrictsByCity,
  getCityById,
} from "@/lib/turkish-locations";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  totalOrders: number;
  totalSpent: string;
  lastOrder: string;
  status: "active" | "inactive";
  notes?: string;
  registrationDate?: string;
}

interface CustomerEditFormProps {
  customer: Customer;
  onSave: (updatedCustomer: Customer) => void;
  onCancel: () => void;
}

export function CustomerEditForm({
  customer,
  onSave,
  onCancel,
}: CustomerEditFormProps) {
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    city: customer.city || "",
    district: customer.district || "",
    latitude: customer.latitude || null,
    longitude: customer.longitude || null,
    status: customer.status,
    notes: customer.notes || "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate city if provided
    if (!formData.city) {
      toast.error("Müşteri ili seçilmelidir");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const updatedCustomer: Customer = {
        ...customer,
        ...formData,
        latitude: formData.latitude || undefined,
        longitude: formData.longitude || undefined,
      };
      onSave(updatedCustomer);
      setIsLoading(false);
      toast.success("Müşteri bilgileri güncellendi!");
    }, 1000);
  };

  const handleAddressSave = (data: {
    coordinates: { latitude: number; longitude: number };
    fullAddress: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      address: data.fullAddress,
      latitude: data.coordinates.latitude,
      longitude: data.coordinates.longitude,
    }));
    setAddressModalOpen(false);
    toast.success("Konum bilgileri güncellendi!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Müşteri Bilgilerini Düzenle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Ad Soyad *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-posta</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Durum</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "active" | "inactive") =>
                  setFormData((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* City & District Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-city">İl *</Label>
              <Select
                value={formData.city}
                onValueChange={(value) =>
                  setFormData((prev) => ({
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
              <Label htmlFor="edit-district">İlçe</Label>
              <Select
                value={formData.district}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    district: value,
                  }))
                }
                disabled={!formData.city}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      formData.city ? "İlçe seçin..." : "Önce il seçin"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {formData.city &&
                    getDistrictsByCity(formData.city).map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address with Map Integration */}
          <div className="space-y-2">
            <Label htmlFor="edit-address">Detay Adres</Label>
            <div className="space-y-2">
              <Textarea
                id="edit-address"
                placeholder="Mahalle, sokak, bina no, daire no..."
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                rows={3}
              />
              {/* GPS Coordinates Input */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="space-y-1">
                  <Label htmlFor="latitude" className="text-xs">Enlem (Latitude)</Label>
                  <Input
                    id="latitude"
                    placeholder="36.8490"
                    value={formData.latitude || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow numbers, dots, and minus sign
                      if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
                        setFormData((prev) => ({
                          ...prev,
                          latitude: value ? parseFloat(value) : null,
                        }));
                      }
                    }}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="longitude" className="text-xs">Boylam (Longitude)</Label>
                  <Input
                    id="longitude"
                    placeholder="30.6296"
                    value={formData.longitude || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow numbers, dots, and minus sign
                      if (value === "" || /^-?\d*\.?\d*$/.test(value)) {
                        setFormData((prev) => ({
                          ...prev,
                          longitude: value ? parseFloat(value) : null,
                        }));
                      }
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
              
              {formData.latitude && formData.longitude && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded border border-green-200">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800">
                    GPS Koordinatları: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                  </span>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground mt-1">
                💡 Google Maps'ten koordinatları kopyalayabilirsiniz: Haritada sağ tık → koordinatları kopyala
              </div>
            </div>
            {formData.city && formData.district && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Navigation className="h-3 w-3" />
                {getCityById(formData.city)?.name} /{" "}
                {
                  getDistrictsByCity(formData.city).find(
                    (d) => d.id === formData.district
                  )?.name
                }
                {formData.latitude && formData.longitude && (
                  <span className="ml-2 font-mono">
                    ({formData.latitude.toFixed(4)},{" "}
                    {formData.longitude.toFixed(4)})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notlar</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              placeholder="Müşteri hakkında özel notlar..."
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
            </Button>
          </div>
        </form>

      </CardContent>
    </Card>
  );
}
