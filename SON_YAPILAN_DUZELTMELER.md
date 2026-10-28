# LaundryPro - Son Yapılan Düzeltmeler ve Güncel Mimari Durum (AI Handoff Özeti)

Bu doküman, projede gerçekleştirilen teknik hata düzeltmelerini, mimari iyileştirmeleri ve projenin güncel derleme/çalışma durumunu özetlemektedir. Başka bir yapay zeka aracına veya geliştiriciye bağlam (context) aktarmak için doğrudan paylaşılabilir.

---

## 1. Derleme ve Build Durumu
- **TypeScript Kontrolü (`npx tsc --noEmit`):** `0 Hata` (Tamamen temiz).
- **Production Build (`npx next build`):** Projedeki **98 sayfa ve API rotasının tamamı** başarıyla derlenmektedir.
- **Tailwind CSS:** Tailwind v4 (`@tailwindcss/postcss`) yapısına geçilmiş, eski tip uyuşmazlığı yaratan `tailwind.config.ts` kaldırılmıştır.

---

## 2. Giderilen Kritik Hatalar ve Yapılan Düzeltmeler

### A. Sipariş Fotoğrafları API'si (`app/api/orders/[id]/photos/route.ts`)
- **Önceki Sorun:** `POST` metodunda yüklenen fotoğraflar diske (`public/uploads/orders/`) yazılıyor ancak hiçbir yere kaydedilmiyordu. `GET` metodu her zaman boş dizi (`photos: []`) dönüyor, `DELETE` metodu ise hiçbir işlem yapmadan başarılı dönüyordu.
- **Yapılan Düzeltme:**
  - Yüklenen her fotoğraf için sipariş bazlı JSON metadata kaydı oluşturuldu. Dosyalar `public/` dışında, `storage/order-photos/<orderId>/` altında (canlıda `ORDER_PHOTOS_DIR`) tutulur; görsel yalnızca oturum açmış işletme personeline `GET /api/orders/[id]/photos/[photoId]` ile verilir. Aynı siparişe eşzamanlı yüklemeler sırayla işlenir.
  - `GET /api/orders/[id]/photos` çağrıldığında siparişe ait kayıtlı fotoğraflar döndürülüyor.
  - `DELETE /api/orders/[id]/photos?photoId=...` çağrıldığında hem metadata kaydı hem de diskteki fiziksel görsel dosyası güvenli şekilde siliniyor.
  - Dosya boyutu sınırı (maksimum **10 MB**) ve dosya uzantısı/MIME tipi doğrulaması (`jpg`, `jpeg`, `png`, `webp`, `heic`) eklendi.
  - İşletme izolasyonu (`businessId` kontrolü) tüm metodlarda (`GET`, `POST`, `DELETE`) zorunlu hale getirildi.

### B. WhatsApp ve Telefon Numarası Normalizasyonu (`lib/communication.ts`)
- **Önceki Sorun:** `sendWhatsAppMessage` ve `makePhoneCall` fonksiyonları telefon numarasını sadece rakamlara indirgeyip doğrudan `https://wa.me/${cleanPhone}` olarak kullanıyordu. Türkiye'de `0532...` veya `532...` formatında girilen numaralarda ülke kodu (`90`) eksik kaldığı veya başında `0` bulunduğu için WhatsApp **"Telefon numarası geçersiz"** hatası veriyordu.
- **Yapılan Düzeltme:**
  - `normalizePhoneForWhatsApp(phoneNumber)` fonksiyonu eklendi: `05xx...` (11 hane), `5xx...` (10 hane), `00905xx...` ve `+90 5xx...` formatlarının tamamını otomatik olarak `905xxxxxxxxx` formatına dönüştürür.
  - `normalizePhoneForCall(phoneNumber)` fonksiyonu eklendi: Arama (`tel:`) linkleri için numarayı `+905xxxxxxxxx` formatına dönüştürür.
  - Hem Web WhatsApp yönlendirmelerinde hem de WhatsApp Business API çağrılarında bu normalizasyon aktif edildi.
  - `lib/communication.ts` istemci bileşenlerinde de kullanıldığı için Prisma içermez; WhatsApp Business API yardımcıları sunucu tarafındaki `lib/whatsapp-business.ts` dosyasına taşındı.

