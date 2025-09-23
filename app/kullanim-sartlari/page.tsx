import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Kullanım Şartları | LaundryPro",
  description:
    "LaundryPro uygulamasının kullanım şartları. Hizmet koşulları, sorumluluklar ve kısıtlamalar.",
};

export default function Page() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Kullanım Şartları</h1>
      <p className="text-sm text-gray-500 mb-8">
        Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
      </p>

      <section className="space-y-4 text-gray-800 leading-7">
        <p>
          Bu Kullanım Şartları, LaundryPro uygulamasını kullanırken uymanız
          gereken kuralları ve tarafların sorumluluklarını düzenler. Uygulamayı
          kullanarak bu şartları kabul etmiş olursunuz.
        </p>

        <h2 className="text-xl font-semibold mt-6">Hizmetin Kapsamı</h2>
        <p>
          LaundryPro, çamaşırhane işletmeleri için sipariş, müşteri ve teslimat
          yönetimi gibi işlevler sunar. Hizmet kapsamı zaman içinde
          güncellenebilir.
        </p>

        <h2 className="text-xl font-semibold mt-6">Kullanıcı Yükümlülükleri</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Hesap bilgilerinin doğruluğunu sağlamak</li>
          <li>Hukuka aykırı veya kötüye kullanımda bulunmamak</li>
          <li>Gizlilik ve güvenlik kurallarına riayet etmek</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">Sorumluluk Reddi</h2>
        <p>
          Hizmet "olduğu gibi" sunulmaktadır. Doğrudan veya dolaylı zararlardan
          LaundryPro sorumlu tutulamaz. Yasal olarak izin verilen en geniş
          çerçevede sorumluluk sınırlandırılır.
        </p>

        <h2 className="text-xl font-semibold mt-6">Değişiklikler</h2>
        <p>
          Bu şartlar, bildirimde bulunularak veya bulunulmadan güncellenebilir.
          Güncellemeleri düzenli olarak kontrol etmeniz önerilir.
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
