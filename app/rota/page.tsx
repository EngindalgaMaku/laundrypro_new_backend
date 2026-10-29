"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { makePhoneCall, openGoogleMapsDirections } from "@/lib/communication";
import { TONE_CLASSES, statusPath } from "@/lib/order-status";
import { distanceKm, googleMapsRouteUrls, orderStops, routeLengthKm, type Point } from "@/lib/route-order";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Route as RouteIcon,
} from "lucide-react";

type Kind = "pickup" | "delivery";
type Filter = Kind | "all";

interface Stop {
  id: string;
  kind: Kind;
  customerId: string;
  name: string;
  phone: string;
  address: string;
  /** The order has its own address, not the customer's saved one */
  customAddress: boolean;
  district?: string | null;
  city?: string | null;
  latitude: number | null;
  longitude: number | null;
  /** The location is only the neighbourhood or district centre */
  approximate?: boolean;
  urgent: boolean;
  remaining: number;
  orders: Array<{ id: string; orderNumber: string; status: string }>;
}

interface Start extends Point {
  label: string;
  approximate: boolean;
}

const KIND = {
  pickup: { label: "Alınacak", done: "Alındı", target: "IN_PROGRESS", tone: "warning" as const },
  delivery: { label: "Dağıtılacak", done: "Teslim edildi", target: "DELIVERED", tone: "success" as const },
};

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "pickup", label: "Alınacaklar" },
  { value: "delivery", label: "Dağıtılacaklar" },
  { value: "all", label: "Hepsi" },
];

