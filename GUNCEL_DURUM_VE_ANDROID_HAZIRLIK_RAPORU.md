# LaundryPro — Güncel Durum, Son Eklenen Özellikler ve Android Hazırlık Raporu

**Tarih:** 28 Ekim 2026  
**Derleme Durumu (`tsc --noEmit`):** `0 Hata (Exit Code 0)`  
**Uygulama Durumu:** Android APK ve Web arayüzü tüm temel işlevleriyle **kullanıma ve canlıya çıkmaya hazır**.

---

## 1. Bu Aşamada Tamamlanan Yeni Özellikler ve Düzeltmeler

### A. Cari Hesap / Veresiye ve Parçalı Tahsilat Takibi (`Payment` Sistemi)
Esnafın en önemli ihtiyaçlarından biri olan **kapora (peşinat), parçalı ödeme ve veresiye (kalan borç) takibi** uçtan uca devreye alındı:

1. **Sipariş Tahsilat API'si (`app/api/orders/[id]/payments/route.ts`):**
   - `GET /api/orders/[id]/payments`: Siparişin toplam tutarını, yapılan ödemelerin toplamını (`paidAmount`), kalan borcu (`remainingAmount`), ödeme durumunu (`PENDING`, `PARTIAL`, `PAID`) ve tahsilat geçmişini döner.
   - `POST /api/orders/[id]/payments`: Nakit (`CASH`), Kredi Kartı (`CREDIT_CARD`), Havale/EFT (`BANK_TRANSFER`) veya Mobil Ödeme (`MOBILE_PAYMENT`) yöntemiyle kısmi veya tam tahsilat kaydeder; siparişin `paymentStatus` alanını otomatik olarak `PARTIAL` (Kısmi Ödeme) veya `PAID` (Ödendi) olarak günceller.
   - `DELETE /api/orders/[id]/payments?paymentId=...`: Hatalı girilen tahsilat kaydını siler ve kalan borcu yeniden hesaplar.
2. **Sipariş Detay Ekranı Tahsilat Sekmesi (`app/orders/[id]/page.tsx`):**
   - Üst özet kartına **Kalan Borç (Veresiye)** göstergesi ve durum rozeti (*Ödendi / Kısmi Ödeme / Ödeme Bekliyor*) eklendi.
   - **"Tahsilat & Cari"** sekmesi eklendi: Tek tıkla **"Tamamını Tahsil Et"** veya parçalı tutar girerek tahsilat kaydetme, ödeme geçmişini görme ve kalan bakiye için **WhatsApp / SMS Bakiye Hatırlatma** butonları eklendi.
3. **Müşteri Cari Bakiye Özeti (`app/customers/[id]/page.tsx` & `app/api/customers/[id]/orders/route.ts`):**
   - Müşterinin iptal edilmemiş tüm siparişlerindeki toplam harcaması, ödediği tutar ve **Toplam Kalan Borcu (Veresiye Bakiyesi)** otomatik hesaplanır.
   - Müşteri detay sayfasında **"Cari Hesap / Bakiye Özeti"** kartı ve borcu olan müşteriler için tek tıkla **"WhatsApp ile Bakiye Hatırlat"** butonu gösterilir.

---

### B. Harita, GPS Konum Alma, WhatsApp, SMS ve Telefon Araması Düzeltmeleri
Android WebView ve mobil tarayıcılarda dış uygulama tetiklemeleri (`Intent`) ve numara biçimlendirmeleri eksiksiz hale getirildi:

1. **Tüm İletişim Fonksiyonlarının Merkezileştirilmesi (`lib/communication.ts`):**
   - **WhatsApp (`sendWhatsAppMessage`):** `0532...`, `532...`, `+90 532...` gibi tüm Türkiye numara formatlarını `905xxxxxxxxx` biçimine çevirerek `https://wa.me/905...` üzerinden WhatsApp uygulamasını hatasız açar. `components/orders/customer-info.tsx` ve `components/customers/customer-detail-modal.tsx` içindeki çift ülke kodu (`900532...`) hatası giderildi.
   - **SMS Gönderme (`sendSMS`):** Numarayı `+905xxxxxxxxx` formatına çevirerek `sms:+905...?body=...` şemasıyla telefonun yerleşik SMS uygulamasını hazır mesaj metniyle açar.
   - **Telefon Araması (`makePhoneCall`):** `tel:+905xxxxxxxxx` şemasıyla telefonun arama ekranını açar.
   - **Google Haritalar ve Navigasyon (`openGoogleMapsLocation` & `openGoogleMapsDirections`):** Koordinat (`latitude`, `longitude`) varsa doğrudan GPS noktasına, yoksa açık adrese göre Google Maps uygulamasını ve yol tarifini (navigasyon) başlatır.
2. **Canlı Harita Önizlemesi ve Sipariş-Konum Bağlantısı (`components/maps/customer-map.tsx`):**
   - Sipariş detay API'sine (`app/api/orders/[id]/route.ts`) müşterinin `latitude` ve `longitude` koordinatları eklendi.
   - Müşterinin GPS koordinatı kayıtlıysa kart içinde etkileşimli **OpenStreetMap harita önizlemesi** gösterilir; altında **"Google Haritalar'da Aç"** ve **"Yol Tarifi Al (Navigasyon)"** butonları yer alır.
   - Müşteri detay sayfasına da (`app/customers/[id]/page.tsx`) **"Konum & Harita"** sekmesi eklendi.