### C. Bildirim Şablonlarının Veritabanına Bağlanması (`app/api/notifications/route.ts` & `app/notifications/templates/page.tsx`)
- **Önceki Sorun:** `/notifications/templates` sayfasında yapılan şablon ekleme, düzenleme, silme ve aktif/pasif yapma işlemleri yalnızca React `useState` içinde tutuluyor, sayfa yenilendiğinde kayboluyordu.
- **Yapılan Düzeltme:**
  - `app/api/notifications/route.ts` dosyasına `GET` ve `POST` yanında `PATCH` (güncelleme ve aktif/pasif durumu değiştirme) ve `DELETE` (silme) metodları eklendi.
  - İşletmenin veritabanında (`NotificationTemplate` tablosu) henüz hiç şablonu yoksa, ilk `GET` isteğinde 3 temel varsayılan şablon (Email, SMS, WhatsApp) otomatik olarak veritabanına seed ediliyor.
  - `PUT` (bildirim gönderme) metoduna `businessId` doğrulaması eklenerek başka işletmenin şablonu veya müşterisiyle işlem yapılması engellendi.
  - `app/notifications/templates/page.tsx` sayfası tamamen `/api/notifications` uç noktasına bağlandı.

### D. Veritabanı Bağlantı Havuzu (`PrismaClient` Singleton) İyileştirmesi
- **Önceki Sorun:** Birden fazla servis ve API dosyasında her çağrıda `new PrismaClient()` oluşturuluyor ve bazı yerlerde `prisma.$disconnect()` çağrılıyordu. Bu durum canlı ortamda MySQL `Too many connections` hatasına yol açma riski taşıyordu.
- **Yapılan Düzeltme:**
  - Aşağıdaki tüm dosyalarda yerel `new PrismaClient()` kullanımları kaldırılarak merkezi `lib/db.ts` (`import { prisma } from "@/lib/db"`) bağlantısına geçildi:
    - `lib/pdf-service.ts`
    - `app/api/invoices/pdf/generate/route.ts`
    - `app/api/business/suggestions/track/route.ts`
    - `app/api/business/[id]/service-type-impact/route.ts`
    - `lib/database/` altındaki `delivery-zones`, `e-fatura`, `route-assignments`, `routes`, `services`, `vehicles`, `whatsapp`
    - `lib/services/order-route-integration.ts`, `lib/whatsapp-order-integration.ts`
  - `business/suggestions/track` ve `business/[id]/service-type-impact` uçlarına oturum doğrulaması eklendi; işletme kimliği artık istemcinin gönderdiği başlıktan değil, oturumdan alınır.

### E. Android (Capacitor) İzinleri ve Paket Görünürlüğü (`android/app/src/main/AndroidManifest.xml`)
- **Önceki Sorun:** Manifest dosyasında yalnızca `INTERNET` izni bulunuyordu. Android 11+ (API 30+) cihazlarda uygulama içinden WhatsApp, telefon araması ve harita açılması için gereken `<queries>` tanımları ve kamera/konum izinleri eksikti.
- **Yapılan Düzeltme:**
  - `CAMERA` (QR/barkod okutma için) ve `ACCESS_NETWORK_STATE` izinleri eklendi. Kamera `uses-feature` tanımı `required="false"` olarak işaretlendi, böylece kamerasız tabletlerde Google Play kısıtlaması oluşmaz. Uygulamada konum kodu olmadığı için konum izinleri istenmez.
  - Android 11+ için `com.whatsapp`, `com.whatsapp.w4b` paketleri ve `tel:`, `mailto:`, `https:`, `geo:` şemaları `<queries>` bloğuna eklendi.

