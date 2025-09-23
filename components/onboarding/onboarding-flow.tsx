"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronLeft,
  Play,
  ArrowRight,
  Sparkles,
  Zap,
  Smartphone,
} from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const pages = [
    {
      title: "Siparişlerinizi Yönetin",
      subtitle: "Her şey bir tık uzağında",
      visual: "💫",
      theme: "from-violet-600 via-purple-600 to-blue-600",
      accent: "from-pink-500 to-rose-500",
      mockup: (
        <div className="relative w-80 h-96 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl"></div>
                <div>
                  <div className="w-20 h-3 bg-white/30 rounded mb-1"></div>
                  <div className="w-16 h-2 bg-white/20 rounded"></div>
                </div>
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-white/10 rounded-2xl animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl"></div>
                    <div className="flex-1">
                      <div className="w-24 h-3 bg-white/40 rounded mb-2"></div>
                      <div className="w-16 h-2 bg-white/20 rounded"></div>
                    </div>
                    <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce shadow-lg"></div>
          <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse shadow-lg"></div>
        </div>
      ),
    },
    {
      title: "Akıllı Dağıtım",
      subtitle: "Rotalarınızı optimize edin",
      visual: "🚀",
      theme: "from-emerald-500 via-teal-600 to-cyan-600",
      accent: "from-yellow-500 to-orange-500",
      mockup: (
        <div className="relative w-80 h-96 mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
            <div className="p-6">
              <div className="relative h-40 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-2xl mb-6 overflow-hidden">
                <div className="absolute inset-0">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`absolute w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-ping`}
                      style={{
                        top: `${20 + i * 15}%`,
                        left: `${10 + i * 18}%`,
                        animationDelay: `${i * 0.3}s`,
                      }}
                    ></div>
                  ))}
                  <svg className="absolute inset-0 w-full h-full">
                    <path
                      d="M 50 30 Q 100 50, 150 40 Q 200 30, 250 50 Q 300 70, 350 60"
                      stroke="url(#gradient)"
                      strokeWidth="3"
                      fill="none"
                      className="animate-pulse"
                    />
                    <defs>
                      <linearGradient id="gradient">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                  <span className="text-white/80 text-sm">Toplam Mesafe</span>
                  <span className="text-white font-semibold">24.5 km</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                  <span className="text-white/80 text-sm">Tahmini Süre</span>
                  <span className="text-white font-semibold">45 dk</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-3 -left-3 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl rotate-12 animate-spin-slow shadow-xl"></div>
          <div className="absolute -bottom-4 -right-4 w-20 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full animate-pulse shadow-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
        </div>
      ),
    },
    {
      title: "Mobil & Modern",
      subtitle: "Her yerden erişin",
      visual: "✨",
      theme: "from-pink-500 via-rose-500 to-orange-500",
      accent: "from-purple-500 to-indigo-600",
      mockup: (
        <div className="relative">
          <div className="flex items-center justify-center gap-8">
            {/* Phone mockup */}
            <div className="relative">
              <div className="w-32 h-56 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-3xl border border-white/30 shadow-2xl">
                <div className="p-4">
                  <div className="w-full h-2 bg-white/30 rounded mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg"></div>
                        <div className="flex-1">
                          <div className="w-full h-2 bg-white/40 rounded mb-1"></div>
                          <div className="w-3/4 h-1.5 bg-white/20 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full animate-pulse">
                <Smartphone className="w-4 h-4 text-white m-2" />
              </div>
            </div>

            {/* Tablet mockup */}
            <div className="relative">
              <div className="w-40 h-28 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-2xl border border-white/30 shadow-2xl">
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"></div>
                    <div className="w-16 h-2 bg-white/40 rounded"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-6 bg-white/20 rounded animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full animate-bounce flex items-center justify-center shadow-2xl">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl rotate-45 animate-spin-slow shadow-xl"></div>
          <div className="absolute -bottom-2 -right-6 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full animate-pulse shadow-lg"></div>
        </div>
      ),
    },
  ];

  const currentPageData = pages[currentPage];

  const nextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-br ${currentPageData.theme} relative overflow-hidden transition-all duration-1000`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute top-40 right-32 w-48 h-48 bg-white/5 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-float-slow"></div>

        {/* Geometric shapes */}
        <div className="absolute top-32 right-20 w-16 h-16 border-2 border-white/20 rounded-lg rotate-45 animate-spin-slow"></div>
        <div className="absolute bottom-40 left-20 w-12 h-12 bg-white/10 rounded-full animate-bounce"></div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          ></div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`relative z-10 min-h-screen flex flex-col transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 lg:p-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
              <span className="text-2xl">{currentPageData.visual}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">LaundryPro</h1>
              <p className="text-white/70 text-sm">Halı ve Döşeme Yıkama</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {pages.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === currentPage
                    ? "w-12 bg-white"
                    : index < currentPage
                    ? "w-6 bg-white/70"
                    : "w-6 bg-white/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-8 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Text content */}
              <div className="text-center lg:text-left space-y-8">
                <div className="space-y-4">
                  <h2 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
                    {currentPageData.title}
                  </h2>
                  <p className="text-2xl lg:text-3xl text-white/80 font-medium">
                    {currentPageData.subtitle}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
                  <Button
                    onClick={nextPage}
                    size="lg"
                    className={`bg-gradient-to-r ${currentPageData.accent} hover:scale-105 transform transition-all duration-300 shadow-2xl border-0 text-white px-8 py-6 text-lg font-semibold rounded-2xl group`}
                  >
                    {currentPage === pages.length - 1 ? (
                      <>
                        <Play className="w-5 h-5 mr-3 group-hover:translate-x-1 transition-transform" />
                        Hadi Başlayalım
                      </>
                    ) : (
                      <>
                        İleri
                        <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={prevPage}
                    disabled={currentPage === 0}
                    className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-50 px-8 py-6 text-lg rounded-2xl"
                  >
                    <ChevronLeft className="w-5 h-5 mr-2" />
                    Geri
                  </Button>
                </div>
              </div>

              {/* Visual mockup */}
              <div className="flex items-center justify-center">
                <div className="transform hover:scale-105 transition-all duration-500">
                  {currentPageData.mockup}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 lg:p-8 flex items-center justify-between">
          <p className="text-white/50 text-sm">© 2025 LaundryPro</p>
          <Button
            variant="ghost"
            onClick={onComplete}
            className="text-white/60 hover:text-white/80 text-sm"
          >
            Tanıtımı Geç
          </Button>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        @keyframes float-delayed {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-30px) rotate(-180deg);
          }
        }
        @keyframes float-slow {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 8s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 10s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