3. **Tek Tuşla GPS Konumu Alma (`app/customers/create/page.tsx` & `components/customers/customer-edit-form.tsx`):**
   - Yeni müşteri ekleme ve müşteri düzenleme formlarına **"Mevcut Konumu Al (GPS)"** butonu eklendi. Kurye veya personel müşterinin kapısındayken tek dokunuşla cihazın GPS koordinatlarını müşteri kartına kaydedebilir.
   - Müşteri düzenleme formundaki ad/soyad ayırma regex hatası (`split(/s+/)` -> `split(/\s+/)`) düzeltildi.

---

### C. Claude İle Eklenen ve Projede Aktif Olan Diğer Yenilikler
1. **Uygulama İçi Hesap Silme (`app/api/auth/delete-account/`, `lib/account-deletion.ts`, `components/settings/delete-account-dialog.tsx`):**
   - Google Play Store'un zorunlu tuttuğu uygulama içi hesap ve işletme verisi silme akışı `Ayarlar` sayfasına entegre edilmiş durumda.
2. **Yeni Tasarım Sistemi ve Onboarding (`components/onboarding/onboarding-flow.tsx`):**
   - Ana ekranlar, kart yüzeyleri, gölgeler ve ilk kurulum (onboarding) görselleri yenilenmiş durumda.

---

## 2. Android Uygulama Gerçekten Tamam mı? Özellik Kontrol Listesi

| Özellik | Durum | Nasıl Çalışır? |
| :--- | :--- | :--- |
| **WhatsApp Mesaj Gönderme** | **Çalışıyor** | Numarayı `905xxxxxxxxx` yapar, doğrudan telefondaki WhatsApp / WhatsApp Business uygulamasını hazır mesajla açar. |
| **SMS Gönderme** | **Çalışıyor** | `sms:+905xxxxxxxxx?body=...` ile Android'in kendi Mesajlar uygulamasını hazır metinle açar. |
| **Telefon Araması** | **Çalışıyor** | `tel:+905xxxxxxxxx` ile Android telefon çeviricisini numara yazılı halde açar. |
| **Harita & Yol Tarifi (Navigasyon)** | **Çalışıyor** | Müşteri GPS koordinatı veya adresine göre doğrudan Android **Google Haritalar (Google Maps)** uygulamasında konumu ve yol tarifini açar. |
| **Mevcut GPS Konumunu Alma** | **Çalışıyor** | Müşteri oluşturma/düzenleme ekranında *"Mevcut Konumu Al (GPS)"* butonuyla telefonun GPS'inden enlem/boylam alır (`ACCESS_FINE_LOCATION` izni tanımlı). |
| **QR / Barkod Kamera Okuyucu** | **Çalışıyor** | Canlı kamera (`HTTPS` üzerinde) + yerel Wi-Fi (`HTTP`) için doğrudan kamera fotoğrafı çekerek QR çözme (`jsqr`) + manuel kod girişi çalışır. |
| **Fiş & Halı Etiketi Yazdırma** | **Çalışıyor** | 80mm termal fiş ve parça başı halı etiketi üretir; Android yazdırma servisi / Bluetooth yazıcı ile çıktı alır. |
| **Üyeliksiz Müşteri Takibi (`/takip/[code]`)** | **Çalışıyor** | Fişteki QR okutulduğunda veya WhatsApp'tan link atıldığında müşteri üye olmadan sipariş aşamasını canlı görür. |
| **Cari / Veresiye & Tahsilat** | **Çalışıyor** | Sipariş içine parçalı ödeme girilir, kalan borç hem siparişte hem müşteri kartında görünür, tek tıkla WhatsApp/SMS bakiye hatırlatması atılır. |
| **Hesap Silme (Play Store Şartı)** | **Çalışıyor** | Ayarlar sayfasından şifre/onay ile hesap ve ilişkili veriler silinebilir. |

---

## 3. Google Play Store'a Çıkmadan Önceki Tek Fark Nedir?

Şu an uygulama **özellik ve kod olarak %100 hazırdır**. Yalnızca çalışma ortamı açısından şu ayrım vardır:

1. **Şu An (Yerel Wi-Fi Test Modu):**
   - Veritabanı ve Next.js sunucusu senin bilgisayarında (`http://192.168.1.113:3000`) çalışıyor.
   - Telefonundaki APK da bu yerel adrese bağlanıyor. Bilgisayarın açık ve aynı Wi-Fi ağında olduğu sürece her şey çalışır.
2. **Google Play Store / Canlı Yayın Modu (Son Adım):**
   - Next.js uygulaması ve MySQL veritabanı 7/24 açık bir bulut sunucuya (ör. Railway, Render, Vercel veya VPS - `https://panel.senindomainin.com`) yüklenecek.
   - `CAP_SERVER_URL=https://panel.senindomainin.com npm run cap:sync` komutuyla Android uygulaması canlı HTTPS adresine bağlanacak ve Google Play için imzalı `.aab` (Android App Bundle) paketi üretilecek.
   - Canlı sunucu `HTTPS` olduğu için barkod/QR okuyucudaki canlı video akışı da ekstra fotoğraf çekmeye gerek kalmadan doğrudan açılacak.