### F. Önceki Aşamada Tamamlanan Diğer Mimari Düzeltmeler
- **KDV Hesaplama Motoru (`lib/vat.ts`):** İşletme bazlı `vatRate` ve `pricesIncludeVat` ayarlarına göre KDV dahil/hariç ayrıştırma fonksiyonları eklendi ve fatura/sipariş oluşturma akışlarına entegre edildi.
- **Tip ve UI Düzeltmeleri:**
  - `prisma/schema.prisma` içinde karşılığı olmayan modelleri çağıran `app/api/business/recommendations/route.ts` kaldırıldı.
  - `components/ui/calendar.tsx` (`react-day-picker` v9 uyumu) ve `components/ui/dialog.tsx` (`showCloseButton` desteği) güncellendi.
  - `lib/database/business.ts`, `lib/database/e-fatura.ts` ve `lib/database/services.ts` içindeki tip ve `null` güvenliği hataları giderildi.

---

## 3. Son Yapılan Eklemeler (Yeni Özellikler)

### A. QR / Barkod Fiş, Halı Etiketi ve Hızlı Okutma Sistemi
Uçtan uca QR ve Barkod sistemi eklendi. QR ve barkod üretimi projenin kendi kodudur; kameradan QR çözmek için `jsqr` paketi kullanılır:

1. **QR & Code-128B Barkod Üreteci (`lib/qr-barcode.ts`, harici paket yok):**
   - `generateQRMatrix(text)`: ISO/IEC 18004 standardında (Galois Field $GF(2^8)$ Reed-Solomon hata düzeltmeli) vektörel QR kod matrisi üretir.
   - `encodeCode128B(text)`: El tipi lazer barkod okuyucular ve telefon kameraları için standart Code-128 (Subset B) 1D barkod dizisi üretir.
2. **Termal Müşteri Fişi & Halı Parça Etiketi Yazdırma (`components/orders/order-receipt-dialog.tsx`):**
   - **Müşteri Fişi (80mm Termal Uyumlu):** İşletme adı, sipariş numarası, tarih/teslim tarihi, müşteri bilgileri, kalemler, toplam tutar, QR Kod ve Code-128 barkod içerir.
   - **Halı / Ürün Etiketi Modu:** Siparişteki her bir kalem için ayrı parça etiketi (`Parça 1/N`, müşteri adı, telefon, ürün adı, büyük QR kod ve barkod) üretir; halı arkasına veya askıya zımbalamak için optimize edilmiştir.
   - `app/orders/[id]/page.tsx` sipariş detay sayfasına **"QR Fiş / Etiket Yazdır"** butonu olarak entegre edildi.
3. **Kamera ve El Terminali ile QR / Barkod Okutma (`components/orders/qr-barcode-scanner-dialog.tsx`):**
   - Mobil ve masaüstü kameralarından canlı QR (`jsqr`) ve Code-128 barkod (`BarcodeDetector` API, yalnızca HTTPS) okuma desteği sağlar.
   - USB barkod okuyucu (klavye emülasyonu) veya manuel fiş/sipariş numarası (`ORD-...`) girişi ile anında sipariş bulma ve `/orders/[id]` sayfasına yönlendirme yapar.
   - Tüm sayfalardan tek tıkla erişilebilmesi için üst menüye (`components/layout/header.tsx` -> **"QR Okut"**) ve sipariş detay sayfasına (`app/orders/[id]/page.tsx` -> **"QR / Barkod Okut"**) eklendi.
4. **Esnek Sipariş Sorgulama (`lib/database/orders.ts` -> `getOrderById`):**
   - `getOrderById` fonksiyonu artık yalnızca veritabanı `id` alanı ile değil, aynı zamanda `orderNumber` (`ORD-...`), `referenceCode` ve fiş QR'ındaki `trackingToken` ile de siparişi bulacak şekilde genişletildi (her zaman oturumdaki işletmeyle sınırlı).

