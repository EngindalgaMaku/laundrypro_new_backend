"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Vehicle {
  id?: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: "AVAILABLE" | "IN_USE" | "MAINTENANCE";
  maxWeightKg: number;
  maxItemCount: number;
  notes?: string;
}

interface VehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle?: Vehicle;
  onSuccess: () => void;
}

export default function VehicleModal({
  open,
  onOpenChange,
  vehicle,
  onSuccess,
}: VehicleModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Vehicle>({
    plateNumber: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    status: "AVAILABLE",
    maxWeightKg: 1000,
    maxItemCount: 50,
    notes: "",
  });

  useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
    } else {
      setFormData({
        plateNumber: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        color: "",
        status: "AVAILABLE",
        maxWeightKg: 1000,
        maxItemCount: 50,
        notes: "",
      });
    }
  }, [vehicle, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast({
          title: "Hata",
          description: "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.",
          variant: "destructive",
        });
        return;
      }

      const url = vehicle ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";
      const method = vehicle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Araç kaydedilemedi");
      }

      toast({
        title: "Başarılı",
        description: vehicle ? "Araç güncellendi" : "Yeni araç eklendi",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Vehicle save error:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Vehicle, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {vehicle ? "Aracı Düzenle" : "Yeni Araç Ekle"}
          </DialogTitle>
          <DialogDescription>
            Araç bilgilerini girin ve kaydedin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plateNumber">Plaka Numarası *</Label>
              <Input
                id="plateNumber"
                value={formData.plateNumber}
                onChange={(e) =>
                  handleInputChange("plateNumber", e.target.value.toUpperCase())
                }
                placeholder="34 ABC 123"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Müsait</SelectItem>
                  <SelectItem value="IN_USE">Kullanımda</SelectItem>
                  <SelectItem value="MAINTENANCE">Bakımda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Marka *</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => handleInputChange("brand", e.target.value)}
                placeholder="Ford, Mercedes, vb."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange("model", e.target.value)}
                placeholder="Transit, Sprinter, vb."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Model Yılı</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) =>
                  handleInputChange("year", parseInt(e.target.value))
                }
                min="1980"
                max={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Renk</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                placeholder="Beyaz, Mavi, vb."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxWeightKg">Max Ağırlık (kg) *</Label>
              <Input
                id="maxWeightKg"
                type="number"
                value={formData.maxWeightKg}
                onChange={(e) =>
                  handleInputChange("maxWeightKg", parseInt(e.target.value))
                }
                min="0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxItemCount">Max Parça Sayısı *</Label>
              <Input
                id="maxItemCount"
                type="number"
                value={formData.maxItemCount}
                onChange={(e) =>
                  handleInputChange("maxItemCount", parseInt(e.target.value))
                }
                min="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Araç hakkında ek bilgiler..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {vehicle ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
