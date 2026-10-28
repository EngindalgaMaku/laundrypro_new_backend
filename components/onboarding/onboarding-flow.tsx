"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
      <header className="flex items-center justify-between px-4 pt-4">
        <span className="flex items-center gap-2 font-bold text-foreground">
          <LogoMark className="h-8 w-8" />
          Laundry<span className="text-secondary">Pro</span>
        </span>
        {!isLast && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onComplete}>
            Geç
          </Button>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-6">
        {/* Top of the real screen in a phone frame */}
        <div className="relative mx-auto mt-6 w-full max-w-[280px] flex-1">
          <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden rounded-t-[2.25rem] border-[6px] border-b-0 border-foreground bg-card shadow-overlay">
            {/* eslint-disable-next-line @next/next/no-img-element -- static local screenshots */}
            <img key={slide.image} src={slide.image} alt="" className="w-full animate-in fade-in duration-300" />
          </div>
        </div>

        <div className="relative -mt-px rounded-xl border border-border bg-card p-5 text-center shadow-card">
          <h1 className="text-xl font-bold text-foreground">{slide.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{slide.text}</p>

          <div className="mt-4 flex justify-center gap-1.5" aria-label={`Sayfa ${index + 1} / ${SLIDES.length}`}>
            {SLIDES.map((s, i) => (
              <button
                key={s.image}
                type="button"
                aria-label={`${i + 1}. sayfa`}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-primary" : "w-2 bg-border"}`}
              />
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            {index > 0 && (
              <Button variant="outline" size="lg" className="flex-1" onClick={back}>
                <ArrowLeft className="h-4 w-4" />
                Geri
              </Button>
            )}
            <Button size="lg" className="flex-1" onClick={next}>
              {isLast ? "Başlayın" : "İleri"}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
