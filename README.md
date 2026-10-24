# Pasif Gelirim 💚 — DAHA FAZLASI MÜMKÜN.

Sürüm 0.1 (test). Kendi dijital işini adım adım kurmaya yardım eden Android uygulaması.

## Şu an neler çalışıyor

| Özellik | Durum |
|---|---|
| Karşılama, isim, ana ekran | ✅ |
| Paketler: Ücretsiz / Manuel / Yarı Otomasyon / CEO Modu | ✅ (**TEST modu**, gerçek ödeme yok) |
| Soru-cevapla gelir modeli seçimi (5 model, dürüstlük notlarıyla) | ✅ |
| 7'şer adımlık görev listesi, not alma, ilerleme çubuğu | ✅ |
| 💚 Sesli anlatım (+150 TL, cihazın kendi sesiyle) | ✅ (ödeme test) |
| Günlük 1 saatlik ücretsiz AI sohbet (sayaç, gece yarısı sıfırlanır) | ✅ (**demo yapay zekâ**) |
| Gelir-gider takibi | ✅ |
| Otomasyon: günlük plan hazırlama (Yarı Otomasyon, CEO) | ✅ (kural tabanlı) |
| CEO karar kartları (onayla / reddet) | ✅ |
| ↶ Geçmiş İşlemler: tamamlananlar + yalnızca en son yarım kalan proje | ✅ |
| Abonelik bitince: otomasyon durur, iş kullanıcıda kalır | ✅ |
| Verileri dışa aktarma / silme | ✅ |

## Henüz yok (Google Play'den önce yapılacak)

1. **Gerçek ödeme:** Google Play Faturalandırma (aylık abonelik). Fiyatlar henüz belirlenmedi.
2. **Gerçek yapay zekâ:** Anahtar uygulamanın içine konmaz; küçük bir sunucu (backend) gerekir. Süre sınırı da sunucuda tutulmalı (şu an cihazda tutuluyor, kolayca atlatılabilir).
3. **Hesap/giriş ve bulut kaydı:** Veriler şu an sadece cihazda (uygulama silinirse gider).
4. Gizlilik politikası, kullanım şartları, uygulama ikonu, Play mağaza kaydı.

## BlueStacks'te denemek

### Yol 1 — GitHub ile APK (önerilen, bilgisayara bir şey kurmadan)
1. github.com'da boş bir depo (repository) oluştur.
2. Bu klasörün içindekileri depoya yükle (`.github` klasörü dahil).
3. Depoda **Actions → "APK derle" → Run workflow**. 3-5 dakikada biter.
4. Bitince çıkan **pasif-gelirim-debug-apk** dosyasını indir, zip'ten çıkan `app-debug.apk`'yı BlueStacks penceresine sürükle.

### Yol 2 — Bilgisayarda derleme
Gerekenler: Node 20+, JDK 17, Android Studio (SDK için).
```
npm install
npx cap add android
npm run android:debug
```
APK: `android/app/build/outputs/apk/debug/app-debug.apk`

### Yol 3 — Sadece arayüzü hızlıca görmek
```
npm run serve
```
Sonra tarayıcıdan `http://localhost:5173` (BlueStacks içinden bilgisayara `http://10.0.2.2:5173` ile erişilebilir).

## Test
```
npm test          # iş mantığı testleri (17)
npm run test:e2e  # gerçek tarayıcıda uçtan uca (Playwright gerekir)
```

## Dosyalar
- `www/data.js` — gelir modelleri, görevler, sözlük, sorular
- `www/core.js` — iş kuralları (paketler, sınırlar, geçmiş, otomasyon)
- `www/app.js` — ekranlar
- `www/main.js` — olaylar, kayıt, sesli okuma
