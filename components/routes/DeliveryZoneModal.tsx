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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface DeliveryZone {
  id?: string;
  name: string;
  city: string;
  district: string;
  coordinates?: string;
  isActive: boolean;
  serviceType: "PICKUP" | "DELIVERY" | "BOTH";
  notes?: string;
}

interface DeliveryZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: DeliveryZone;
  onSuccess: () => void;
}

const turkishCities = [
  "Adana",
  "Ankara",
  "Antalya",
  "Bursa",
  "Denizli",
  "Diyarbakır",
  "Erzurum",
  "Eskişehir",
  "Gaziantep",
  "İstanbul",
  "İzmir",
  "Kayseri",
  "Konya",
  "Malatya",
  "Mersin",
  "Muğla",
  "Samsun",
  "Trabzon",
  "Van",
  "Kocaeli",
  "Adıyaman",
  "Afyonkarahisar",
  "Ağrı",
  "Amasya",
  "Artvin",
  "Aydın",
  "Balıkesir",
  "Bilecik",
  "Bingöl",
  "Bitlis",
  "Bolu",
  "Burdur",
  "Çanakkale",
  "Çankırı",
  "Çorum",
  "Edirne",
  "Elazığ",
  "Erzincan",
  "Giresun",
  "Gümüşhane",
  "Hakkâri",
  "Hatay",
  "Isparta",
  "Kars",
  "Kastamonu",
  "Kırklareli",
  "Kırşehir",
  "Kütahya",
  "Manisa",
  "Mardin",
  "Nevşehir",
  "Niğde",
  "Ordu",
  "Rize",
  "Sakarya",
  "Siirt",
  "Sinop",
  "Sivas",
  "Tekirdağ",
  "Tokat",
  "Uşak",
  "Yozgat",
  "Zonguldak",
  "Aksaray",
  "Bayburt",
  "Karaman",
  "Kırıkkale",
  "Batman",
  "Şırnak",
  "Bartın",
  "Ardahan",
  "Iğdır",
  "Yalova",
  "Karabük",
  "Kilis",
  "Osmaniye",
  "Düzce",
];

export default function DeliveryZoneModal({
  open,
  onOpenChange,
  zone,
  onSuccess,
}: DeliveryZoneModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState<DeliveryZone>({
    name: "",
    city: "İstanbul",
    district: "",
    coordinates: "",
    isActive: true,
    serviceType: "BOTH",
    notes: "",
  });

  useEffect(() => {
    if (zone) {
      setFormData(zone);
    } else {
      setFormData({
        name: "",
        city: "İstanbul",
        district: "",
        coordinates: "",
        isActive: true,
        serviceType: "BOTH",
        notes: "",
      });
    }
  }, [zone, open]);

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

      const url = zone
        ? `/api/delivery-zones/${zone.id}`
        : "/api/delivery-zones";
      const method = zone ? "PUT" : "POST";

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
        throw new Error(error.error || "Teslimat bölgesi kaydedilemedi");
      }

      toast({
        title: "Başarılı",
        description: zone
          ? "Teslimat bölgesi güncellendi"
          : "Yeni teslimat bölgesi eklendi",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Delivery zone save error:", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof DeliveryZone, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {zone ? "Teslimat Bölgesini Düzenle" : "Yeni Teslimat Bölgesi Ekle"}
          </DialogTitle>
          <DialogDescription>
            Teslimat bölgesi bilgilerini girin ve kaydedin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Bölge Adı *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Örn: Merkez Bölge, Avrupa Yakası"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">İl *</Label>
              <Select
                value={formData.city}
                onValueChange={(value) => handleInputChange("city", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {turkishCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">İlçe *</Label>
              <Input
                id="district"
                value={formData.district}
                onChange={(e) => handleInputChange("district", e.target.value)}
                placeholder="Kadıköy, Üsküdar, vb."
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Hizmet Türü</Label>
            <Select
              value={formData.serviceType}
              onValueChange={(value) => handleInputChange("serviceType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PICKUP">Sadece Toplama</SelectItem>
                <SelectItem value="DELIVERY">Sadece Teslimat</SelectItem>
                <SelectItem value="BOTH">Toplama ve Teslimat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="coordinates">Koordinat Bilgileri</Label>
            <Input
              id="coordinates"
              value={formData.coordinates}
              onChange={(e) => handleInputChange("coordinates", e.target.value)}
              placeholder="41.0082,28.9784 (opsiyonel)"
            />
            <p className="text-xs text-muted-foreground">
              Enlem,Boylam formatında koordinatları girebilirsiniz
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) =>
                handleInputChange("isActive", checked)
              }
            />
            <Label htmlFor="isActive">Aktif bölge</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Bölge hakkında ek bilgiler..."
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
              {zone ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
