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
import { Loader2, Plus, X } from "lucide-react";

interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  status: string;
}

interface Route {
  id?: string;
  routeName: string;
  description?: string;
  vehicleId: string;
  plannedDate: string;
  startTime: string;
  status: "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  stops: RouteStop[];
}

interface RouteStop {
  id?: string;
  address: string;
  customerName: string;
  customerPhone?: string;
  stopOrder: number;
  estimatedArrival?: string;
  notes?: string;
}

interface RouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route?: Route;
  onSuccess: () => void;
}

export default function RouteModal({
  open,
  onOpenChange,
  route,
  onSuccess,
}: RouteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState<Route>({
    routeName: "",
    description: "",
    vehicleId: "",
    plannedDate: new Date().toISOString().split("T")[0],
    startTime: "08:00",
    status: "PLANNED",
    stops: [
      {
        address: "",
        customerName: "",
        customerPhone: "",
        stopOrder: 1,
        estimatedArrival: "",
        notes: "",
      },
    ],
  });

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  useEffect(() => {
    if (route) {
      setFormData({
        ...route,
        stops:
          route.stops.length > 0
            ? route.stops
            : [
                {
                  address: "",
                  customerName: "",
                  customerPhone: "",
                  stopOrder: 1,
                  estimatedArrival: "",
                  notes: "",
                },
              ],
      });
    } else {
      setFormData({
        routeName: "",
        description: "",
        vehicleId: "",
        plannedDate: new Date().toISOString().split("T")[0],
        startTime: "08:00",
        status: "PLANNED",
        stops: [
          {
            address: "",
            customerName: "",
            customerPhone: "",
            stopOrder: 1,
            estimatedArrival: "",
            notes: "",
          },
        ],
      });
    }
  }, [route, open]);

  const fetchVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/vehicles?status=AVAILABLE&limit=50", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error("Vehicles fetch error:", error);
    } finally {
      setLoadingVehicles(false);
    }
  };

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

      // Validate at least one stop
      if (formData.stops.length === 0 || !formData.stops[0].address) {
        toast({
          title: "Hata",
          description: "En az bir durak eklemelisiniz",
          variant: "destructive",
        });
        return;
      }

      const url = route ? `/api/routes/${route.id}` : "/api/routes";
      const method = route ? "PUT" : "POST";

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
        throw new Error(error.error || "Rota kaydedilemedi");
      }

      toast({
        title: "Başarılı",
        description: route ? "Rota güncellendi" : "Yeni rota oluşturuldu",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Route save error:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof Route, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStopChange = (
    index: number,
    field: keyof RouteStop,
    value: any
  ) => {
    const newStops = [...formData.stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setFormData((prev) => ({ ...prev, stops: newStops }));
  };

  const addStop = () => {
    const newStop: RouteStop = {
      address: "",
      customerName: "",
      customerPhone: "",
      stopOrder: formData.stops.length + 1,
      estimatedArrival: "",
      notes: "",
    };
    setFormData((prev) => ({ ...prev, stops: [...prev.stops, newStop] }));
  };

  const removeStop = (index: number) => {
    if (formData.stops.length > 1) {
      const newStops = formData.stops.filter((_, i) => i !== index);
      // Reorder stops
      const reorderedStops = newStops.map((stop, i) => ({
        ...stop,
        stopOrder: i + 1,
      }));
      setFormData((prev) => ({ ...prev, stops: reorderedStops }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {route ? "Rotayı Düzenle" : "Yeni Rota Oluştur"}
          </DialogTitle>
          <DialogDescription>
            Rota bilgilerini ve duraklarını girin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="routeName">Rota Adı *</Label>
              <Input
                id="routeName"
                value={formData.routeName}
                onChange={(e) => handleInputChange("routeName", e.target.value)}
                placeholder="Örn: Merkez Bölge Teslimatı"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                placeholder="Rota hakkında ek bilgiler..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleId">Araç *</Label>
                <Select
                  value={formData.vehicleId}
                  onValueChange={(value) =>
                    handleInputChange("vehicleId", value)
                  }
                  disabled={loadingVehicles}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingVehicles ? "Yükleniyor..." : "Araç seçin"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plateNumber} - {vehicle.brand} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plannedDate">Planlanan Tarih *</Label>
                <Input
                  id="plannedDate"
                  type="date"
                  value={formData.plannedDate}
                  onChange={(e) =>
                    handleInputChange("plannedDate", e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Başlangıç Saati *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    handleInputChange("startTime", e.target.value)
                  }
                  required
                />
              </div>
            </div>
          </div>

          {/* Stops */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Duraklar</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStop}
              >
                <Plus className="w-4 h-4 mr-1" />
                Durak Ekle
              </Button>
            </div>

            {formData.stops.map((stop, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Durak {index + 1}</h4>
                  {formData.stops.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStop(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`address-${index}`}>Adres *</Label>
                    <Textarea
                      id={`address-${index}`}
                      value={stop.address}
                      onChange={(e) =>
                        handleStopChange(index, "address", e.target.value)
                      }
                      placeholder="Tam adres bilgisi..."
                      rows={2}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`customerName-${index}`}>
                      Müşteri Adı *
                    </Label>
                    <Input
                      id={`customerName-${index}`}
                      value={stop.customerName}
                      onChange={(e) =>
                        handleStopChange(index, "customerName", e.target.value)
                      }
                      placeholder="Müşteri adı soyadı"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`customerPhone-${index}`}>Telefon</Label>
                    <Input
                      id={`customerPhone-${index}`}
                      value={stop.customerPhone}
                      onChange={(e) =>
                        handleStopChange(index, "customerPhone", e.target.value)
                      }
                      placeholder="0555 123 45 67"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`estimatedArrival-${index}`}>
                      Tahmini Varış
                    </Label>
                    <Input
                      id={`estimatedArrival-${index}`}
                      type="time"
                      value={stop.estimatedArrival}
                      onChange={(e) =>
                        handleStopChange(
                          index,
                          "estimatedArrival",
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`notes-${index}`}>Notlar</Label>
                  <Input
                    id={`notes-${index}`}
                    value={stop.notes}
                    onChange={(e) =>
                      handleStopChange(index, "notes", e.target.value)
                    }
                    placeholder="Durak hakkında notlar..."
                  />
                </div>
              </div>
            ))}
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
              {route ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
