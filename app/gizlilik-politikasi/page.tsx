import React from "react";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

export const metadata = {
  title: "Gizlilik Politikası | LaundryPro",
  description:
    "LaundryPro uygulamasının gizlilik politikası: hangi verilerin toplandığı, nasıl kullanıldığı, kimlerle paylaşıldığı ve nasıl silindiği.",
};

// Written against what the app actually does (keep in step with features): no ads, no third-party
// analytics, no location permission; camera only for QR scanning and order photos.
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-xl font-semibold mt-8">{children}</h2>
);

export default function Page() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Gizlilik Politikası</h1>
      <p className="text-sm text-muted-foreground mb-8">Son güncelleme: {LEGAL.lastUpdated}</p>

      <section className="space-y-4 text-foreground leading-7">
        <p>
          Bu politika, LaundryPro mobil uygulaması ve laundry.kodleon.com web sitesi (birlikte
          &quot;LaundryPro&quot;) kullanılırken hangi kişisel verilerin işlendiğini, ne amaçla
          kullanıldığını, kimlerle paylaşıldığını ve nasıl silinebileceğini açıklar. LaundryPro;
          kuru temizleme, çamaşırhane ve halı yıkama işletmelerinin sipariş, müşteri, tahsilat ve
          teslimat işlerini yönetmesi için geliştirilmiş bir iş uygulamasıdır.
        </p>

        <H2>Veri sorumlusu ve roller</H2>
        <p>
          LaundryPro&apos;yu {LEGAL.controllerName} ({LEGAL.controllerAddress}) işletir.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Hesap ve işletme verileri</strong> (uygulamaya kaydolan işletme sahibi ve
            çalışanlarının bilgileri) için veri sorumlusu {LEGAL.controllerName}&apos;dir.
          </li>
          <li>
            <strong>İşletmelerin kendi müşterilerine ait veriler</strong> (işletmenin uygulamaya
            girdiği müşteri adı, telefonu, adresi ve siparişleri) için veri sorumlusu ilgili
            işletmedir. {LEGAL.controllerName} bu verileri yalnızca işletme adına ve işletmenin
            talimatıyla, hizmeti sunmak amacıyla işler (veri işleyen). Bu verilerle ilgili
            taleplerinizi öncelikle hizmet aldığınız işletmeye iletin.
          </li>
        </ul>

        <H2>Toplanan veriler</H2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Hesap bilgileri:</strong> ad, soyad, e-posta, telefon, şifre (yalnızca geri
            döndürülemez biçimde, şifrelenmiş olarak saklanır), kullanıcı rolü ve verilen onaylar
            (KVKK, gizlilik, kullanım şartları, isteğe bağlı ticari ileti onayı).
          </li>
          <li>
            <strong>İşletme bilgileri:</strong> işletme adı, hizmet türleri, adres, il/ilçe,
            iletişim bilgileri, vergi bilgileri ve KDV ayarları.
          </li>
          <li>
            <strong>İşletmenin müşterilerine ait bilgiler:</strong> ad, soyad, telefon, WhatsApp
            numarası, e-posta, adres, il/ilçe ve işletme girerse adres koordinatları ve notlar.
          </li>
          <li>
            <strong>Sipariş ve tahsilat kayıtları:</strong> sipariş içeriği, tutarlar, ödemeler,
            kalan borç (veresiye), durum geçmişi, teslim tarihleri ve faturalar.
          </li>
          <li>
            <strong>Sipariş fotoğrafları:</strong> işletmenin isteğe bağlı olarak çektiği veya
            yüklediği ürün fotoğrafları (örneğin teslim alırken halının durumu).
          </li>
          <li>
            <strong>Teknik veriler:</strong> IP adresi, tarayıcı/cihaz bilgisi ve sunucu günlük
            kayıtları; güvenlik, kötüye kullanımı önleme ve hata gidermek için.
          </li>
        </ul>
        <p>
          Uygulama konum izni istemez ve konumunuzu toplamaz. Kamera yalnızca siz QR/barkod
          okuttuğunuzda veya sipariş fotoğrafı çektiğinizde kullanılır; fotoğraf yalnızca siz
          yüklediğinizde kaydedilir.
        </p>

        <H2>Verilerin kullanım amaçları</H2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Hesap oluşturmak, giriş yapmak ve hizmeti sunmak</li>
          <li>Sipariş, müşteri, tahsilat, fatura ve teslimat işlemlerini yürütmek</li>
          <li>
            Müşterinin siparişini takip edebilmesi için işletmenin paylaştığı takip bağlantısını
            sunmak (bu sayfada müşterinin soyadı kısaltılır; adres ve telefon gösterilmez)
          </li>
          <li>Şifre sıfırlama gibi işlemsel e-postalar göndermek</li>
          <li>Güvenliği sağlamak, kötüye kullanımı önlemek ve hataları gidermek</li>
          <li>Yasal yükümlülükleri yerine getirmek</li>
        </ul>
        <p>
          LaundryPro reklam göstermez, verileri reklam veya pazarlama amacıyla üçüncü kişilere
          satmaz ve üçüncü taraf analiz/izleme araçları kullanmaz.
        </p>

        <H2>Verilerin paylaşıldığı taraflar</H2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Barındırma hizmeti:</strong> veriler, Hetzner Online GmbH&apos;nin yurt dışında
            bulunan veri merkezlerindeki sunucularda saklanır. Bu, KVKK kapsamında yurt dışına
            veri aktarımı niteliğindedir ve hizmetin sunulabilmesi için gereklidir.
          </li>
          <li>
            <strong>E-posta gönderim hizmeti:</strong> şifre sıfırlama gibi işlemsel e-postaları
            iletmek için e-posta adresi ve ileti içeriği kullanılır.
          </li>
          <li>
            <strong>WhatsApp, telefon ve harita uygulamaları:</strong> işletme bir müşteriye
            WhatsApp mesajı göndermek, arama yapmak veya yol tarifi almak için ilgili düğmeye
            bastığında, telefon numarası, mesaj veya adres cihazdaki ilgili uygulamaya (WhatsApp,
            telefon, Google Haritalar) aktarılır. Bu aktarım yalnızca kullanıcının işlemiyle olur.
          </li>
          <li>
            <strong>Yetkili makamlar:</strong> yasal bir zorunluluk olduğunda, mevzuatın
            gerektirdiği ölçüde.
          </li>
        </ul>

        <H2>Saklama süresi ve silme</H2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Veriler, hesap açık olduğu ve hizmet sürdüğü müddetçe saklanır.</li>
          <li>
            Hesabınızı uygulama içinden silebilirsiniz: <strong>Ayarlar &gt; Güvenlik &gt;
            Hesabı Sil</strong>. İşletme sahibi hesabını silerse işletme ve ona ait tüm veriler
            (müşteriler, siparişler, faturalar, fotoğraflar, kullanıcılar) kalıcı olarak silinir.
            Çalışan hesabı silindiğinde kişinin ad, e-posta ve telefon bilgileri silinir; işletmenin
            kayıtları korunur.
          </li>
          <li>
            Faturalar gibi işletmenin yasal olarak saklaması gereken kayıtları silmeden önce
            indirmek işletmenin sorumluluğundadır.
          </li>
          <li>
            Uygulamaya erişemiyorsanız silme talebinizi {LEGAL.contactEmail} adresine
            iletebilirsiniz.
          </li>
        </ul>

        <H2>Veri güvenliği</H2>
        <p>
          Tüm bağlantılar HTTPS ile şifrelenir; şifreler geri döndürülemez biçimde saklanır;
          sipariş fotoğrafları yalnızca ilgili işletmenin yetkili kullanıcılarına gösterilir ve
          her işletme yalnızca kendi verilerine erişebilir. İnternet üzerinden yapılan hiçbir
          aktarımın tamamen güvenli olduğu garanti edilemese de verileri korumak için uygun teknik
          ve idari önlemleri uygularız.
        </p>

        <H2>Çocukların gizliliği</H2>
        <p>
          LaundryPro işletmelere yönelik bir uygulamadır ve 18 yaşından küçükleri hedeflemez.
        </p>

        <H2>Haklarınız</H2>
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 11. maddesi kapsamında,
          kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini
          veya silinmesini isteme, aktarıldığı tarafları öğrenme ve işlenmesine itiraz etme
          haklarına sahipsiniz. Ayrıntılar için{" "}
          <Link href="/kvkk" className="text-primary hover:underline">
            KVKK Aydınlatma Metni
          </Link>
          &apos;ni inceleyebilirsiniz.
        </p>

        <H2>Değişiklikler</H2>
        <p>
          Bu politika değiştiğinde güncel metin bu sayfada yayımlanır ve sayfanın başındaki
          tarih güncellenir.
        </p>

        <H2>İletişim</H2>
        <p>
          Sorularınız ve başvurularınız için: {LEGAL.contactEmail}
          <br />
          {LEGAL.controllerName}, {LEGAL.controllerAddress}
        </p>

        <div className="mt-8">
          <Link href="/" className="text-primary hover:underline">
            Ana sayfaya dön
          </Link>
        </div>
      </section>
    </main>
  );
}
