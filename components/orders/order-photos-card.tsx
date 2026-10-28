"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, ImagePlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface OrderPhotoItem {
  id: string;
  url: string;
  filename: string;
  contentType: string;
  type: string;
  caption: string;
  timestamp: string;
  status: string;
}

const PHOTO_TYPE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  before: { label: "Teslim Alırken (Öncesi)", badgeClass: "bg-blue-600 text-white" },
  damage: { label: "Hasar / Leke Kaydı", badgeClass: "bg-amber-600 text-white" },
  after: { label: "Temizlik Sonrası", badgeClass: "bg-emerald-600 text-white" },
  other: { label: "Diğer", badgeClass: "bg-slate-600 text-white" },
};

async function compressImageFile(file: File): Promise<File> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(new File([blob], "order-photo.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.82
        );
      };
      img.onerror = () => resolve(file);
      img.src = reader.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

function AuthenticatedPhotoImage({
  url,
  alt,
}: {
  url: string;
  alt: string;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let currentObjectUrl: string | null = null;
    const token = localStorage.getItem("token");

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!active || !blob) return;
        currentObjectUrl = URL.createObjectURL(blob);
        setBlobUrl(currentObjectUrl);
      })
      .catch(() => {});

    return () => {
      active = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [url]);

  if (!blobUrl) {
    return (
      <div className="w-full h-44 bg-muted flex items-center justify-center text-xs text-muted-foreground">
        Yükleniyor...
      </div>
    );
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className="w-full h-44 object-cover"
      loading="lazy"
    />
  );
}

export function OrderPhotosCard({ orderId }: { orderId: string }) {
  const [photos, setPhotos] = useState<OrderPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState("before");
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/photos`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      loadPhotos();
    }
  }, [orderId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setUploading(true);
    try {
      const compressed = await compressImageFile(rawFile);
      const formData = new FormData();
      formData.append("photo", compressed);
      formData.append("type", photoType);
      formData.append("caption", caption.trim());

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/photos`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Fotoğraf yüklenemedi");
        return;
      }

      toast.success("Ürün fotoğrafı kaydedildi");
      setCaption("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      await loadPhotos();
    } catch {
      toast.error("Fotoğraf yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}/photos?photoId=${encodeURIComponent(photoId)}`,
        {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) {
        toast.error("Fotoğraf silinemedi");
        return;
      }
      toast.success("Fotoğraf silindi");
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch {
      toast.error("Fotoğraf silinirken hata oluştu");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Ürün / Halı Fotoğrafları ({photos.length})
        </CardTitle>
        <CardDescription>
          Teslim alırken mevcut leke/yırtık durumunu veya temizlik sonrası halini fotoğraflayın
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-xl border border-border bg-muted/30 p-3.5">
          <div className="sm:col-span-4 space-y-1.5">
            <Label className="text-xs">Fotoğraf Türü</Label>
            <Select value={photoType} onValueChange={setPhotoType}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Teslim Alırken (Öncesi)</SelectItem>
                <SelectItem value="damage">Hasar / Leke / Yırtık Kaydı</SelectItem>
                <SelectItem value="after">Temizlik Sonrası / Teslimat</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-5 space-y-1.5">
            <Label className="text-xs">Açıklama / Leke Notu (İsteğe Bağlı)</Label>
            <Input
              className="bg-card"
              placeholder="Örn: Kenarda saçak söküğü / kahve lekesi var"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              className="w-full gap-1.5"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  Fotoğraf Ekle
                </>
              )}
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Fotoğraflar yükleniyor...
          </p>
        ) : photos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <Camera className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-medium text-foreground">
              Henüz fotoğraf eklenmemiş
            </p>
            <p className="text-xs mt-1">
              Kameradan veya galeriden ürün fotoğrafı ekleyerek olası müşteri anlaşmazlıklarını önleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => {
              const typeMeta =
                PHOTO_TYPE_LABELS[photo.type] || PHOTO_TYPE_LABELS.other;
              return (
                <div
                  key={photo.id}
                  className="rounded-xl border border-border bg-card overflow-hidden shadow-sm flex flex-col"
                >
                  <div className="relative">
                    <AuthenticatedPhotoImage
                      url={photo.url}
                      alt={photo.caption || typeMeta.label}
                    />
                    <Badge
                      className={`absolute top-2 left-2 text-[11px] ${typeMeta.badgeClass}`}
                    >
                      {typeMeta.label}
                    </Badge>
                  </div>
                  <div className="p-3 flex items-start justify-between gap-2 flex-1">
                    <div className="min-w-0">
                      {photo.caption ? (
                        <p className="text-sm font-medium text-foreground break-words">
                          {photo.caption}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Not eklenmemiş
                        </p>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(photo.timestamp).toLocaleString("tr-TR")}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePhoto(photo.id)}
                      aria-label="Fotoğrafı sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
