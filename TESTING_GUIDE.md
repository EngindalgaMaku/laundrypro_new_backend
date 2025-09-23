# Test Rehberi - Temizlik Uygulaması

## 🚀 Hızlı Test Adımları

### 1. Proje Kurulumu

```bash
npm install
npx prisma generate
npm run dev
```

### 2. Kimlik Doğrulama Testi

#### A. Kayıt Olma:

1. http://localhost:3000 sayfasına gidin
2. **Kayıt Ol** sekmesine tıklayın
3. Aşağıdaki bilgileri girin:
   ```
   İşletme Adı: Test Çamaşırhanesi
   İşletme Tipi: Çamaşırhane (🧺)
   E-posta: test@test.com
   Şifre: 123456
   Telefon: 0555 123 45 67
   Adres: Test Mahallesi Test Caddesi No:1
   ```
4. **Hesap Oluştur** butonuna tıklayın
5. ✅ Otomatik olarak dashboard'a yönlendirilmelisiniz

#### B. Giriş Yapma:

1. Çıkış yapın (sağ üst menüden)
2. **Giriş Yap** sekmesine geçin
3. E-posta: test@test.com, Şifre: 123456
4. **Giriş Yap** butonuna tıklayın
5. ✅ Dashboard'a yönlendirilmelisiniz

### 3. Mobil Uyumluluk Testi

#### Responsive Test:

1. Tarayıcıda Developer Tools açın (F12)
2. Device Mode'a geçin (Ctrl+Shift+M)
3. Farklı cihazları test edin:
   - iPhone 12 Pro (390x844)
   - iPad (768x1024)
   - Samsung Galaxy S21 (360x800)

#### Touch Test Noktaları:

- ✅ Butonlar minimum 44px yükseklikte
- ✅ Menü öğeleri kolayca tıklanabilir
- ✅ Form alanları touch-friendly
- ✅ Navigation menüsü mobilde çalışıyor

### 4. İletişim Özellikleri Testi

#### Teslimat Rotası Planlayıcısı'na gidin:

1. Sol menüden **Teslimat** > **Rota Planlayıcısı**'na tıklayın

#### Müşteri İletişim Testleri:

1. **Telefon Arama Testi** 📞:

   - Müşteri kartındaki yeşil telefon butonuna tıklayın
   - ✅ Telefon uygulaması açılmalı (mobilde)
   - ✅ Tel protokolü çalışmalı: `tel:+905551234567`

2. **WhatsApp Testi** 💬:

   - Mavi WhatsApp butonuna tıklayın
   - ✅ WhatsApp Web açılmalı
   - ✅ Önceden tanımlı mesaj gelmeli
   - ✅ URL formatı: `https://wa.me/905551234567?text=...`

3. **E-posta Testi** 📧:
   - Turuncu e-posta butonuna tıklayın
   - ✅ E-posta uygulaması açılmalı
   - ✅ Konu ve içerik dolu gelmeli

### 5. Harita Entegrasyonu Testi

#### Harita Özellikleri:

1. **Tekil Adres Gösterimi**:

   - Müşteri kartındaki mavi harita butonuna tıklayın
   - ✅ Google Maps açılmalı
   - ✅ Müşteri adresi işaretli gelmeli

2. **Rota Optimizasyonu**:

   - Birkaç siparişi seçin (checkbox ile)
   - **Rotayı Optimize Et** butonuna tıklayın
   - ✅ Öncelik sırasına göre liste oluşmalı
   - ✅ Yüksek öncelik en üstte gelmeli

3. **Navigasyon Başlatma**:
   - Optimize edilmiş rotada **Navigasyonu Başlat** butonuna tıklayın
   - ✅ Google Maps Directions açılmalı
   - ✅ Çoklu waypoint'ler eklenmeli
   - ✅ GPS koordinatları kullanılmalı (varsa)

### 6. Responsive Design Test Checklist

#### Ana Sayfa (Login):

