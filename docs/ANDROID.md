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

1. Siteyi HTTPS bir adreste yayına alın.
2. Sunucu adresiyle senkronize edin; adres APK'nın içine yazılır:
   ```bash
   CAP_SERVER_URL=https://uygulama.ornek.com npm run cap:sync
   ```
3. Android Studio'da (`npm run cap:open`) **Build > Generate Signed App Bundle** ile imzalı `.aab` üretin. İmza anahtarını (keystore) güvenli bir yerde saklayın; kaybedilirse uygulama güncellenemez.

## İkonları yeniden üretme

`assets/` içindeki görselleri değiştirdikten sonra:

```bash
npx capacitor-assets generate --android --iconBackgroundColor '#3b82f6' --splashBackgroundColor '#ffffff' --splashBackgroundColorDark '#0f172a'
```
