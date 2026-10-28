"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { LogoMark } from "@/components/brand/logo";
import {
  QrCode,
  Wallet,
  MapPin,
  MessageCircle,
  Smartphone,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const DESKTOP_SLIDES = [
  {
    image: "/onboarding/dashboard.webp",
    badge: "Tek Ekran Yönetim",
    title: "Siparişleriniz ve saha operasyonunuz tek ekranda",
    description:
      "Günün siparişlerini, teslim alınacak halıları, yıkamadaki ürünleri ve dağıtım listesini anlık takip edin.",
  },
  {
    image: "/onboarding/receipt.webp",
    badge: "QR & Barkod Sistemi",
    title: "QR kodlu fiş, halı etiketi ve kamera okuyucu",
    description:
      "Termal fiş ve halı etiketini yazdırın. Telefon kamerasıyla barkod veya QR okuttuğunuzda sipariş saniyeler içinde açılır.",
  },
  {
    image: "/onboarding/tracking.webp",
    badge: "Canlı Sipariş Takibi",
    title: "Müşteriniz üye olmadan siparişini canlı izlesin",
    description:
      "WhatsApp veya SMS ile gönderdiğiniz takip bağlantısıyla müşteriniz siparişin hangi aşamada olduğunu ve kalan bakiyesini görür.",
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: QrCode,
    title: "QR & Barkod Etiket",
    desc: "Kamera ile anında sipariş bulma ve fiş yazdırma",
  },
  {
    icon: Wallet,
    title: "Cari & Veresiye Takibi",
    desc: "Kısmi tahsilat, kalan borç ve tek tıkla ödeme alma",
  },
  {
    icon: MapPin,
    title: "Harita & GPS Navigasyon",
    desc: "Müşteri konumuna tek tıkla yol tarifi ve adres kaydı",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp & SMS Bildirim",
    desc: "Hazır şablonlarla sipariş ve bakiye hatırlatma",
  },
];

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");

    if (token && user) {
      setIsAuthenticated(true);
      router.push("/dashboard");
    } else {
      setIsAuthenticated(false);

      // Sadece mobil ekranlarda (< 768px) ilk girişte tam ekran mobil tanıtımı otomatik aç.
      // Masaüstü/bilgisayar ekranlarında doğrudan çift sütunlu geniş masaüstü ekranını göster.
      const isMobileViewport =
        typeof window !== "undefined" && window.innerWidth < 768;
      if (!hasSeenOnboarding && isMobileViewport) {
        setShowOnboarding(true);
      }
    }

    setIsLoading(false);
  }, [router]);

  // Masaüstü sol vitrin slaytlarını otomatik döndür
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % DESKTOP_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setShowOnboarding(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <LogoMark className="mx-auto mb-4 h-14 w-14" />
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  const currentSlide = DESKTOP_SLIDES[activeSlide];

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-12">
      {/* SOL PANEL: Masaüstü Tanıtım & Vitrin Alanı (Bilgisayarlarda görünür) */}
      <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-10 xl:p-14 relative overflow-hidden">
        {/* Arka plan dekoratif ışık efektleri */}
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />

        {/* Üst Marka Başlığı */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11 shadow-lg" />
            <div>
              <span className="text-2xl font-bold tracking-tight text-white">
                Laundry<span className="text-sky-400">Pro</span>
              </span>
              <span className="ml-2.5 inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300 border border-sky-400/20">
                <Sparkles className="h-3 w-3" /> Bulut & Mobil SaaS
              </span>
            </div>
          </div>

          <a
            href="/LaundryPro.apk"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 px-4 py-2 text-xs font-semibold text-white transition-all"
          >
            <Smartphone className="h-4 w-4 text-sky-400" />
            Android APK İndir
          </a>
        </div>

        {/* Orta İçerik: Başlık, Özellik Kartları ve Canlı Ekran Önizlemesi */}
        <div className="relative z-10 my-auto py-8 grid grid-cols-12 gap-8 items-center">
          <div className="col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-400/25 px-3.5 py-1 text-xs font-semibold text-sky-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
              {currentSlide.badge}
            </div>

            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight leading-tight text-white">
              {currentSlide.title}
            </h2>

            <p className="text-sm xl:text-base text-slate-300 leading-relaxed">
              {currentSlide.description}
            </p>

            {/* Slayt Seçici Noktalar */}
            <div className="flex items-center gap-2 pt-1">
              {DESKTOP_SLIDES.map((s, idx) => (
                <button
                  key={s.image}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`${idx + 1}. özellik`}
                  className={`h-2 rounded-full transition-all ${
                    idx === activeSlide
                      ? "w-8 bg-sky-400"
                      : "w-2.5 bg-white/25 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            {/* 4 Ana Özellik Özeti */}
            <div className="grid grid-cols-2 gap-3.5 pt-4 border-t border-white/10">
              {FEATURE_HIGHLIGHTS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-3"
                  >
                    <div className="rounded-lg bg-sky-500/20 p-2 text-sky-300 shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-snug mt-0.5">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ İç Sütun: Uygulama Ekran Görüntüsü Vitrin Çerçevesi */}
          <div className="col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[260px] rounded-[2rem] border-[6px] border-slate-700/90 bg-slate-950 shadow-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={currentSlide.image}
                src={currentSlide.image}
                alt={currentSlide.title}
                className="w-full h-auto object-cover animate-in fade-in duration-300"
              />
            </div>
          </div>
        </div>

        {/* Alt Bilgi */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-4">
          <span>
            Halı yıkama, kuru temizleme ve çamaşırhane işletmeleri için uçtan uca çözüm
          </span>
          <span>© {new Date().getFullYear()} LaundryPro</span>
        </div>
      </div>

      {/* SAĞ PANEL: Giriş / Kayıt Formu (Hem Masaüstü Hem Mobil) */}
      <div className="lg:col-span-5 xl:col-span-5 flex min-h-screen flex-col justify-between px-4 py-6 sm:px-8 lg:px-10 xl:px-14 bg-background overflow-y-auto">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
          {/* Başlık (Mobilde tam logo, masaüstünde karşılama başlığı) */}
          <div className="mb-6 text-center lg:text-left">
            <div className="lg:hidden">
              <LogoMark className="mx-auto mb-3 h-12 w-12" />
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Laundry<span className="text-primary">Pro</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Temizlik işinizi dijitalleştirin
              </p>
            </div>

            <div className="hidden lg:block">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Yönetim Paneline Hoş Geldiniz
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                İşletme hesabınızla giriş yapın veya yeni işletme kaydı oluşturun
              </p>
            </div>
          </div>

          <LoginForm />

          {/* Tanıtım & Android APK İndirme Bağlantıları */}
          <div className="mt-5 flex flex-wrap items-center justify-center lg:justify-between gap-3 text-center">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Uygulama turunu görüntüle
            </button>

            <a
              href="/LaundryPro.apk"
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <Smartphone className="h-3.5 w-3.5 text-primary" />
              Android APK İndir
            </a>
          </div>
        </div>

        {/* Mobil Alt Bilgi */}
        <div className="text-center mt-4 lg:hidden">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} LaundryPro
          </p>
        </div>
      </div>
    </div>
  );
}
