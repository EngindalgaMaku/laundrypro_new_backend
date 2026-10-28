"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

interface OnboardingFlowProps {
  onComplete: () => void;
}

// Real screens of the app (public/onboarding, captured with video/scripts/capture-screens.mjs)
const SLIDES = [
  {
    image: "/onboarding/dashboard.webp",
    title: "Siparişleriniz tek ekranda",
    text: "Günün siparişlerini, bekleyen işleri ve müşterilerinizi bir bakışta görün.",
  },
  {
    image: "/onboarding/receipt.webp",
    title: "QR kodlu fiş ve etiket",
    text: "Fişi ve halı etiketini yazdırın. QR kodu okuttuğunuzda sipariş anında açılır.",
  },
  {
    image: "/onboarding/tracking.webp",
    title: "Müşteriniz siparişini izlesin",
    text: "Gönderdiğiniz bağlantıyla müşteriniz üye olmadan siparişin hangi aşamada olduğunu görür.",
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  const next = () => (isLast ? onComplete() : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      onTouchStart={(e) => (touchStartX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        touchStartX.current = null;
        if (dx < -50 && !isLast) setIndex(index + 1);
        if (dx > 50) back();
      }}
    >
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-4 sm:px-8">
        <span className="flex items-center gap-2 font-bold text-foreground">
          <LogoMark className="h-8 w-8" />
          Laundry<span className="text-secondary">Pro</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={onComplete}
        >
          <span>{isLast ? "Kapat" : "Geç"}</span>
          <X className="h-4 w-4" />
        </Button>
      </header>

      <main className="mx-auto flex w-full max-w-md md:max-w-4xl flex-1 flex-col md:flex-row md:items-center md:justify-center md:gap-10 px-6 pb-6">
        {/* Top/Left of the real screen in a phone frame */}
        <div className="relative mx-auto mt-6 md:mt-0 w-full max-w-[280px] md:max-w-[300px] flex-1 md:flex-none md:h-[520px]">
          <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden rounded-t-[2.25rem] md:rounded-[2.25rem] border-[6px] border-b-0 md:border-b-[6px] border-foreground bg-card shadow-overlay">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local screenshots */}
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-top animate-in fade-in duration-300"
            />
          </div>
        </div>

        <div className="relative -mt-px md:mt-0 md:flex-1 md:max-w-md rounded-xl border border-border bg-card p-5 md:p-8 text-center md:text-left shadow-card">
          <div className="hidden md:inline-block mb-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Adım {index + 1} / {SLIDES.length}
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {slide.title}
          </h1>
          <p className="mt-2 text-sm md:text-base leading-relaxed text-muted-foreground">
            {slide.text}
          </p>

          <div
            className="mt-4 md:mt-6 flex justify-center md:justify-start gap-1.5"
            aria-label={`Sayfa ${index + 1} / ${SLIDES.length}`}
          >
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                aria-label={`${i + 1}. sayfa`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-primary" : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          <div className="mt-5 md:mt-8 flex gap-2">
            {index > 0 && (
              <Button variant="outline" size="lg" className="flex-1" onClick={back}>
                <ArrowLeft className="h-4 w-4" />
                Geri
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={next}>
              {isLast ? "Giriş Ekranına Dön" : "İleri"}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
