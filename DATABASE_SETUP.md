# Veritabanı Kurulum Rehberi

## 1. MySQL Veritabanı Kurulumu

### Yerel MySQL Kurulumu:

```bash
# Windows için XAMPP veya WampServer kurulumu
# macOS için Homebrew ile:
brew install mysql

# Linux için:
sudo apt-get install mysql-server
```

### Veritabanı Oluşturma:

```sql
CREATE DATABASE laundrypro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'laundry_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON laundrypro.* TO 'laundry_user'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Çevre Değişkenlerini Güncelleme

`.env` dosyasını güncelleyin:

```bash
# Veritabanı Bağlantısı
DATABASE_URL="mysql://laundry_user:secure_password@localhost:3306/laundrypro"

# JWT Secret (güçlü bir key oluşturun)
NEXTAUTH_SECRET="your-super-secure-jwt-secret-key-here"

# Uygulama URL'si
NEXTAUTH_URL="http://localhost:3000"
APP_URL="http://localhost:3000"

# E-posta Ayarları (opsiyonel)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# SMS/WhatsApp API (opsiyonel - Twilio)
TWILIO_ACCOUNT_SID="your-twilio-sid"
TWILIO_AUTH_TOKEN="your-twilio-token"
TWILIO_PHONE_NUMBER="+1234567890"
```

## 3. Prisma Veritabanı Kurulumu

```bash
# Paketleri yükleyin
npm install

# Prisma Client'i yeniden oluşturun
npx prisma generate

# Veritabanı şemasını oluşturun
npx prisma db push

# (Opsiyonel) Seed data ekleyin
npx prisma db seed
```

## 4. Geliştirme Sunucusunu Başlatma

```bash
npm run dev
```

## 5. Test Kullanıcısı Oluşturma

Uygulamayı başlattıktan sonra:

1. http://localhost:3000 adresine gidin
2. "Kayıt Ol" sekmesine geçin
3. İşletme bilgilerinizi girin:
   - İşletme Adı: Test Çamaşırhanesi
   - İşletme Tipi: Çamaşırhane
   - E-posta: test@test.com
   - Şifre: 123456
   - Telefon: 0555 123 45 67

## 6. Özellik Testleri

### Kimlik Doğrulama Testi:

- ✅ Kayıt olma
- ✅ Giriş yapma
- ✅ JWT token oluşturma
- ✅ Otomatik dashboard yönlendirme

### Müşteri İletişim Testi:

- ✅ Telefon arama (`tel:` protocol)
- ✅ WhatsApp mesaj gönderme
- ✅ E-posta gönderme (`mailto:` protocol)
- ✅ İletişim şablonları

### Rota Planlama Testi:

- ✅ Sipariş seçimi
- ✅ Rota optimizasyonu
- ✅ Google Maps entegrasyonu
- ✅ GPS koordinatları ile navigasyon

### Mobil Uyumluluk Testi:

- ✅ Responsive tasarım
- ✅ Touch-friendly butonlar
- ✅ Mobil menü sistemi
- ✅ Küçük ekranlarda düzen optimizasyonu

## Troubleshooting

### Veritabanı Bağlantı Hatası:

```bash
# MySQL servisinin çalışıp çalışmadığını kontrol edin
sudo systemctl status mysql

# Bağlantı testini yapın
npx prisma db pull
```

### JWT Token Hatası:

- `.env` dosyasında `NEXTAUTH_SECRET` değerinin ayarlandığından emin olun
- Güçlü bir secret key kullanın (minimum 32 karakter)

### Prisma Generate Hatası:

```bash
# Node modules'i temizleyin
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

## Önemli Notlar

1. **Güvenlik**: Production ortamında güçlü şifreler ve secret key'ler kullanın
2. **Performans**: Büyük veri setleri için database indexleme yapın
3. **Backup**: Düzenli veritabanı yedeği alın
4. **Monitoring**: API istekleri ve hataları loglayın

## İletişim Özellikleri

### Telefon Arama:

- Mobil cihazlarda otomatik olarak telefon uygulamasını açar
- `tel:+905551234567` formatında çalışır

### WhatsApp:

- `wa.me` API kullanır
- Önceden tanımlı mesaj şablonları
- Sipariş durumu bildirimleri

### E-posta:

- `mailto:` protocol ile sistem e-posta uygulamasını açar
- HTML formatında şablonlar
- Konu ve içerik ön tanımlı

### Rota Optimizasyonu:

- Öncelik bazlı sıralama
- GPS koordinatları ile hassas konum
- Google Maps API entegrasyonu
- Çoklu nokta navigasyon desteği
