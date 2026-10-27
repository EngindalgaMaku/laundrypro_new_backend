# LaundryPro görsel kimliği: Berrak

Sakin, güven veren, iş odaklı bir panel. Düz renk, ince çizgi, tek vurgu rengi; geçiş ve emoji kullanılmaz.

## Logo

`components/brand/logo.tsx`

- `LogoMark`: Derin Mavi kare üzerinde çamaşır makinesi kapağı ve su dalgası. 24 px altında `simple` ile yalnız kapak halkası kullanılır.
- `Logo`: işaret ve "Laundry**Pro**" yazısı (Pro turkuaz). Koyu zeminde `inverted`.

Aynı çizim şu yerlerde de üretilir; logo değişirse hepsi güncellenmeli:

- `app/icon.tsx`, `app/apple-icon.tsx`, `app/favicon.ico` (16/32/48 px)
- `assets/` (Android ikon ve açılış ekranı kaynakları) → `npx capacitor-assets generate --android ...` (bkz. `docs/ANDROID.md`)

## Renkler

| Ad | Değer | Kullanım |
|---|---|---|
| Derin Mavi | `#0A5C99` | Ana renk, düğmeler (`primary`) |
| Turkuaz | `#0B7A70` | İkincil renk, "hazır" durumu (`secondary`, `success`) |
| Mürekkep | `#0E1A24` | Metin (`foreground`) |
| Zemin | `#F6F9FB` | Sayfa arka planı (`background`) |
| Gri | `#5B6B78` | İkincil metin (`muted-foreground`) |
| Kehribar | `#B45309` | Uyarı, "beklemede" (`warning`) |
| Kırmızı | `#B42318` | Hata, silme (`destructive`) |

Değişkenler `app/globals.css` içindeki `:root` bloğunda. Metin renkleri beyaz zeminde en az 4,5:1 kontrastı sağlar.

### Tailwind skala eşlemesi

Kodda sabit yazılmış Tailwind renk sınıfları (`bg-purple-600`, `from-pink-500`, `text-gray-500` …) `globals.css` başındaki `@theme` bloğuyla üç skalaya bağlanır:

- `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, `rose`, `sky` → marka mavisi
- `cyan`, `teal`, `emerald`, `green`, `lime` → turkuaz
- `gray`, `slate`, `zinc`, `neutral` → mürekkep grisi
- `red`, `orange`, `amber`, `yellow` değişmez (hata ve uyarı anlamı korunur)

Yeni kodda sabit renk sınıfı yerine `primary`, `secondary`, `muted`, `destructive` gibi anlamlı adları kullanın; eşleme, eski sınıflar temizlenene kadar geçici bir köprüdür.

## Yazı tipi

- **Geist**: başlık ve arayüz (`font-sans`)
- **Geist Mono**: sipariş numarası, tutar gibi hizalanması gereken sayılar (`font-mono`)

Ölçek: 32 · 24 · 18 · 16 · 14 · 12 px. Türkçe karakterlerin tamamını destekler.
