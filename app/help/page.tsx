import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Yardım ve Dökümantasyon | LaundryPro",
  description:
    "LaundryPro için kapsamlı yardım, dökümantasyon, SSS, sorun giderme ve destek kanalları.",
};

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
    <h3 className="text-lg font-semibold mb-3 text-gray-800">{title}</h3>
    <div className="text-gray-700 leading-7 text-sm md:text-base">
      {children}
    </div>
  </div>
);

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
    {children}
  </span>
);

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <section className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Pill>Yardım Merkezi</Pill>
            <Pill>Dokümantasyon</Pill>
            <Pill>SSS</Pill>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            LaundryPro Yardım ve Dökümantasyon
          </h1>
          <p className="text-gray-600 mt-2">
            Kurulumdan gelişmiş özelliklere kadar tüm bilgiler burada.
            Sorularınız için destek kanallarını kullanabilirsiniz.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
          <Link
            href="/gizlilik-politikasi"
            className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
          >
            Gizlilik Politikası
          </Link>
          <Link
            href="/kullanim-sartlari"
            className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
          >
            Kullanım Şartları
          </Link>
          <Link
            href="/kvkk"
            className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
          >
            KVKK
          </Link>
        </div>
      </section>

      {/* Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Başlarken">
          <ol className="list-decimal pl-5 space-y-2">
            <li>İşletme kaydınızı oluşturun ve temel bilgileri tamamlayın.</li>
            <li>Hizmet türlerinizi ve fiyatlandırmayı belirleyin.</li>
            <li>Müşteri, sipariş ve teslimat akışlarını tanımlayın.</li>
            <li>WhatsApp ve E-Fatura gibi entegrasyonları yapılandırın.</li>
          </ol>
          <div className="mt-3 flex gap-2">
            <Link href="/onboarding" className="text-blue-600 hover:underline">
              Hızlı kurulum sihirbazı →
            </Link>
          </div>
        </Card>

        <Card title="Sık Sorulan Sorular (SSS)">
          <ul className="space-y-2">
            <li>
              <strong>• Sipariş nasıl oluşturulur?</strong>
              <div>
                Dashboard veya Siparişler sayfasından "Yeni Sipariş" ile
                başlayın, müşteri ve hizmetleri seçin.
              </div>
            </li>
            <li>
              <strong>• WhatsApp entegrasyonu nasıl yapılır?</strong>
              <div>
                Ayarlar → WhatsApp bölümünden gerekli bilgileri girin ve testi
                çalıştırın.
              </div>
            </li>
            <li>
              <strong>• E-Fatura gönderimi nasıl yapılır?</strong>
              <div>
                Faturalar sayfasında ilgili faturayı seçip "E-Fatura Gönder"i
                kullanın.
              </div>
            </li>
          </ul>
          <div className="mt-3">
            <Link
              href="/notifications"
              className="text-blue-600 hover:underline"
            >
              Bildirim ayarları →
            </Link>
          </div>
        </Card>

        <Card title="Sorun Giderme">
          <ul className="space-y-2">
            <li>
              Uygulamaya giriş yapamıyorsanız, token geçerliliğini ve kullanıcı
              durumunu kontrol edin.
            </li>
            <li>
              Bildirim almıyorsanız, cihaz izinleri ve uygulama bildirim
              ayarlarını gözden geçirin.
            </li>
            <li>
              Entegrasyon sorunlarında test uç noktalarını kullanarak bağlantıyı
              doğrulayın.
            </li>
          </ul>
          <div className="mt-3">
            <Link
              href="/test-network"
              className="text-blue-600 hover:underline"
            >
              Ağ bağlantı testi →
            </Link>
          </div>
        </Card>

        <Card title="Özellikler ve En İyi Uygulamalar">
          <ul className="space-y-2">
            <li>Akıllı müşteri seçimi ile sipariş oluşturma hızını artırın.</li>
            <li>Rota planlama ile teslimat sürelerini optimize edin.</li>
            <li>
              Kullanıcı rollerini ve yetkilerini düzenli olarak gözden geçirin.
            </li>
          </ul>
        </Card>

        <Card title="Güncellemeler ve Yol Haritası">
          <p>
            LaundryPro sürekli geliştirilmektedir. Sürüm notları ve planlanan
            özellikler için duyuruları takip edin.
          </p>
          <div className="mt-3 flex gap-2">
            <Link href="/homepage" className="text-blue-600 hover:underline">
              Duyurular →
            </Link>
          </div>
        </Card>

        <Card title="İletişim ve Destek">
          <p>Destek ekibimize aşağıdaki kanallardan ulaşabilirsiniz:</p>
          <ul className="space-y-2 mt-2">
            <li>
              <span className="font-medium">E-posta:</span>{" "}
              <a
                className="text-blue-600 hover:underline"
                href="mailto:mackaengin@gmail.com"
              >
                mackaengin@gmail.com
              </a>
            </li>
            <li>
              <span className="font-medium">Telefon:</span>{" "}
              <a
                className="text-blue-600 hover:underline"
                href="tel:+905465867927"
              >
                +90 546 586 79 27
              </a>
            </li>
            <li>
              <span className="font-medium">WhatsApp:</span>{" "}
              <a
                className="text-blue-600 hover:underline"
                href="https://wa.me/905465867927"
                target="_blank"
              >
                Mesaj gönder
              </a>
            </li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">
            Destek saatleri: Hafta içi 09:00 - 18:00 (TR)
          </p>
        </Card>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border bg-gradient-to-r from-blue-50 to-indigo-50 p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Sorunuz mu var?
            </h2>
            <p className="text-gray-700 mt-1">
              SSS bölümünde bulamadığınız konular için bizimle iletişime geçin.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition shadow"
              href="mailto:mackaengin@gmail.com"
            >
              E-posta Gönder
            </a>
            <a
              className="inline-flex items-center rounded-lg border border-blue-300 px-4 py-2 text-blue-700 hover:bg-blue-50 transition"
              href="https://wa.me/905465867927"
              target="_blank"
            >
              WhatsApp
            </a>
            <Link
              className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
              href="/"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
