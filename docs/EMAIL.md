# E-posta (SMTP) ve şifre sıfırlama

Şifre sıfırlama e-postaları SMTP ile gönderilir (`lib/mailer.ts`, `nodemailer`). Herhangi bir SMTP hesabı kullanılabilir: Gmail, Yandex, hosting e-postası ya da bir e-posta servisi.

## Ayarlar (`.env`)

```bash
SMTP_HOST=smtp.ornek.com
SMTP_PORT=587          # 465 kullanılıyorsa SMTP_SECURE=true
SMTP_SECURE=false
SMTP_USER=kullanici@ornek.com
SMTP_PASS=uygulama-sifresi
SMTP_FROM="LaundryPro <no-reply@ornek.com>"
NEXT_PUBLIC_APP_URL=https://uygulama.ornek.com   # e-postadaki bağlantının adresi
```

- Gmail'de normal şifre yerine **uygulama şifresi** gerekir (iki adımlı doğrulama açıkken Google hesabı > Güvenlik > Uygulama şifreleri).
- `SMTP_HOST` ya da `SMTP_FROM` boşsa geliştirme ortamında e-posta gönderilmez; mesaj ve bağlantı sunucu konsoluna yazılır. Yayında bu durumda istek hata olarak kaydedilir.
- Bağlantı adresi bilerek `NEXT_PUBLIC_APP_URL`'den alınır; isteğin Host başlığına güvenilmez.

## Akış

1. Giriş ekranında **Şifremi unuttum** → `/sifre-sifirla` sayfasında e-posta girilir (`POST /api/auth/forgot-password`).
2. Adres kayıtlıysa 1 saat geçerli, tek kullanımlık bir bağlantı gönderilir. Yanıt, adres kayıtlı olsun olmasın aynıdır.
3. Bağlantıdaki sayfada yeni şifre (en az 8 karakter) belirlenir (`POST /api/auth/reset-password`). Kullanıcının açık oturum kayıtları kapatılır.

Veritabanında token'ın kendisi değil SHA-256 özeti tutulur (`password_reset_tokens`). Deneme sınırı: IP başına saatte 10, e-posta başına saatte 3 istek; sayaç sunucu belleğindedir ve yeniden başlatmada sıfırlanır.

## Bilinen sınır

Uygulama JWT ile çalıştığı için şifre değişince daha önce verilmiş token'lar süreleri dolana kadar (en fazla 7 gün) geçerli kalır; oturum kayıtları kapatılır ama token'lar bu kayıtlara bakılarak doğrulanmıyor.
