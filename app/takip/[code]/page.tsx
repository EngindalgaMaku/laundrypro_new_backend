"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  Package,
  Phone,
  MessageSquare,
  Sparkles,
  Truck,
  XCircle,
  Search,
  Calendar,
  MapPin,
} from "lucide-react";
import {
  normalizePhoneForCall,
  normalizePhoneForWhatsApp,
} from "@/lib/communication";

interface TrackedOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  pickupDate?: string | null;
  deliveryDate?: string | null;
  totalAmount: number;
  business: {
    name: string;
    phone?: string | null;
    location?: string | null;
  };
  customer: {
    maskedName: string;
    region?: string | null;
  };
  items: Array<{
    name: string;
    quantity: number;
    totalPrice: number;
  }>;
  statusHistory: Array<{
    status: string;
    timestamp: string;
  }>;
}

const TRACKING_STEPS = [
  {
    key: "RECEIVED",
    label: "Sipariş Alındı",
    description: "Ürünleriniz kayıt altına alındı",
    icon: Package,
    statuses: ["PENDING", "CONFIRMED", "READY_FOR_PICKUP"],
  },
  {
    key: "IN_PROGRESS",
    label: "Yıkamada / İşlemde",
    description: "Temizlik ve bakım işlemi uygulanıyor",
    icon: Sparkles,
    statuses: ["IN_PROGRESS"],
  },
  {
    key: "READY",
    label: "Teslimata Hazır",
    description: "İşlem tamamlandı, sevkiyat bekliyor",
    icon: Clock,
    statuses: ["READY_FOR_DELIVERY"],
  },
  {
    key: "OUT_FOR_DELIVERY",
    label: "Dağıtımda (Yolda)",
    description: "Servis aracımız adresinize yönlendirildi",
    icon: Truck,
    statuses: ["OUT_FOR_DELIVERY"],
  },
  {
    key: "DELIVERED",
    label: "Teslim Edildi",
    description: "Siparişiniz başarıyla teslim edildi",
    icon: CheckCircle2,
    statuses: ["DELIVERED", "COMPLETED"],
  },
];

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Sipariş Alındı",
  CONFIRMED: "Sipariş Onaylandı",
  READY_FOR_PICKUP: "Alım İçin Planlandı",
  IN_PROGRESS: "Yıkamada / İşlemde",
  READY_FOR_DELIVERY: "Teslimata Hazır",
  OUT_FOR_DELIVERY: "Dağıtımda (Yolda)",
  DELIVERED: "Teslim Edildi",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
};

function getStepIndex(status: string): number {
  const idx = TRACKING_STEPS.findIndex((step) =>
    step.statuses.includes(status)
  );
  return idx === -1 ? 0 : idx;
}

