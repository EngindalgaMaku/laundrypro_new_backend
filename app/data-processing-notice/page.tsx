"use client";

import React from "react";

export default function DataProcessingNoticePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Kişisel Verilerin İşlenmesi Aydınlatma Metni
          </h1>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                1. Veri Sorumlusu
              </h2>
              <p className="leading-relaxed">
                6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK")
                uyarınca, kişisel verilerinizin işlenmesi konusunda veri
                sorumlusu sıfatıyla LaundryPro platformunu işleten şirketimiz
                tarafından aşağıdaki bilgiler paylaşılmaktadır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                2. Kişisel Verilerin İşlenme Amaçları
              </h2>
              <p className="leading-relaxed mb-3">
                Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Hizmet sunumu ve müşteri memnuniyetinin sağlanması</li>
                <li>İşletme kayıt işlemlerinin tamamlanması</li>
                <li>Kullanıcı hesabı oluşturulması ve yönetimi</li>
                <li>Müşteri destek hizmetlerinin verilmesi</li>
                <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                <li>İstatistiksel analiz ve raporlama</li>
                <li>Sistem güvenliğinin sağlanması</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                3. İşlenen Kişisel Veri Türleri
              </h2>
              <p className="leading-relaxed mb-3">
                Platformumuzda işlenen kişisel veri kategorileri:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Kimlik Bilgileri:</strong> Ad, soyad
                </li>
                <li>
                  <strong>İletişim Bilgileri:</strong> E-posta adresi, telefon
                  numarası, adres
                </li>
                <li>
                  <strong>İşletme Bilgileri:</strong> İşletme adı, faaliyet
                  türü, konum
                </li>
                <li>
                  <strong>Teknisyen/Çalışan Bilgileri:</strong> Çalışan adı,
                  telefonu, uzmanlık alanları
                </li>
                <li>
                  <strong>Sipariş Bilgileri:</strong> Hizmet talepleri, ödeme
                  bilgileri
                </li>
                <li>
                  <strong>Teknik Veriler:</strong> IP adresi, cihaz bilgileri,
                  kullanım logları
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                4. Kişisel Verilerin Paylaşılması
              </h2>
              <p className="leading-relaxed">
                Kişisel verileriniz, yukarıda belirtilen amaçların
                gerçekleştirilmesi doğrultusunda iş ortaklarımız, hizmet
                sağlayıcılarımız ve yasal zorunluluklar çerçevesinde yetkili
                kamu kurum ve kuruluşları ile paylaşılabilir.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                5. Kişisel Veri Sahibinin Hakları
              </h2>
              <p className="leading-relaxed mb-3">
                KVKK'nın 11. maddesi uyarınca sahip olduğunuz haklar:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Kişisel veri işlenip işlenmediğini öğrenme</li>
                <li>
                  İşlenme amacını ve bunların amacına uygun kullanılıp
                  kullanılmadığını öğrenme
                </li>
                <li>
                  Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı
                  üçüncü kişileri bilme
                </li>
                <li>
                  Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde
                  bunların düzeltilmesini isteme
                </li>
                <li>Kişisel verilerin silinmesi veya yok edilmesini isteme</li>
                <li>
                  Yapılan işlemlerin kişisel verilerin aktarıldığı üçüncü
                  kişilere bildirilmesini isteme
                </li>
                <li>
                  İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla
                  analiz edilmesi suretiyle kişinin kendisi aleyhine bir sonucun
                  ortaya çıkmasına itiraz etme
                </li>
                <li>
                  Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle
                  zarara uğraması hâlinde zararın giderilmesini talep etme
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                6. Kişisel Verilerin Güvenliği
              </h2>
              <p className="leading-relaxed">
                Kişisel verilerinizin güvenliği için gerekli teknik ve idari
                tedbirleri alıyoruz. Verileriniz şifreli olarak saklanmakta ve
                yetkisiz erişime karşı korunmaktadır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                7. İletişim
              </h2>
              <p className="leading-relaxed">
                Kişisel verileriniz ile ilgili taleplerinizi platform üzerinden
                iletişim kanallarımız aracılığıyla bize ulaştırabilirsiniz.
                Talebiniz en geç 30 gün içinde sonuçlandırılacaktır.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                8. Yürürlük
              </h2>
              <p className="leading-relaxed">
                Bu aydınlatma metni, platformumuzu kullanmaya başladığınız
                tarihten itibaren yürürlüktedir. Gerekli görülmesi halinde bu
                metin güncellenebilir.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Son güncelleme: {new Date().toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
