# Pasif Gelirim — DAHA FAZLASI MÜMKÜN.

Sürüm 1.0 (test). Kendi dijital işini adım adım kurmaya yardım eden Android uygulaması.

## Neler çalışıyor

| Özellik | Durum |
|---|---|
| Yeni logo: uygulama ikonu (uyarlanabilir + yuvarlak), açılış ekranı, uygulama içi logo | ✅ |
| Profesyonel görünüm: çizgi simgeli alt menü (hap biçimli seçili durum), sakin renk paleti, emoji yok | ✅ |
| İlk açılış tanıtımı (3 sayfa) | ✅ |
| Ana ekran yenilendi: büyük net kartı + grafik, aylık gelir/gider ve geçen aya göre değişim, son işlemler | ✅ |
| Başlangıç adımları kontrol listesi (ana ekran) | ✅ |
| Kayıt düzenleme, kayıtlarda arama, aylık gider bütçesi (aşım uyarısı) | ✅ |
| Hesaplayıcı: hedef net gelire kaç satış gerekir (komisyon ve maliyet dahil) | ✅ |
| Sözlük: aranabilir terim listesi | ✅ |
| Planlar: tekrarlayan kayıtlar (aylık/haftalık), birikim hedefleri, vergi payı hatırlatıcısı, işe göre net | ✅ |
| Ana sayfada harcama dağılımı pastası | ✅ |
| Profil fotoğrafı (kare kırpılır, cihazda saklanır) | ✅ |
| Özelleştirme: vurgu rengi (6 hazır + özel), yazı boyutu, köşe stili, animasyon açık/kapalı, ana ekran bölümleri | ✅ |
| Piyasa sayfası: dolar, euro, sterlin, frank, gram/ons altın (yaklaşık), 5 kripto; 7/30/90 gün grafik, TL çevirici | ✅ (canlı kaynaklar sandbox dışında denenmedi) |
| **Çok dilli arayüz:** Türkçe, English, Deutsch, Español, Русский, العربية (sağdan sola düzen dahil); cihaz diline göre otomatik açılır, Ayarlar'dan değişir, sayılar dile göre biçimlenir | ✅ |
| **Para birimi seçimi:** TL, USD, EUR, GBP, CHF, RUB, SAR, AED (ilk açılışta ve Ayarlar'da). Yalnızca gösterim etiketidir, tutarlar dönüştürülmez; Piyasa sayfası TL kalır | ✅ |
| Canlı yapay zekâ sohbeti seçilen dilde cevap verir (sunucu kurulunca) | ✅ |
| PIN kilidi (4 haneli, özetlenmiş saklama, 5 yanlışta 30 sn bekleme, arka plandan dönünce yeniden sorar) | ✅ |
| Günlük hatırlatıcı bildirimi (yalnızca APK) | ✅ (cihazda denenmedi) |
| Yedekten geri yükleme (JSON), tanılama bilgisi, aylık özet kartı, hızlı gelir/gider ekle | ✅ |
| Siyah / Açık / Sistem teması (üstteki düğme ve Ayarlar) | ✅ |
| Sayfa geçiş animasyonları, grafik animasyonları, sade konfeti | ✅ |
| **Kazanç herkese açık (ücretsiz):** gelir-gider kaydı, kategori, tarih, filtre | ✅ |
| **Gelir-Gider Grafikleri:** 7 gün / 30 gün / 12 ay, sütun grafiği, birikimli net çizgisi, gelir kaynakları ve gider dağılımı halkaları | ✅ |
| Aylık gelir hedefi ve ilerleme halkası | ✅ |
| Çalışma serisi ve 7 rozet | ✅ |
| Paketler: Ücretsiz / Manuel / Yarı Otomasyon / CEO Modu | ✅ (**TEST modu**, gerçek ödeme yok) |
| Soru-cevapla gelir modeli seçimi, 7 adımlık görevler, not alma | ✅ |
| **Projelerim (v1.1):** en fazla 4 proje, aktif proje seçme, proje başına ilerleme ve net, proje dışa aktarma (JSON) | ✅ |
| **Model kartları (v1.1):** başlangıç maliyeti, zorluk, gereken beceriler, risk; bütçesi yetmeyen kullanıcıya bütçe isteyen model önerilmez ("şimdilik önerilmeyenler", nedeniyle) | ✅ |
| **Görevlerde Okudum / Anladım / Tamamladım (v1.1)** aşamaları | ✅ |
| **Piyasa para birimi:** fiyatlar seçili para birimine göre gösterilir (TRY, USD, EUR, GBP, CHF, SAR, AED, RUB); kur alınamazsa USD ile gösterilir ve söylenir. Grafiklerde parmakla gezdirince tarih/değer ipucu | ✅ |
| **Sabit imza (APK güncelleme):** derlemeler artık sabit debug anahtarıyla imzalanır ve sürüm numarası her derlemede artar; böylece yeni APK eskisinin üstüne kurulur (`signing/`, `tools/setup_signing.js`) | ✅ |
| **Proje yönetimi (Aşama 3):** projeler ekranı (durum, gelir-gider, görev ilerlemesi, paket), proje ayrıntısı, ad/açıklama/hedef/not düzenleme, arşiv ve onaylı silme, en fazla 4 aktif proje, paketi projeye atama/taşıma (test modu), eski kayıtları açık onayla projeye bağlama | ✅ |
| **Proje bazlı yapay zekâ hafızası (Aşama 4):** her projenin kendi hafızası (hedef, karar, tercih, not, son nokta) proje kaydının içinde ve yalnızca cihazda tutulur; görüntüle / ekle / düzenle / "eski say" / sil / tümünü temizle (onaylı); sohbette önemli görünen cümle için "Kaydedeyim mi?" kartı (onay olmadan hiçbir şey saklanmaz); şifre, PIN, kart/IBAN, kimlik no saklanmaz; proje sohbeti ve genel sohbet ayrı; JSON yedeği hafızayı korur; arşiv/silme yalnızca o projenin hafızasını etkiler. **Sohbet hâlâ demo yapay zekâdır** (gerçek model bağlı değil); sunucuya özet gönderme ayarı varsayılan kapalıdır ve yalnızca sunucu bağlanırsa işler | ✅ (hafıza gerçek; AI demo) |
| **Alt menü (Aşama 2):** yüzen kapsül, 5 sekme (Ana Sayfa, Projeler, Yapay Zekâ, Araçlar, Hesabım); aktif sekme simge + adla genişler. Araçlar ve Hesabım giriş ekranlarıyla mevcut ekranlara erişim korunur | ✅ |
| 💚 Sesli anlatım (+150 TL, cihazın kendi sesiyle) | ✅ (ödeme test) |
| Günlük 1 saatlik ücretsiz AI sohbet, öneri düğmeleri, "yazıyor" animasyonu | ✅ (**demo yapay zekâ**) |
| Otomasyon planı ve CEO karar kartları | ✅ (kural tabanlı) |
| ↶ Geçmiş İşlemler (tamamlananlar + en son yarım kalan proje) | ✅ |
| Abonelik bitince otomasyon durur, iş kullanıcıda kalır | ✅ |
| Android geri tuşu, yardım/SSS ve gizlilik (taslak) sayfası | ✅ |
| JSON ve CSV dışa aktarma (APK'da paylaşma menüsü), verileri silme | ✅ |

## Henüz yok (Google Play'den önce)

1. **Gerçek ödeme:** Google Play Faturalandırma (aylık abonelik). Fiyatlar belirlenmedi.
2. **Gerçek yapay zekâ (Aşama 5):** Kod ve testler hazır ama **canlıya alınmadı**: anahtar, Cloudflare hesabı ve Worker kurulumu sende (`server/README.md`). `www/config.js` içindeki `API_URL` boşken sohbet demo modundadır. Sunucu hazır olsa bile kullanıcı "Gerçek yapay zekâyı aç" demeden ücretli istek gitmez. Sohbet ekranı gerçek/demo durumunu ve her yanıtın kaynağını (Demo yanıt / Yapay zekâ yanıtı) gösterir. Süre sınırı cihazda, mesaj ve token sınırı sunucuda.
3. **Hesap/giriş ve bulut kaydı:** Veriler şimdilik yalnızca cihazda.
4. **Play Store simgesi:** `branding/logo.png` 1024 px; mağaza 512×512 PNG ister (buradan üretilebilir).
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
npm test          # iş mantığı testleri (73 çekirdek + sunucu, piyasa, çeviri)
npm run test:e2e  # gerçek tarayıcıda uçtan uca (Playwright gerekir)
```

## Dosyalar
- `www/data.js` — gelir modelleri, görevler, sözlük, sorular
- `www/core.js` — iş kuralları (paketler, sınırlar, grafik verileri, hedef, seri, geçmiş, otomasyon)
- `www/app.js` — ekranlar ve SVG grafikler
- `www/main.js` — gezinme, olaylar, kayıt, tema, sesli okuma
- `branding/logo.png`, `tools/apply_branding.py` — ikon ve açılış ekranı üretimi


## Çeviriler nasıl çalışır
Kaynak metinler Türkçedir. `tools/tr/<dil>.txt` (numara|çeviri) ve `tools/tr/{x,z,w}_<dil>.txt` (sonradan eklenenler; anahtarlar `new_keys/new3/new4.json`, `tools/mk_extra.js` içindeki SETS listesi; `node tools/mk_extra.js`) dosyalarından `node tools/build_lang.js` ile `www/lang/*.js` üretilir. Ekrana çizilen metinler sözlükle çevrilir; sözlükte olmayan metin (ör. kullanıcının kendi yazdıkları) olduğu gibi kalır. `npm test` her ekranın tüm dillerde eksiksiz çevrildiğini denetler. Yeni bir metin eklenince `node tools/extract_strings.js` ile listeyi yenileyip çevirisini eklemek gerekir; eksikse test başarısız olur. Bilinen sınır: demo yapay zekânın bazı cevapları ve sunucudan gelen hata metinleri Türkçe kalabilir.
