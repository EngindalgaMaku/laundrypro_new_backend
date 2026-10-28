import React from "react";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "KVKK Aydınlatma Metni | LaundryPro",
  description:
    "LaundryPro KVKK aydınlatma metni. Kişisel verilerin işlenmesine dair bilgilendirme.",
};

export default function Page() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">KVKK Aydınlatma Metni</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Son güncelleme: {LEGAL.lastUpdated}
      </p>

      <section className="space-y-4 text-foreground leading-7">
        <p>
          Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu
          (KVKK) kapsamında kişisel verilerinizin hangi amaçlarla işlendiği,
          kimlere aktarıldığı ve haklarınız hakkında bilgi vermek amacıyla
          hazırlanmıştır.
        </p>

        <h2 className="text-xl font-semibold mt-6">Veri Sorumlusu</h2>
        <p>
          LaundryPro hizmetini sunan {LEGAL.controllerName} ({LEGAL.controllerAddress}),
          KVKK kapsamında veri sorumlusudur ve kişisel verilerinizin güvenliği için
          gerekli tedbirleri alır.
        </p>

        <h2 className="text-xl font-semibold mt-6">İşleme Amaçları</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Hizmetlerin sunulması ve operasyonel süreçlerin yürütülmesi</li>
          <li>Müşteri ilişkileri ve destek hizmetlerinin sağlanması</li>
          <li>Yasal yükümlülüklerin yerine getirilmesi</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">Haklarınız</h2>
        <p>
          KVKK'nın 11. maddesi kapsamında erişim, düzeltme, silme, işlemeye
          itiraz gibi haklara sahipsiniz. Başvurularınızı {LEGAL.contactEmail}
          adresine iletebilirsiniz.
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
