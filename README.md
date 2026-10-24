# Pasif Gelirim — DAHA FAZLASI MÜMKÜN.

Sürüm 0.2 (test). Kendi dijital işini adım adım kurmaya yardım eden Android uygulaması.

## Neler çalışıyor

| Özellik | Durum |
|---|---|
| Logo: uygulama ikonu (uyarlanabilir + yuvarlak), açılış ekranı, uygulama içi logo | ✅ |
| Siyah / Açık / Sistem teması (üstteki ☀️/🌙 düğmesi ve Ayarlar) | ✅ |
| Sayfa geçiş animasyonları, kayan alt menü çizgisi, grafik animasyonları, konfeti | ✅ |
| **Kazanç herkese açık (ücretsiz):** gelir-gider kaydı, kategori, tarih, filtre | ✅ |
| **Gelir-Gider Grafikleri:** 7 gün / 30 gün / 12 ay, sütun grafiği, birikimli net çizgisi, gelir kaynakları ve gider dağılımı halkaları | ✅ |
| Aylık gelir hedefi ve ilerleme halkası | ✅ |
| Çalışma serisi ve 7 rozet | ✅ |
| Paketler: Ücretsiz / Manuel / Yarı Otomasyon / CEO Modu | ✅ (**TEST modu**, gerçek ödeme yok) |
| Soru-cevapla gelir modeli seçimi, 7 adımlık görevler, not alma | ✅ |
| 💚 Sesli anlatım (+150 TL, cihazın kendi sesiyle) | ✅ (ödeme test) |
| Günlük 1 saatlik ücretsiz AI sohbet, öneri düğmeleri, "yazıyor" animasyonu | ✅ (**demo yapay zekâ**) |
| Otomasyon planı ve CEO karar kartları | ✅ (kural tabanlı) |
| ↶ Geçmiş İşlemler (tamamlananlar + en son yarım kalan proje) | ✅ |
| Abonelik bitince otomasyon durur, iş kullanıcıda kalır | ✅ |
| Android geri tuşu, yardım/SSS ve gizlilik (taslak) sayfası | ✅ |
| JSON ve CSV dışa aktarma (APK'da paylaşma menüsü), verileri silme | ✅ |

## Henüz yok (Google Play'den önce)

1. **Gerçek ödeme:** Google Play Faturalandırma (aylık abonelik). Fiyatlar belirlenmedi.
2. **Gerçek yapay zekâ:** Anahtar uygulamaya konmaz; küçük bir sunucu gerekir. Süre sınırı da sunucuda tutulmalı (şimdi cihazda).
3. **Hesap/giriş ve bulut kaydı:** Veriler şimdilik yalnızca cihazda.
4. **Yüksek çözünürlüklü logo:** Elimizdeki logo 168×170 piksel. Play Store 512×512 ister; daha büyük bir sürümü `branding/logo.png` yerine konmalı.
5. Gizlilik politikası ve kullanım şartlarının hukuki olarak tamamlanması, Play mağaza kaydı.

## APK alma (GitHub, bilgisayara bir şey kurmadan)

Depodaki dosyaları bu klasörün içindekilerle değiştir (`.github/workflows/build-apk.yml` **değişmedi**, ona dokunma). Yükleyince **Actions** sekmesinde "APK derle" kendiliğinden çalışır; bitince **pasif-gelirim-debug-apk** dosyasını indir, içindeki `app-debug.apk`'yı BlueStacks'e sürükle.

Logo ikonları derleme sırasında `tools/apply_branding.py` ile otomatik üretilir (`package.json` içindeki `capacitor:sync:after` kancası).

### Bilgisayarda derleme
Node 20+, JDK 17, Android Studio gerekir.
```
npm install
npx cap add android
npm run android:debug
```

### Sadece arayüzü görmek
```
npm run serve     # http://localhost:5173
```

## Test
```
npm test          # iş mantığı testleri (27)
npm run test:e2e  # gerçek tarayıcıda uçtan uca (Playwright gerekir)
```

## Dosyalar
- `www/data.js` — gelir modelleri, görevler, sözlük, sorular
- `www/core.js` — iş kuralları (paketler, sınırlar, grafik verileri, hedef, seri, geçmiş, otomasyon)
- `www/app.js` — ekranlar ve SVG grafikler
- `www/main.js` — gezinme, olaylar, kayıt, tema, sesli okuma
- `branding/logo.png`, `tools/apply_branding.py` — ikon ve açılış ekranı üretimi