### B. Üyeliksiz Müşteri Sipariş Takip Sayfası (`/takip/[code]`)
Son müşterilerin herhangi bir uygulama indirmeden veya üye olmadan siparişlerinin durumunu canlı izleyebilmeleri sağlandı:

1. **Halka Açık (KVKK Uyumlu) Takip API'si (`app/api/public/track/[code]/route.ts`):**
   - `GET /api/public/track/[code]` uç noktası kimlik doğrulaması gerektirmeden yalnızca siparişin rastgele `trackingToken` değeriyle sipariş durumunu sorgular. Sipariş numarası tahmin edilebildiği için takip anahtarı olarak kullanılmaz.
   - IP başına dakikada 30 sorgu sınırı vardır; yanıtlar `noindex` ve `no-store` başlıklarıyla döner, sayfa da arama motorlarına kapalıdır.
   - Personelin durum notları herkese açık yanıta eklenmez.
   - **KVKK / Gizlilik Koruması:** Müşterinin tam soyadını maskeler (`Ahmet Y.`), açık sokak/kapı adresini ve müşteri telefonunu dışarıya kapatır; yalnızca ilçe/şehir bilgisini, sipariş aşamasını, kalemleri, tutarı ve işletme iletişim bilgilerini döner.
2. **Müşteri Canlı Takip Arayüzü (`app/takip/[code]/page.tsx`):**
   - 5 aşamalı görsel ilerleme çubuğu (*Sipariş Alındı -> Yıkamada/İşlemde -> Teslimata Hazır -> Dağıtımda -> Teslim Edildi*).
   - Sipariş içeriği, toplam tutar ve tahmini teslim tarihi gösterimi.
   - İşletmeyi tek tıkla **Arama (`tel:`)** ve **WhatsApp'tan Bilgi Alma (`wa.me`)** butonları.
   - Takip kodu girmek için üst arama kutusu.
3. **Çift Yönlü QR Kod & WhatsApp Paylaşım Entegrasyonu:**
   - `components/orders/order-receipt-dialog.tsx`: Basılan fişin üzerindeki QR kod artık `${origin}/takip/${trackingToken}` adresini içerir. Müşteri kendi telefon kamerasıyla okuttuğunda doğrudan canlı takip sayfası açılır; esnaf uygulama içi QR okuyucuyla okuttuğunda ise otomatik olarak sipariş yönetim ekranı (`/orders/[id]`) açılır.
   - `app/orders/[id]/page.tsx`: Sipariş detay ekranına **"Takip Linki Kopyala"** ve **"WhatsApp Takip Gönder"** butonları eklendi. Pano kullanılamıyorsa bağlantı kopyalanmak üzere bir pencerede gösterilir.
   - Takip anahtarı olmayan eski siparişlere, sipariş detayı ilk açıldığında anahtar üretilir.
4. **Sipariş numarası:** Biçim `ORD-YYAAGG-XXXXXX` oldu (rastgele 6 karakter). Eski biçim işletme bazlı sayaç kullandığı için farklı işletmelerde aynı numarayı üretip benzersizlik kuralına takılabiliyordu.

### C. Android APK Derlemesi, Yerel Ağ (Wi-Fi) Kurulumu ve Veritabanı Çalıştırma
Google Play aşamasına geçmeden gerçek Android telefonda canlı test yapılabilmesi için APK derlendi ve yerel sunucu bağlantısı kuruldu:

1. **Capacitor Yerel Ağ Senkronizasyonu ve APK Üretimi:**
   - Bilgisayarın yerel Wi-Fi IP adresi (`http://192.168.1.113:3000`) ile `CAP_SERVER_URL=http://192.168.1.113:3000 npm run cap:sync` çalıştırıldı.
   - Android Studio JBR (`JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`) ve Android SDK (`ANDROID_HOME=C:\Users\Engin Dalga\AppData\Local\Android\Sdk`) kullanılarak `gradlew.bat assembleDebug` ile güncel `app-debug.apk` derlendi.
   - Telefondan kablosuz tek tıkla indirilebilmesi için APK dosyası `public/LaundryPro.apk` (`http://192.168.1.113:3000/LaundryPro.apk`) konumuna kopyalandı. APK yerel ağ adresini içerdiği için Git'e eklenmez (`.gitignore`: `*.apk`).
   - Ana dizinden (`laundry/`) doğrudan `npm.cmd run dev` çalıştırılabilmesi için kök dizine yönlendirici `package.json` eklendi.
