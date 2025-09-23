# Sipariş Durumları, Akış ve Rota Entegrasyonu

Bu doküman, sipariş durumlarının anlamlarını, önerilen iş akışını, rota modülü ile olan ilişkisini ve gelecekte durum filtrelerinin hizmet türüne göre nasıl konfigüre edilebileceğini açıklar.

## Amaç
- Sipariş durumlarını sade ve anlaşılır hale getirmek
- Renk, ikon ve kısaltmalarla hızlı filtreleme deneyimi sağlamak
- Varsayılan olarak "Beklemede (PENDING)" durumunu göstermek
- Rota modülü ile doğru entegrasyonu garanti etmek
- Gelecekte hizmet türüne göre dinamik/özelleştirilebilir durum filtrelerini mümkün kılmak

## Durumlar ve Anlamları
- PENDING (Beklemede)
  - Yeni oluşturulan veya onay bekleyen siparişler
  - Renk: Amber, İkon: Clock
- CONFIRMED (Onaylandı)
  - Onaylanan, işleme alınmaya hazır siparişler
  - Renk: Yeşil/Mavi tonları, İkon: CheckCircle
- IN_PROGRESS (İşlemde)
  - Temizlik/işlem aşamasındaki siparişler
  - Renk: Mor, İkon: Sparkles
- READY_FOR_PICKUP (Alınmaya Hazır)
  - Müşteriden alınmaya hazır; pickup planlaması yapılacak
  - Renk: Camgöbeği/Teal, İkon: Package
- READY_FOR_DELIVERY (Dağıtıma Hazır)
  - Teslimata hazır; rota planlamasına dahil edilebilir
  - Renk: İndigo/Mavi, İkon: Truck
- OUT_FOR_DELIVERY (Dağıtımda)
  - Aktif dağıtımda; kurye üzerinde
  - Renk: Pembe/Rose, İkon: Truck
- DELIVERED (Teslim Edildi)
  - Müşteriye teslim edildi
  - Renk: Zümrüt/Yeşil, İkon: CheckCircle
- COMPLETED (Tamamlandı)
  - Teslim sonrası kapanış/muhasebe tamam
  - Renk: Yeşil, İkon: CheckCircle
- CANCELLED (İptal)
  - İptal edilen siparişler
  - Renk: Kırmızı, İkon: X

## Önerilen İş Akışı
1. PENDING → CONFIRMED (onay)
2. CONFIRMED → READY_FOR_PICKUP (müşteriden alma)
3. READY_FOR_PICKUP → IN_PROGRESS (işleme al)
4. IN_PROGRESS → READY_FOR_DELIVERY (teslimata hazırla)
5. READY_FOR_DELIVERY → OUT_FOR_DELIVERY (rota oluşturulduğunda)
6. OUT_FOR_DELIVERY → DELIVERED (teslim edildiğinde)
7. DELIVERED → COMPLETED (kapanış/muhasebe)

Not: Rota modülü yalnızca READY_FOR_DELIVERY ve sonrası statülerle çalışır. Bu statüye gelen siparişler "Rotalara Uygun" listesinde görünür.

## UI Kuralları (Kompakt Filtreler)
- Sekmelerde ikon + kısaltma kullanılır (mobilde baş harf: B, O, İ, A, D, Y, T, İ)
- Renkler durumlara göre sabitlenmiştir ve tüm ekranlarda tutarlıdır
- Sekmelerde adet rozetleri (Badge) görünür
- Durum kartelası (legend) modali, ikon/renk/kısa açıklamayı gösterir
- Kullanıcının seçtiği durum filtresi `localStorage` ile hatırlanır
- Varsayılan açılış filtresi: PENDING (Beklemede)

## Rota Modülü Entegrasyonu
- READY_FOR_DELIVERY: Rota planlamasına dahil edilebilir.
- OUT_FOR_DELIVERY: Aktif rotada; canlı dağıtım.
- DELIVERED: Teslim tamamlandı.
- Siparişler bu statülere geldiğinde rota ekranlarında görünür ve güncellemeler birbirini tetikler.

## Konfigüre Edilebilir Filtreler (Tasarım Önerisi)
Hizmet türüne göre (ör. `laundry`, `dry_cleaning`, `carpet_cleaning`) farklı durumlar veya sekme sıraları gerekebilir. Önerilen yapı:

- İşletme ayarlarına bir "Sipariş Durumu Yapılandırması" bölümü eklenir.
- Her hizmet türü için şu alanlar tanımlanır:
  - Görünür statü sekmeleri listesi
  - Sekme sırası (drag & drop)
  - İsteğe bağlı özel takma adlar (etiket)
  - Geçiş kuralları (hangi durumdan hangisine geçilebilir)
- Varsayılan değerler sistem tarafından sağlanır; kullanıcı isterse özelleştirir.

### Veri Modeli Önerisi
```
BusinessSettings {
  id: string
  businessId: string
  orderStatusConfigs: Array<{
    serviceType: string
    visibleStatuses: string[] // ör. ["PENDING","CONFIRMED",...]
    order: string[]           // sekme sırası
    aliases?: Record<string,string> // etiket değişimleri
    transitions?: Array<{ from: string; to: string }>
  }>
}
```

### API Önerisi
- GET/PUT `/api/settings/order-status-config`
- İzinler: işletme sahibi/yoneticisi
- Frontend: Ayarlar sayfasında konfigürasyon UI (sekme listesi, sıralama, geçiş kuralları)

## Uygulamada Mevcut Durum (Web)
- `backend/app/orders/page.tsx`: Varsayılan filtre PENDING, kompakt sekmeler, durum kartelası modali, `localStorage` ile filtre hatırlama eklendi.
- Durum renkleri ve ikonlar `statusLabels` ve `getStatusIcon` ile merkezi tanımlı.

## Mobil (Öneri)
- `mobile/src/screens/orders/OrdersScreen.tsx` ve `OrderStatusScreen.tsx` ekranlarında da aynı kompakt sekme/ikon/renk şeması uygulanabilir.
- Global bir "durum kartelası" modali eklenmesi önerilir.

## Sonraki Adımlar
- Ayarlarda "Sipariş Durumu Yapılandırması" arayüzünü geliştirmek
- API ve veri modeli eklemek, güvenlik/rol kontrolü eklemek
- Mobil uygulamada aynı arayüz ve kartelayı uygulamak
- Raporlama/istatistik ekranlarında yeni filtre şemasını kullanmak
 - Backend tarafında geçiş doğrulamasını zorunlu kılmak (middleware/servis katmanı ile)