export default function PublicOrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const code = decodeURIComponent((params.code as string) || "");

  const [data, setData] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState(code);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError(null);

    fetch(`/api/public/track/${encodeURIComponent(code)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Sipariş bulunamadı");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch(() => {
        setError(
          "Bu takip koduna ait sipariş bulunamadı. Fişinizdeki QR kodu okutun veya işletmenin gönderdiği bağlantıyı açın."
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) return;
    router.push(`/takip/${encodeURIComponent(searchCode.trim())}`);
  };

  const formatMoney = (val: number) =>
    `₺${val.toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (val?: string | null) =>
    val ? new Date(val).toLocaleDateString("tr-TR") : null;

  const activeStepIdx = data ? getStepIndex(data.status) : 0;
  const isCancelled = data?.status === "CANCELLED";

  return (
    <div className="min-h-screen bg-background py-6 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Top Search / Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-2xl shadow-sm border">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              CANLI SİPARİŞ TAKİP SİSTEMİ
            </p>
            <h1 className="text-lg font-bold text-foreground">
              {data?.business?.name || "Sipariş Durumu Sorgula"}
            </h1>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Takip kodu"
              className="h-9 text-xs sm:w-44"
            />
            <Button type="submit" size="sm" variant="outline" className="h-9 px-3">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {loading && (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center text-muted-foreground">
              Sipariş bilgileri yükleniyor...
            </CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card className="rounded-2xl border-destructive/30">
            <CardContent className="p-6 text-center space-y-3">
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-medium text-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {!loading && data && (
          <>
            {/* Status Progress Card */}
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-5 text-white">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-white/80">Sipariş Numarası</p>
                    <p className="text-xl font-bold font-mono">
                      {data.orderNumber}
                    </p>
                  </div>
                  <Badge className="bg-card text-blue-700 hover:bg-card font-semibold px-3 py-1 text-xs">
                    {STATUS_LABELS[data.status] || data.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/90">
                  <span>Müşteri: {data.customer.maskedName}</span>
                  {data.customer.region && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {data.customer.region}
                    </span>
                  )}
                </div>
              </div>

              <CardContent className="p-5">
                {isCancelled ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200">
                    <XCircle className="h-6 w-6 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">
                        Bu sipariş iptal edilmiştir.
                      </p>
                      <p className="text-xs">
                        Detaylı bilgi için işletme ile iletişime geçebilirsiniz.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {TRACKING_STEPS.map((step, idx) => {
                      const Icon = step.icon;
                      const isCompleted = idx < activeStepIdx;
                      const isCurrent = idx === activeStepIdx;

                      return (
                        <div key={step.key} className="flex items-start gap-3.5">
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                                isCurrent
                                  ? "bg-blue-600 border-blue-600 text-white shadow-card shadow-blue-500/30 scale-105"
                                  : isCompleted
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "bg-muted border-border text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            {idx < TRACKING_STEPS.length - 1 && (
                              <div
                                className={`w-0.5 h-6 my-1 ${
                                  isCompleted ? "bg-emerald-500" : "bg-slate-200"
                                }`}
                              />
                            )}
                          </div>
                          <div className="pt-1">
                            <p
                              className={`text-sm font-semibold ${
                                isCurrent
                                  ? "text-blue-700"
                                  : isCompleted
                                  ? "text-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Dates Summary */}
                <div className="mt-5 pt-4 border-t grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-[11px] text-muted-foreground">
                        Kayıt Tarihi
                      </p>
                      <p className="font-medium text-foreground">
                        {formatDate(data.createdAt)}
                      </p>
                    </div>
                  </div>
                  {data.deliveryDate && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-[11px] text-muted-foreground">
                          Tahmini Teslim
                        </p>
                        <p className="font-medium text-foreground">
                          {formatDate(data.deliveryDate)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Items & Total */}
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Sipariş İçeriği ({data.items.length} Kalem)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                {data.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1.5 border-b last:border-b-0"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Miktar: {item.quantity}
                      </p>
                    </div>
                    <span className="font-medium text-foreground">
                      {formatMoney(item.totalPrice)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t font-bold text-base">
                  <span>Toplam Tutar</span>
                  <span className="text-blue-600">
                    {formatMoney(data.totalAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Business Contact Card */}
            {data.business.phone && (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-center sm:text-left">
                    <p className="font-semibold text-sm text-foreground">
                      {data.business.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sorularınız için işletmeyle doğrudan iletişime geçebilirsiniz
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 sm:flex-initial gap-1.5"
                      onClick={() => {
                        const tel = normalizePhoneForCall(data.business.phone!);
                        if (tel) window.location.href = `tel:${tel}`;
                      }}
                    >
                      <Phone className="h-4 w-4 text-blue-600" />
                      Ara
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-initial gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        const wa = normalizePhoneForWhatsApp(
                          data.business.phone!
                        );
                        if (!wa) return;
                        const msg = encodeURIComponent(
                          `Merhaba, ${data.orderNumber} numaralı siparişim hakkında bilgi almak istiyorum.`
                        );
                        window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
                      }}
                    >
                      <MessageSquare className="h-4 w-4" />
                      WhatsApp
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2">
          LaundryPro Akıllı İşletme Altyapısı ile Güçlendirilmiştir
        </p>
      </div>
    </div>
  );
}
