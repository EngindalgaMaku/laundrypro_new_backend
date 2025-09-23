"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  UserPlus,
  ClipboardList,
  Users,
  Route,
  Settings,
  Zap,
} from "lucide-react";

export function QuickActions() {
  const router = useRouter();

  const primaryActions = [
    {
      title: "Yeni Sipariş",
      description: "Hızlı sipariş oluştur",
      icon: Plus,
      action: () => router.push("/orders/create"),
      color:
        "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800",
      isPrimary: true,
    },
    {
      title: "Müşteri Ekle",
      description: "Yeni müşteri kaydet",
      icon: UserPlus,
      action: () => router.push("/customers/create"),
      color:
        "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 active:from-cyan-700 active:to-cyan-800",
      isPrimary: true,
    },
  ];

  const secondaryActions = [
    {
      title: "Siparişleri Görüntüle",
      description: "Tüm siparişler",
      icon: ClipboardList,
      action: () => router.push("/orders"),
      color:
        "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700",
    },
    {
      title: "Teslimat Rotası",
      description: "Rota planlayıcısı",
      icon: Route,
      action: () => router.push("/delivery/route-planner"),
      color:
        "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700",
    },
    {
      title: "Müşteri Listesi",
      description: "Müşteri yönetimi",
      icon: Users,
      action: () => router.push("/customers"),
      color:
        "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
    },
    {
      title: "Ayarlar",
      description: "Sistem ayarları",
      icon: Settings,
      action: () => router.push("/settings"),
      color:
        "bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700",
    },
  ];

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-card to-card/50 overflow-hidden">
      <CardHeader className="pb-4 sm:pb-6">
        <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          Hızlı İşlemler
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Sık kullanılan işlemlere hızlı erişim
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6">
        {/* Primary Actions - Full width on mobile */}
        <div className="space-y-3">
          {primaryActions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={index}
                className={`w-full justify-start h-auto min-h-[64px] sm:min-h-[72px] p-4 sm:p-5 text-white font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation shadow-lg hover:shadow-xl ${action.color} rounded-xl`}
                onClick={action.action}
              >
                <div className="flex items-center space-x-3 sm:space-x-4 w-full">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                    <IconComponent className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-base sm:text-lg leading-tight">
                      {action.title}
                    </div>
                    <div className="text-sm sm:text-base text-white/80 leading-relaxed">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Secondary Actions - Grid layout */}
        <div className="pt-2">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            Diğer İşlemler
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {secondaryActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <Button
                  key={index}
                  className={`justify-start h-auto min-h-[56px] p-3 sm:p-4 text-white font-medium transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] touch-manipulation ${action.color} rounded-lg`}
                  onClick={action.action}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-semibold text-sm sm:text-base leading-tight truncate">
                        {action.title}
                      </div>
                      <div className="text-xs sm:text-sm text-white/70 leading-tight truncate">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
