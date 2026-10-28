"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, QrCode, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QRBarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function extractOrderIdentifier(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const ordersIdx = parts.findIndex(
        (p) => p === "orders" || p === "takip"
      );
      if (ordersIdx !== -1 && parts[ordersIdx + 1]) {
        return decodeURIComponent(parts[ordersIdx + 1]);
      }
      return parts[parts.length - 1] || trimmed;
    }
  } catch {
    // Not a URL, fall through
  }

  return trimmed;
}

/**
 * Decodes a QR code (via pure-JS jsQR, works on HTTP and HTTPS) or 1D/2D barcode
 * (via BarcodeDetector when in HTTPS SecureContext) from an HTMLImageElement or HTMLVideoElement.
 */
async function decodeFromVisualSource(
  source: HTMLImageElement | HTMLVideoElement,
  sourceWidth: number,
  sourceHeight: number
): Promise<string | null> {
  if (!sourceWidth || !sourceHeight) return null;

  // 1. Try native BarcodeDetector first if available (HTTPS / localhost)
  const BarcodeDetectorCtor = (window as any).BarcodeDetector;
  if (BarcodeDetectorCtor) {
    try {
      const detector = new BarcodeDetectorCtor({
        formats: ["qr_code", "code_128", "code_39", "ean_13"],
      });
      const results = await detector.detect(source);
      if (results && results.length > 0 && results[0].rawValue) {
        return results[0].rawValue;
      }
    } catch {
      // Fall through to pure-JS jsQR canvas decoder
    }
  }

  // 2. Pure-JS jsQR decoding on Canvas (works everywhere, including plain HTTP Wi-Fi IPs)
  const maxDimensions = [1000, 640, 1400];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  for (const maxDim of maxDimensions) {
    const scale = Math.min(1, maxDim / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.floor(sourceWidth * scale));
    const height = Math.max(1, Math.floor(sourceHeight * scale));

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(source, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const qrResult = jsQR(imageData.data, width, height, {
      inversionAttempts: "attemptBoth",
    });

    if (qrResult && qrResult.data) {
      return qrResult.data;
    }
  }

  return null;
}

export function QRBarcodeScannerDialog({
  open,
  onOpenChange,
}: QRBarcodeScannerDialogProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isHttpFallback, setIsHttpFallback] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const resolveAndNavigate = async (rawCode: string) => {
    const code = extractOrderIdentifier(rawCode);
    if (!code || isSearching) return;

    setIsSearching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/orders/${encodeURIComponent(code)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const order = await res.json();
        stopCamera();
        onOpenChange(false);
        toast.success(`Sipariş bulundu: ${order.orderNumber || code}`);
        router.push(`/orders/${order.id}`);
        return;
      }

      toast.error(`"${code}" kodlu sipariş bulunamadı.`);
    } catch {
      toast.error("Sipariş sorgulanırken hata oluştu.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePhotoCapture = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsSearching(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      const loaded = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = objectUrl;
      });

      if (!loaded) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Fotoğraf yüklenemedi.");
        return;
      }

      const decoded = await decodeFromVisualSource(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height
      );
      URL.revokeObjectURL(objectUrl);

      if (decoded) {
        setIsSearching(false);
        await resolveAndNavigate(decoded);
        return;
      }

      toast.error(
        "Fotoğrafta QR kod okunamadı. Lütfen fişteki QR koda daha yakın ve dik açıyla çekin."
      );
    } catch (err) {
      console.error("Photo QR decode error:", err);
      toast.error("Görsel okunurken bir hata oluştu.");
    } finally {
      setIsSearching(false);
    }
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsHttpFallback(false);

    // Android/Chrome disables navigator.mediaDevices on plain http://192.168.x.x (non-HTTPS)
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setIsHttpFallback(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      scanTimerRef.current = setInterval(async () => {
        if (
          !videoRef.current ||
          videoRef.current.readyState < 2 ||
          isSearching
        ) {
          return;
        }
        try {
          const v = videoRef.current;
          const decoded = await decodeFromVisualSource(
            v,
            v.videoWidth || 640,
            v.videoHeight || 480
          );
          if (decoded) {
            stopCamera();
            await resolveAndNavigate(decoded);
          }
        } catch {
          // Ignore transient frame detection errors
        }
      }, 250);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsHttpFallback(true);
      setCameraError(
        "Canlı kamera yerine fotoğraf çekerek QR kodu okutabilirsiniz."
      );
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (open) {
      setManualCode("");
      setCameraError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await resolveAndNavigate(manualCode);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR / Barkod ile Hızlı Sipariş Bul
          </DialogTitle>
          <DialogDescription>
            Halı etiketini veya müşteri fişini kamerayla okutun ya da fiş numarasını girin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hidden native camera input (works even on plain HTTP local Wi-Fi IPs!) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />

          {/* Camera Viewport */}
          <div className="relative overflow-hidden rounded-lg border bg-slate-950 aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${
                isCameraActive ? "block" : "hidden"
              }`}
            />

            {isCameraActive && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-36 border-2 border-primary/90 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] relative">
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-red-500/80 animate-pulse" />
                </div>
              </div>
            )}

            {!isCameraActive && (
              <div className="p-5 text-center text-white/90 space-y-3 text-xs">
                <QrCode className="h-10 w-10 mx-auto text-blue-400" />
                <p className="text-white/80 max-w-xs mx-auto">
                  {isHttpFallback
                    ? "Yerel Wi-Fi (HTTP) bağlantısında telefon kamerasını açıp QR kodun fotoğrafını çekerek anında okutabilirsiniz:"
                    : cameraError ||
                      "Kamerayı başlatarak QR kodu okutabilirsiniz."}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSearching}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    Telefon Kamerasıyla Çek & Okut
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* USB Scanner / Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <Label htmlFor="barcode-input">
              Barkod Okuyucu / Fiş Numarası (Örn: ORD-...)
            </Label>
            <div className="flex gap-2">
              <Input
                id="barcode-input"
                placeholder="Barkodu okutun veya sipariş no yazın..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <Button
                type="submit"
                disabled={isSearching || !manualCode.trim()}
                className="gap-1.5 shrink-0"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Aç
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