- ✅ Glassmorphism efekti çalışıyor
- ✅ Tab'lar mobilde düzgün görünüyor
- ✅ Form alanları responsive
- ✅ Butonlar touch-friendly

#### Dashboard:

- ✅ Sidebar mobilde açılıp kapanıyor
- ✅ Header responsive
- ✅ Kartlar mobilde düzgün diziliyor
- ✅ İstatistikler responsive grid'de

#### Rota Planlayıcısı:

- ✅ Müşteri kartları mobilde stack oluyor
- ✅ Butonlar iki satırda düzeniyor (mobilde)
- ✅ Harita butonları görünür kalıyor
- ✅ Optimize edilmiş rota listesi responsive

### 7. Browser Compatibility Test

Test edilecek tarayıcılar:

- ✅ Chrome (Desktop + Mobile)
- ✅ Firefox (Desktop + Mobile)
- ✅ Safari (Desktop + Mobile)
- ✅ Edge (Desktop)

### 8. Performance Test

#### Lighthouse Testi:

1. Chrome DevTools > Lighthouse
2. Test kategorileri:
   - ✅ Performance > 85
   - ✅ Accessibility > 90
   - ✅ Best Practices > 85
   - ✅ SEO > 80

#### Loading Test:

- ✅ İlk sayfa yüklenme < 3 saniye
- ✅ API response time < 1 saniye
- ✅ Route değişimleri smooth

### 9. Hata Senaryoları

#### Network Errors:

1. Internet bağlantısını kesin
2. Giriş yapmaya çalışın
3. ✅ Hata mesajı görünmeli: "Bağlantı hatası"

#### Validation Errors:

1. Boş form göndermeye çalışın
2. ✅ "Tüm zorunlu alanlar doldurulmalıdır" mesajı
3. Geçersiz e-posta formatı deneyin
4. ✅ Browser validation çalışmalı

#### JWT Token Expiry:

1. Developer Console'da localStorage'ı temizleyin
2. Dashboard'a gitmeye çalışın
3. ✅ Login sayfasına yönlendirilmeli

### 10. Production Readiness Checklist

#### Güvenlik:

- ✅ Şifreler bcrypt ile hashleniyor
- ✅ JWT token güvenli secret ile oluşturuluyor
- ✅ Sensitive data localStorage'da şifrelenmeli
- ✅ HTTPS kullanımı (production'da)

#### Performans:

- ✅ Database connection pooling
- ✅ API rate limiting (production için)
- ✅ Image optimization
- ✅ Bundle size optimization

#### Monitoring:

- ✅ Error logging sistemi
- ✅ API endpoint monitoring
- ✅ Database performance tracking

## 🐛 Bilinen Problemler & Çözümler

### Problem: "Prisma Client Error"

**Çözüm:**

```bash
npx prisma generate
npx prisma db push
```

### Problem: "JWT Secret Missing"

**Çözüm:**
`.env` dosyasında `NEXTAUTH_SECRET` değerini ayarlayın

### Problem: "Database Connection Failed"

**Çözüm:**

1. MySQL servisinin çalışıp çalışmadığını kontrol edin
2. `.env` dosyasında `DATABASE_URL` değerini kontrol edin

### Problem: "WhatsApp Link Çalışmıyor"

**Çözüm:**
Telefon numaralarının uluslararası format olduğundan emin olun (+90...)

## 📱 Mobil Test Notları

### iOS Safari:

- `tel:` ve `mailto:` protokolleri native uygulamaları açar
- WhatsApp installed ise `wa.me` links WhatsApp açar
- Touch events düzgün çalışır

### Android Chrome:

- Intent sistem ile native uygulamalar açılır
- Back button navigation desteklenir
- PWA kurulumu mümkün

### PWA Features (İsteğe bağlı):

- App-like experience
- Offline functionality
- Push notifications
- Home screen installation

Bu testleri tamamladıktan sonra uygulama production'a hazır olacaktır! 🚀
