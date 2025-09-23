"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  CheckCircle,
  Star,
  Sparkles,
  Shield,
  Clock,
  Users,
  Award,
  Phone,
  Mail,
  MapPin,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Homepage() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const services = [
    {
      icon: "🏠",
      title: "Ev Temizliği",
      description: "Profesyonel ev temizlik hizmetleri",
      features: ["Detaylı temizlik", "Güvenilir ekip", "Esnek saatler"],
    },
    {
      icon: "🏢",
      title: "Ofis Temizliği",
      description: "İş yerlerinde düzenli temizlik",
      features: ["Haftalık program", "Profesyonel ekipman", "Hijyen garantisi"],
    },
    {
      icon: "🪟",
      title: "Cam Temizliği",
      description: "İç ve dış cam yüzeyleri",
      features: ["Lekesiz sonuç", "Güvenli erişim", "Hızlı servis"],
    },
    {
      icon: "🛋️",
      title: "Döşeme Temizliği",
      description: "Koltuk, halı ve döşeme bakımı",
      features: ["Derin temizlik", "Leke çıkarma", "Bakım önerileri"],
    },
  ];

  const testimonials = [
    {
      name: "Ayşe Demir",
      role: "Ev Hanımı",
      content:
        "LaundryPro sayesinde temizlik işlerim artık çok kolay. Profesyonel ekip ve kaliteli hizmet.",
      rating: 5,
      image: "👩‍💼",
    },
    {
      name: "Mehmet Yılmaz",
      role: "İşletme Sahibi",
      content:
        "Ofisinizin temizliği için güvenilir bir çözüm arıyorsanız, kesinlikle tavsiye ederim.",
      rating: 5,
      image: "👨‍💼",
    },
    {
      name: "Fatma Özkan",
      role: "Proje Yöneticisi",
      content:
        "Düzenli temizlik hizmeti alıyoruz. Her zaman zamanında ve titiz çalışıyorlar.",
      rating: 5,
      image: "👩‍💻",
    },
  ];

  const stats = [
    { number: "2.500+", label: "Mutlu Müşteri" },
    { number: "15.000+", label: "Tamamlanan İş" },
    { number: "99%", label: "Memnuniyet" },
    { number: "5", label: "Yıllık Deneyim" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-xl">🧼</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-lg">
                  LaundryPro
                </span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  Profesyonel Temizlik
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#services"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Hizmetler
              </a>
              <a
                href="#about"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Hakkımızda
              </a>
              <a
                href="#testimonials"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Referanslar
              </a>
              <a
                href="#contact"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                İletişim
              </a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="hidden sm:flex focus-ring"
              >
                Giriş Yap
              </Button>
              <Button
                onClick={() => router.push("/")}
                className="btn-primary focus-ring"
              >
                Başla
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className={cn(
          "relative overflow-hidden bg-gradient-hero py-20 sm:py-24 lg:py-32 transition-all duration-1000",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}
      >
        <div className="absolute inset-0 bg-black/10"></div>

        {/* Animated Background Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div
          className="absolute bottom-20 right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 hover:bg-white/30">
              ✨ Profesyonel Temizlik Çözümleri
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Temizlik işinizi
              <span className="block bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                dijitalleştirin
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              LaundryPro ile temizlik işletmenizi modern teknoloji ile yönetin.
              Müşteri takibinden rota planlamasına kadar her şey bir arada.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button
                size="lg"
                onClick={() => router.push("/")}
                className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 focus-ring"
              >
                <Play className="w-5 h-5 mr-2" />
                Hemen Başla
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="text-white hover:bg-white/10 font-semibold px-8 py-4 text-lg focus-ring"
              >
                Demo İzle
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl sm:text-4xl font-bold mb-2">
                    {stat.number}
                  </div>
                  <div className="text-white/80 text-sm sm:text-base">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 sm:py-24 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              🛠️ Hizmetlerimiz
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Size Uygun
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                {" "}
                Çözümler
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Profesyonel temizlik hizmetleri ile işletmenizi bir üst seviyeye
              taşıyın
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <Card
                key={index}
                className="card-hover gradient-card border-0 shadow-lg"
              >
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-2xl">{service.icon}</span>
                  </div>
                  <CardTitle className="text-xl mb-2">
                    {service.title}
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {service.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-24 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-4 bg-secondary/10 text-secondary border-secondary/20">
                💡 Özellikler
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Neden
                <span className="bg-gradient-secondary bg-clip-text text-transparent">
                  {" "}
                  LaundryPro?
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Modern teknoloji ile temizlik sektörünü yeniden tanımlıyoruz
              </p>

              <div className="space-y-6">
                {[
                  {
                    icon: <Shield className="w-6 h-6" />,
                    title: "Güvenilir Hizmet",
                    description:
                      "Sigortalı ve eğitimli personel ile güvenli hizmet",
                  },
                  {
                    icon: <Clock className="w-6 h-6" />,
                    title: "Zamanında Teslimat",
                    description: "Belirlenen sürede kaliteli işi tamamlarız",
                  },
                  {
                    icon: <Award className="w-6 h-6" />,
                    title: "Kalite Garantisi",
                    description:
                      "İşinizden memnun kalmazsanız tekrar temizleriz",
                  },
                ].map((feature, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-md text-white flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-card rounded-3xl p-8 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="h-3 bg-muted rounded w-32 mb-1"></div>
                      <div className="h-2 bg-muted/60 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-muted/30 rounded-xl animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-gradient-secondary rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-20 sm:py-24 lg:py-32 bg-muted/30"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-warning/10 text-warning border-warning/20">
              💬 Müşteri Yorumları
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Müşterilerimiz
              <span className="bg-gradient-to-r from-warning to-destructive bg-clip-text text-transparent">
                {" "}
                Ne Diyor?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Binlerce mutlu müşteriyle birlikte büyümeye devam ediyoruz
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="card-hover gradient-card border-0 shadow-lg"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-xl">
                      {testimonial.image}
                    </div>
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-warning text-warning"
                      />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">
                    "{testimonial.content}"
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 lg:py-32 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-10 right-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float"></div>
        <div
          className="absolute bottom-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "1s" }}
        ></div>

        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Hemen Başlamaya
            <span className="block">Hazır mısınız?</span>
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-white/90">
            LaundryPro ile temizlik işletmenizi dijital dünyaya taşıyın.
            Ücretsiz deneme ile başlayın!
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => router.push("/")}
              className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-4 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 focus-ring"
            >
              Ücretsiz Başla
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="text-white hover:bg-white/10 font-semibold px-8 py-4 text-lg focus-ring"
            >
              Daha Fazla Bilgi
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">🧼</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-lg">
                    LaundryPro
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Profesyonel Temizlik Çözümleri
                  </span>
                </div>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md">
                Modern teknoloji ile temizlik sektörünü yeniden tanımlayan,
                müşteri memnuniyetini ön planda tutan profesyonel çözümler.
              </p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>0212 XXX XX XX</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span>info@laundrypro.com</span>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold mb-4">Hızlı Bağlantılar</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#services"
                    className="hover:text-foreground transition-colors"
                  >
                    Hizmetler
                  </a>
                </li>
                <li>
                  <a
                    href="#about"
                    className="hover:text-foreground transition-colors"
                  >
                    Hakkımızda
                  </a>
                </li>
                <li>
                  <a
                    href="#testimonials"
                    className="hover:text-foreground transition-colors"
                  >
                    Referanslar
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="hover:text-foreground transition-colors"
                  >
                    İletişim
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4">Destek</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Yardım Merkezi
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    SSS
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Gizlilik Politikası
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Kullanım Koşulları
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2025 LaundryPro. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
