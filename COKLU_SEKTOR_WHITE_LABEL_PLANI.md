# Çoklu Sektör (Vertical SaaS / White-Label) Genişleme ve Klonlama Planı

Bu doküman, **LaundryPro** çekirdek altyapısının tek bir kod tabanı üzerinden farklı esnaf ve saha hizmeti sektörlerine uyarlanarak Google Play Store'da **sektöre özel ayrı uygulamalar (Micro-SaaS)** halinde yayınlanması stratejisini ve teknik mimarisini içerir.

---

## 1. Neden Tek Altyapıdan Çoklu Sektöre Çıkıyoruz?

Mevcut kod tabanındaki çekirdek motor (Core Engine) aslında yalnızca çamaşırhane/halı yıkama değil, **5 temel aşamadan oluşan tüm esnaf operasyonlarını** karşılamaktadır:

1. **Müşteri & Cari Yönetimi (CRM):** Müşteri kaydı, adres, konum, geçmiş siparişler.
2. **Saha & Rota Operasyonu:** Adresten teslim alma (Pickup) -> Atölye/Dükkan işlemi -> Adrese teslimat (Delivery).
3. **İş Emri, QR/Barkod Fiş & Parça Takibi:** Ürünün aşamaları (*Alındı -> İşlemde -> Hazır -> Dağıtımda -> Teslim Edildi*) ve QR/Barkod etiketleme.
4. **Esnek Fiyatlandırma & Fatura:** Adet, $m^2$, kg veya sabit fiyat hesabı, KDV, PDF fiş/fatura.
5. **Otomatik Müşteri İletişimi:** WhatsApp ve SMS üzerinden tek tıkla durum bildirimi (*"Ürününüz hazır"*, *"Yola çıktık"*).

---

## 2. Hedef Sektörler ve Uyarlama Tablosu

| # | Sektör & Uygulama Adı Önerisi | Uyarlama Süresi | Esnafın En Büyük Acı Noktası | Pazar & Gelir Potansiyeli |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Terzi, Tadilat & Lostra (Ayakkabı Bakım)**<br>`LostraPro` / `TerziPro` | **1 - 2 Gün** | Kağıt fişlerin kaybolması, tamirdeki ayakkabı/kıyafetlerin karışması, hazır olunca müşteriye tek tek haber verme derdi. | Modern mobil rakip neredeyse sıfır. QR etiket ve *"Ayakkabınız hazır"* WhatsApp mesajı doğrudan satış yaptırır. |
| **2** | **Oto Kuaför, Yıkama & Detailing**<br>`AutoCarePro` / `OtoDetayPro` | **3 - 4 Gün** | Plakadan geçmiş işlemleri görme, seramik/boya koruma takibi, işlem bitince *"Aracınız hazır"* WhatsApp bildirimi. | Esnafın teknolojiye ödeme isteği çok yüksek (Aylık ₺1.000 - ₺1.500 abonelik bandı). |
| **3** | **Su, Damacana & Tüp Dağıtım Bayileri**<br>`BayiRotaPro` / `SuTupPro` | **3 - 4 Gün** | Siparişin kuryeye/şoföre anında düşmesi, adres tarifi ve rota optimizasyonu, veresiye/emanet damacana takibi. | Mevcut programlar 2000'lerden kalma masaüstü yazılımları; mobil öncelikli uygulama büyük avantaj sağlar. |
| **4** | **Pet Kuaför & Pet Taksi**<br>`PetGroomPro` | **4 - 5 Gün** | Evcil hayvanı adresten alıp tıraş/banyo sonrası geri teslim etme, aşı/tıraş periyodu hatırlatma. | Lüks ve hızla büyüyen segment; yüksek abonelik ücreti ödeyebilen müşteri kitlesi. |
| **5** | **Teknik Servis (Kombi, Klima, Beyaz Eşya)**<br>`TeknikServisPro` | **1 - 2 Hafta** | Arıza kaydı, cihaz fotoğrafı, değişen parça/işçilik fişi, teknisyen saha rotası ve bakım zamanı hatırlatma. | Türkiye'deki en geniş saha hizmeti pazarı; çok yüksek kullanıcı hacmi. |

---

## 3. Neden "Tek Genel Uygulama" Yerine "Sektöre Özel Ayrı Uygulamalar"?

1. **Mağaza Aramalarında (ASO) %300 Daha Yüksek Organik İndirme:**
   - Bir oto yıkamacı Play Store'da *"Genel İşletme Programı"* diye arama yapmaz; **"Oto yıkama takip programı"** yazar.
   - Bir lostracı **"Ayakkabı tamir fiş programı"** veya **"Terzi takip"** yazar.
   - Uygulamanın adı, ikonu ve ekran görüntüleri doğrudan o esnafın mesleğine hitap ettiğinde reklamsız organik indirme oranı 4-5 kat artar.
2. **Psikolojik Sahiplenme ve Fiyatlandırma Gücü:**
   - Esnaf kendi mesleğine özel terimler (*Plaka No*, *Kumaş/Tadilat*, *Damacana Adedi*) gördüğünde yazılımın kendisi için özel üretildiğini hisseder ve aylık aboneliği çok daha rahat öder.

---

## 4. Teknik Mimari: Tek Kod Tabanından Çoklu Uygulama Nasıl Çıkarılır?

