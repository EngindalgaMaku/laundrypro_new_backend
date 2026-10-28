# Android uygulaması (Capacitor)

Android uygulaması, yayındaki Next.js sitesini Capacitor ile açar. API rotaları sunucuda çalıştığı için site uygulamanın içine gömülmez; uygulama `CAP_SERVER_URL` adresini yükler.

- Uygulama kimliği: `com.engindalga.laundrypro` (Play Store'a yüklendikten sonra değiştirilemez)
- Yapılandırma: `capacitor.config.ts`
- Çevrimdışı sayfa: `capacitor/offline.html` (sunucuya ulaşılamazsa gösterilir)
- Yerel entegrasyon: `components/providers/capacitor-provider.tsx` (geri tuşu, durum çubuğu, açılış ekranı; tarayıcıda hiçbir şey yapmaz)
- İkon ve açılış ekranı kaynakları: `assets/`

## Gereksinimler

- Android Studio ve Android SDK (API 36)
- JDK 21. Android Studio'nun kendi JDK'sı 25 ise Gradle derlemesi `Unsupported class file major version 69` hatası verir; `JAVA_HOME` değişkenini bir JDK 21'e yönlendirin (örneğin `~/.jdks/jbr-21.x`).

## Emülatörde geliştirme

Varsayılan sunucu adresi `http://10.0.2.2:3000`; bu adres emülatörden bilgisayardaki `npm run dev` sunucusuna gider.

```bash
npm run dev
npm run cap:sync
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Gerçek bir telefonda denemek için `CAP_SERVER_URL` değişkenine bilgisayarın yerel ağ adresini verin (örneğin `http://192.168.1.20:3000`) ve yeniden senkronize edin.

## Yayın derlemesi

Siteye konan ve Play Store'a yüklenen sürüm **release** olmalıdır. Debug sürüm `debuggable` işaretlidir: bağlanan herkes uygulamanın içini (oturum bilgileri dahil) inceleyebilir.

### 1. İmza anahtarını bir kez oluşturun

`android/` klasöründe çalıştırın; şifreleri komut size sorar:

```bash
keytool -genkeypair -v -keystore laundrypro-upload.jks -alias laundrypro -keyalg RSA -keysize 2048 -validity 10000
```

Sonra `android/keystore.properties` dosyasını oluşturun:

```properties
storeFile=../laundrypro-upload.jks
storePassword=…
keyAlias=laundrypro
keyPassword=…
```

`*.jks` ve `keystore.properties` Git'e girmez (`android/.gitignore`). **İkisinin de yedeğini alın:** anahtar kaybolursa Play Store'daki uygulama bir daha güncellenemez.

### 2. Derleyin

Varsayılan sunucu adresi `https://laundry.kodleon.com`; senkronizasyon bu adresi uygulamaya yazar.

```bash
npm run cap:sync
cd android
./gradlew assembleRelease bundleRelease -PversionCode=2 -PversionName=1.1
```

PowerShell'de sürüm parametrelerini tırnağa alın, yoksa noktalardan bölünür: `.\gradlew.bat assembleRelease bundleRelease "-PversionCode=2" "-PversionName=1.1"`. Gradle için `JAVA_HOME` bir JDK 21'i, `ANDROID_HOME` Android SDK'yı göstermelidir; JDK'da gelen `keytool` da `%JAVA_HOME%\bin` içindedir.

- `app/build/outputs/apk/release/app-release.apk`: siteden indirilecek APK (`public/LaundryPro.apk` olarak kopyalanır)
- `app/build/outputs/bundle/release/app-release.aab`: Play Store'a yüklenecek paket

Her yeni sürümde `versionCode` bir artırılmalı (Play aynı numarayı kabul etmez). `keystore.properties` yoksa release çıktısı imzasız kalır ve kurulamaz.

## İkonları ve açılış ekranını yeniden üretme

Logo çizimi `lib/brand-mark.json` içindedir (bkz. `docs/BRAND.md`). Değiştirdikten sonra:

```bash
node scripts/render-brand-assets.mjs
npx capacitor-assets generate --android
```

Android 12 ve sonrası açılışta `res/drawable/splash_icon.xml` animasyonunu (marka mavisi üzerinde önce harf, sonra dalga) gösterir; eski sürümler `splash.png` görselini kullanır.
