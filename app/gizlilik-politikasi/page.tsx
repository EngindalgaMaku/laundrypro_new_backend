import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Gizlilik Politikası | LaundryPro",
  description:
    "LaundryPro uygulamasının gizlilik politikası. Kişisel verilerin korunması ve işlenmesine dair bilgilendirme.",
};

export default function Page() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Gizlilik Politikası</h1>
      <p className="text-sm text-gray-500 mb-8">
        Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
      </p>

      <section className="space-y-4 text-gray-800 leading-7">
        <p>
          Bu Gizlilik Politikası, LaundryPro tarafından sunulan hizmetleri
          kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını
          ve korunduğunu açıklar. Uygulamayı kullanarak bu politikayı kabul
          etmiş sayılırsınız.
        </p>

        <h2 className="text-xl font-semibold mt-6">Toplanan Veriler</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Hesap bilgileri (ad, soyad, e-posta, telefon)</li>
          <li>İşletme bilgileri (işletme adı, adres, iletişim)</li>
          <li>Kullanım verileri ve günlük (log) kayıtları</li>
          <li>Cihaz ve bağlantı bilgileri (IP, tarayıcı bilgisi vb.)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">Verilerin Kullanımı</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Hizmetleri sunmak, geliştirmek ve kişiselleştirmek</li>
          <li>Güvenliği sağlamak ve kötüye kullanımın önüne geçmek</li>
          <li>Destek hizmetleri ve bilgilendirme</li>
          <li>Yasal yükümlülükleri yerine getirmek</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">Veri Güvenliği</h2>
        <p>
          Kişisel verilerinizi korumak için uygun teknik ve idari güvenlik
          önlemlerini uygularız. Ancak internet üzerinden yapılan hiçbir
          aktarımın tamamen güvenli olduğu garanti edilemez.
        </p>

        <h2 className="text-xl font-semibold mt-6">Haklarınız</h2>
        <p>
          KVKK ve ilgili mevzuat kapsamında, kişisel verilerinize ilişkin bilgi
          talep etme, düzeltme, silme ve işlemeye itiraz etme gibi haklara
          sahipsiniz.
        </p>

        <h2 className="text-xl font-semibold mt-6">İletişim</h2>
        <p>
          Gizlilik politikasıyla ilgili sorularınız için lütfen uygulama
          içerisindeki iletişim kanallarını kullanın.
        </p>

        <div className="mt-8">
          <Link href="/" className="text-blue-600 hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </section>
    </main>
  );
}