Her sektör için projeyi kopyalayıp ayrı ayrı bakım yapmak yerine **Konfigürasyon Tabanlı White-Label Mimari** kullanılır:

### A. Sektörel Terimler Sözlüğü (`lib/sector-config.ts`)
Uygulama içindeki metinler, seçilen sektöre (`SECTOR_MODE`) göre dinamik gelir:

| Kavram | Halı & Çamaşır (`LAUNDRY`) | Oto Kuaför (`AUTO_DETAIL`) | Terzi & Lostra (`TAILOR_SHOE`) | Teknik Servis (`TECH_SERVICE`) |
| :--- | :--- | :--- | :--- | :--- |
| **Sipariş Birimi** | Halı / Çamaşır | Araç / Plaka | Ürün / Parça | Cihaz / Arıza Kaydı |
| **Birim Ölçüsü** | $m^2$ / Kg / Adet | Paket / İşlem | Adet / Tadilat | İşçilik + Yedek Parça |
| **Etiket Başlığı** | Halı Parça Etiketi | Araç Anahtarlık Etiketi | Ürün Askı/Raf Etiketi | Cihaz Servis Etiketi |
| **Durum: İşlemde** | Yıkamada / Kurutmada | Uygulamada / Yıkamada | Tadilatta / Bakımda | Onarımda / Parça Bekliyor |
| **Durum: Hazır** | Teslimata Hazır | Aracınız Teslime Hazır | Ürününüz Hazır | Cihazınız Onarıldı |

### B. Tema ve Görsel Kimlik Ayrımı
- **LaundryPro (Halı/Çamaşır):** Mavi / Turkuaz (`#3b82f6`) — Temizlik ve ferahlık hissi.
- **AutoCarePro (Oto Kuaför):** Koyu Antrasit / Kırmızı (`#ef4444`) — Otomotiv ve hız hissi.
- **LostraPro (Terzi/Ayakkabı):** Koyu Kahve / Altın Kehribar (`#d97706`) — Zanaat ve deri/kumaş hissi.
- **TeknikServisPro (Servis):** Lacivert / Turuncu (`#f97316`) — Teknik ve mühendislik hissi.

### C. Capacitor ile Çoklu Android Paketi Üretimi (`capacitor.config.ts`)
Çevre değişkenleri (`APP_VARIANT`) ile tek komutla farklı Play Store paketleri üretilir:
- `com.engindalga.laundrypro` -> **LaundryPro: Halı & Kuru Temizleme**
- `com.engindalga.autopro` -> **AutoPro: Oto Yıkama & Detailing**
- `com.engindalga.lostrapro` -> **LostraPro: Terzi & Ayakkabı Bakım**
- `com.engindalga.servispro` -> **ServisPro: Teknik Servis Takip**

---

## 5. Reklamsız (Organik) Büyüme ve Gelir Stratejisi

### A. Sıfır Reklam Bütçesiyle İlk Müşterileri Kazanma
1. **ASO (Play Store Anahtar Kelime Hakimiyeti):** Her sektör için mağaza başlığı ve açıklamasında doğrudan esnafın aradığı kelimeleri kullanmak.
2. **Müşteri Fişinden Viral Yayılım:** Müşteriye WhatsApp'tan giden mesajın ve basılan QR fişin en altında küçük bir *"Bu işletme [Uygulama Adı] kullanmaktadır"* imzası.
3. **Sektörel WhatsApp / Facebook Esnaf Grupları:** Halı yıkamacılar, oto detailingciler ve kombi servislerinin yardımlaşma gruplarında 30 saniyelik *"QR okut -> WhatsApp mesajı gönder"* ekran kaydı paylaşımı.

### B. Gelir Modeli ve Hedef Projeksiyon
1. **Freemium Giriş:** Aylık ilk 30-50 sipariş ücretsiz (Esnafı içeri alıp fiş ve müşteri kaydı oluşturmasını sağlamak).
2. **PRO Abonelik (Aylık Düzenli Gelir - MRR):**
   - 50 Halı Yıkamacı × ₺750/ay = **₺37.500 / ay**
   - 40 Oto Kuaför × ₺1.000/ay = **₺40.000 / ay**
   - 40 Terzi & Lostra × ₺500/ay = **₺20.000 / ay**
   - 30 Teknik Servis × ₺1.000/ay = **₺30.000 / ay**
   - **Toplam (160 Küçük İşletme):** **~₺127.500 / ay** düzenli abonelik geliri.
3. **Ek Gelir:** WhatsApp Business API otomatik bildirim kontörü ve e-Fatura kontör komisyonu.

---

## 6. Uygulama Yol Haritası (Adım Adım)

1. **Faz 1 (Mevcut):** `LaundryPro` uygulamasını Play Store'da yayınlayıp ilk 10-20 halı yıkama/çamaşırhane işletmesinde sahada test etmek.
2. **Faz 2:** Çekirdek özelliklere **Üyeliksiz Müşteri Sipariş Takip Linki** ve **Veresiye/Cari Bakiye** modülünü eklemek.
3. **Faz 3:** `lib/sector-config.ts` yapısını kurup ilk klon uygulama olarak **Oto Kuaför (`AutoPro`)** ve **Terzi/Lostra (`LostraPro`)** paketlerini Play Store'a sürmek.