const located = (s: Stop): s is Stop & Point => s.latitude != null && s.longitude != null;
const km = (value: number) => `${value.toLocaleString("tr-TR", { maximumFractionDigits: value < 10 ? 1 : 0 })} km`;
const money = (value: number) => `₺${value.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
}

function RoutePlanner() {
  const [filter, setFilter] = useState<Filter>("all");
  const [stops, setStops] = useState<Stop[]>([]);
  const [start, setStart] = useState<Start | null>(null);
  const [returnToBase, setReturnToBase] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busyStop, setBusyStop] = useState<string | null>(null);
  // Manual order per filter; reset by "Yeniden sırala"
  const [order, setOrder] = useState<string[]>([]);
  // Stops whose lookup has finished (found or not); until then a stop shows "Konum aranıyor"
  const [lookedUp, setLookedUp] = useState<Set<string>>(new Set());
  const queued = useRef(new Set<string>());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/route-plan?type=all", { headers: authHeaders() });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      setStops(data.stops);
      setStart(data.start);
      queued.current = new Set();
      setLookedUp(new Set());
      setOrder([]);
    } catch {
      toast.error("Rota yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Find coordinates for stops that have none, one at a time (the lookup service is paced)
  useEffect(() => {
    const missing = stops.filter((s) => !located(s) && !queued.current.has(s.id));
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      for (const stop of missing) {
        if (cancelled) return;
        queued.current.add(stop.id);
        try {
          const response = await fetch("/api/route-plan/locate", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(
              stop.customAddress
                ? { address: stop.address, district: stop.district, city: stop.city }
                : { customerId: stop.customerId }
            ),
          });
          if (response.ok) {
            const found = await response.json();
            setStops((prev) =>
              prev.map((s) =>
                s.id === stop.id
                  ? { ...s, latitude: found.latitude, longitude: found.longitude, approximate: found.precision !== "address" }
                  : s
              )
            );
          }
        } finally {
          setLookedUp((prev) => new Set(prev).add(stop.id));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  const visible = useMemo(() => stops.filter((s) => filter === "all" || s.kind === filter), [stops, filter]);
  const end = returnToBase ? start : null;

  // Shortest order for the located stops, unless the user has moved stops by hand
  const route = useMemo(() => {
    const withCoords = visible.filter(located);
    const auto = orderStops(withCoords, start, end);
    if (!order.length) return auto;
    const byId = new Map(withCoords.map((s) => [s.id, s]));
    const manual = order.map((id) => byId.get(id)).filter(Boolean) as typeof withCoords;
    // Stops located after the manual order was set go to the end
    return [...manual, ...withCoords.filter((s) => !order.includes(s.id))];
  }, [visible, start, end, order]);
  const unlocated = visible.filter((s) => !located(s));

  const totalKm = routeLengthKm(route, start, end);
  const mapLegs = route.length ? googleMapsRouteUrls(route, start, end) : [];
  const counts = {
    pickup: stops.filter((s) => s.kind === "pickup").length,
    delivery: stops.filter((s) => s.kind === "delivery").length,
    all: stops.length,
  };

  const move = (index: number, delta: number) => {
    const ids = route.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setOrder(ids);
  };

  const changeFilter = (value: Filter) => {
    setFilter(value);
    setOrder([]);
  };

  const complete = async (stop: Stop) => {
    const meta = KIND[stop.kind];
    setBusyStop(stop.id);
    try {
      for (const o of stop.orders) {
        for (const status of statusPath(o.status, meta.target)) {
          const response = await fetch(`/api/orders/${o.id}/status`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ status, notes: "Rota ekranından" }),
          });
          if (!response.ok) throw new Error(o.orderNumber);
        }
      }
      setStops((prev) => prev.filter((s) => s.id !== stop.id));
      setOrder((prev) => prev.filter((id) => id !== stop.id));
      const extra = stop.kind === "delivery" && stop.remaining > 0 ? ` · ${money(stop.remaining)} tahsil edilecek` : "";
      toast.success(`${stop.name}: ${meta.done.toLowerCase()}${extra}`);
    } catch (error) {
      toast.error(`Sipariş güncellenemedi${error instanceof Error ? ` (${error.message})` : ""}`);
      load();
    } finally {
      setBusyStop(null);
    }
  };

  const saveHere = (stop: Stop) => {
    if (!navigator.geolocation) {
      toast.error("Bu cihaz konum vermiyor");
      return;
    }
    setBusyStop(stop.id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const response = await fetch("/api/route-plan/locate", {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              customerId: stop.customerId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          if (!response.ok) throw new Error();
          const saved = await response.json();
          setStops((prev) =>
            prev.map((s) =>
              s.customerId === stop.customerId
                ? { ...s, latitude: saved.latitude, longitude: saved.longitude, approximate: false }
                : s
            )
          );
          toast.success("Müşterinin konumu kaydedildi");
        } catch {
          toast.error("Konum kaydedilemedi");
        } finally {
          setBusyStop(null);
        }
      },
      (err) => {
        setBusyStop(null);
        toast.error(
          err.code === err.PERMISSION_DENIED ? "Konum izni verilmedi" : "Konum alınamadı; konum servisini açın"
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const StopCard = ({ stop, index, previous }: { stop: Stop; index: number | null; previous: Point | null }) => {
    const meta = KIND[stop.kind];
    const leg = previous && located(stop) ? distanceKm(previous, stop) : null;
    const busy = busyStop === stop.id;
    return (
      <li className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              index === null ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {index === null ? "?" : index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-semibold text-foreground">{stop.name}</p>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES[meta.tone].badge}`}>
                {meta.label}
              </span>
              {stop.urgent && (
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TONE_CLASSES.danger.badge}`}>
                  Acil
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {[stop.address, stop.district, stop.city].filter(Boolean).join(", ") || "Adres girilmemiş"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {leg !== null && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {km(leg)}
                </span>
              )}
              <span>
                {stop.orders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="mr-2 font-medium text-primary hover:underline">
                    #{o.orderNumber}
                  </Link>
                ))}
              </span>
              {stop.kind === "delivery" && stop.remaining > 0 && (
                <span className={`font-medium ${TONE_CLASSES.warning.text}`}>{money(stop.remaining)} tahsilat</span>
              )}
              {!located(stop) && !lookedUp.has(stop.id) ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Konum aranıyor
                </span>
              ) : !located(stop) ? (
                <span className={`inline-flex items-center gap-1 ${TONE_CLASSES.warning.text}`}>
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Konum bulunamadı
                </span>
              ) : stop.approximate ? (
                <span className={`inline-flex items-center gap-1 ${TONE_CLASSES.warning.text}`}>
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  Yaklaşık konum (mahalle/ilçe)
                </span>
              ) : null}
            </div>
          </div>
          {index !== null && (
            <div className="flex shrink-0 flex-col gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Yukarı taşı" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Aşağı taşı"
                disabled={index === route.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => makePhoneCall(stop.phone)} disabled={!stop.phone}>
            <Phone className="h-4 w-4" />
            Ara
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openGoogleMapsDirections(
                located(stop) && !stop.approximate
                  ? { latitude: stop.latitude, longitude: stop.longitude }
                  : { address: [stop.address, stop.district, stop.city].filter(Boolean).join(", ") }
              )
            }
          >
            <Navigation className="h-4 w-4" />
            Git
          </Button>
          <Button size="sm" className="col-span-2" onClick={() => complete(stop)} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {meta.done}
          </Button>
        </div>
        {(!located(stop) || stop.approximate) && !stop.customAddress && (located(stop) || lookedUp.has(stop.id)) && (
          <button
            type="button"
            onClick={() => saveHere(stop)}
            disabled={busy}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            <Crosshair className="h-4 w-4" aria-hidden="true" />
            Kapıdayım: bu konumu müşteriye kaydet
          </button>
        )}
      </li>
    );
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Rota"
        description="Alınacak ve dağıtılacak adresler en kısa sıraya konur; tek dokunuşla haritada açılır."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted p-1" role="tablist">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            onClick={() => changeFilter(value)}
            className={`rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
              filter === value ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} <span className="tabular-nums">({counts[value]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
          <RouteIcon className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 font-medium text-foreground">Gidilecek adres yok</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Teslim alınacak veya dağıtıma hazır sipariş olduğunda burada sıralanır.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="text-lg font-bold text-foreground">{route.length}</span> durak
                {route.length > 0 && (
                  <>
                    {" "}· yaklaşık <span className="font-semibold text-foreground">{km(totalKm)}</span>{" "}
                    <span className="text-xs">(kuş uçuşu)</span>
                  </>
                )}
              </p>
              {order.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setOrder([])}>
                  Yeniden sırala
                </Button>
              )}
            </div>
            {start ? (
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-foreground">
                  Başlangıç: {start.label}
                  {start.approximate && <span className="text-muted-foreground"> (yaklaşık)</span>}
                  <span className="block text-xs text-muted-foreground">Bitişte işletmeye dön</span>
                </span>
                <Switch checked={returnToBase} onCheckedChange={(v) => { setReturnToBase(v); setOrder([]); }} />
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">
                İşletme adresinin konumu bulunamadı; rota bulunduğunuz yerden başlar.{" "}
                <Link href="/settings" className="text-primary hover:underline">
                  İşletme adresi
                </Link>
              </p>
            )}
            {mapLegs.length === 1 && (
              <Button className="w-full" onClick={() => window.open(mapLegs[0].url, "_blank")}>
                <Navigation className="h-4 w-4" />
                Tüm Rotayı Haritada Aç
              </Button>
            )}
            {mapLegs.length > 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Google Haritalar bir seferde en çok 10 durak açar; rota parçalara bölündü.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {mapLegs.map((leg, i) => (
                    <Button key={leg.url} variant={i === 0 ? "default" : "outline"} onClick={() => window.open(leg.url, "_blank")}>
                      <Navigation className="h-4 w-4" />
                      {leg.from}–{leg.to}. duraklar
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <ol className="space-y-3">
            {route.map((stop, index) => (
              <StopCard key={stop.id} stop={stop} index={index} previous={index === 0 ? start : route[index - 1]} />
            ))}
          </ol>

          {unlocated.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground">Haritaya eklenemeyenler</h2>
              <ul className="space-y-3">
                {unlocated.map((stop) => (
                  <StopCard key={stop.id} stop={stop} index={null} previous={null} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default function RoutePage() {
  return (
    <AppShell>
      <RoutePlanner />
    </AppShell>
  );
}