2. **Taşınabilir MariaDB (Port 3307) Başlatma Komutu:**
   - Veritabanı `127.0.0.1:3307` portunda taşınabilir MariaDB üzerinden çalışmaktadır. Bilgisayar yeniden başlatıldığında veritabanını ayağa kaldırmak için `Temp/claude` altındaki `mariadb-11.4.4-winx64/bin/mysqld.exe` servisi `--port=3307` parametresiyle çalıştırılır. Bu klasör geçici dizinde olduğu için temizlenebilir; veritabanı klasörünün kalıcı bir konuma taşınması önerilir.
3. **Veritabanındaki Aktif Test Kullanıcıları (`prisma/seed.ts`):**
   - **İşletme Sahibi (OWNER):** `owner@laundrypro.com` / Şifre: `test123`
   - **Yönetici (MANAGER):** `manager@laundrypro.com` / Şifre: `test123`
   - **Çalışan (EMPLOYEE):** `employee@laundrypro.com` / Şifre: `test123`
   - **Sürücü (DRIVER):** `driver@laundrypro.com` / Şifre: `test123`

---

## 4. Planlanan Sıradaki Geliştirmeler (Roadmap)
1. **Cari / Veresiye Bakiye Takibi:** Müşteri bazlı kısmi ödeme ve kalan borç takibi.


---

### D. Cari / Veresiye Tahsilat Sistemi ve İletişim / Harita / GPS Tamamlamaları (Son Güncelleme)
1. **Cari / Veresiye ve Parçalı Ödeme API'si (`app/api/orders/[id]/payments/route.ts`):**
   - Sipariş bazlı tahsilat ekleme (`POST`), listeleme (`GET`) ve silme (`DELETE`) uç noktaları eklendi.
   - Yapılan ödemelere göre siparişin `paymentStatus` alanı otomatik olarak `PENDING`, `PARTIAL` (Kısmi Ödeme) veya `PAID` (Ödendi) durumuna güncellenir.
2. **Sipariş ve Müşteri Ekranlarında Kalan Borç Takibi (`app/orders/[id]/page.tsx` & `app/customers/[id]/page.tsx`):**
   - Sipariş detay sayfasına **"Tahsilat & Cari"** sekmesi, **"Tamamını Tahsil Et"** hızlı butonu ve WhatsApp/SMS bakiye hatırlatma butonları eklendi.
   - Müşteri detay sayfasına tüm siparişlerden hesaplanan **Toplam Kalan Borç (Veresiye)** kartı ve tek tıkla WhatsApp bakiye hatırlatma özelliği eklendi.
3. **Harita, GPS, SMS ve WhatsApp Düzeltmeleri:**
   - `lib/communication.ts` içine `sendSMS`, `openGoogleMapsLocation` ve `openGoogleMapsDirections` eklendi.
   - `components/orders/customer-info.tsx` ve `components/customers/customer-detail-modal.tsx` içindeki hatalı `wa.me/90...` numara birleştirmesi düzeltilerek merkezi `sendWhatsAppMessage` fonksiyonuna bağlandı.
   - Müşteri oluşturma (`app/customers/create/page.tsx`) ve düzenleme (`components/customers/customer-edit-form.tsx`) ekranlarına **"Mevcut Konumu Al (GPS)"** butonu eklendi; `AndroidManifest.xml` içine konum (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) ve `sms:`/`smsto:`/`com.google.android.apps.maps` izinleri eklendi.
   - Detaylı rapor için bkz: `GUNCEL_DURUM_VE_ANDROID_HAZIRLIK_RAPORU.md`.
