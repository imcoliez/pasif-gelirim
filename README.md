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
| **Görev ve iş akışı motoru (Aşama 6):** sohbette hedef yazınca (proje sohbetinde) 6 adımlı görev planı TASLAĞI hazırlanır (demo: kural tabanlı şablon, gerçek model yazmaz); plan onaylanmadan hiçbir görev çalışmaz; her görevin adı, açıklaması, önceliği, durumu (Planlandı → Hazırlanıyor → Onay bekliyor → Devam ediyor → Tamamlandı / Başarısız / İptal), bağımlılıkları, çıktısı ve zaman damgalı işlem geçmişi vardır; düzenle / ertele / iptal / yeniden planla / sil; seçenekli karar kartları (garanti yok); para, yayımlama, mesaj, hesap, veri paylaşma/silme ve harici hesap işlemleri **bu sürümde bağlı değildir**: onaylansa bile yapılmaz, yalnızca taslak kalır ve ekran bunu açıkça yazar; tamamlanan önemli görevin sonucu hafızaya yalnızca ÖNERİ olarak sunulur; görevler projenin içinde tutulur (JSON yedeğiyle korunur, başka projeye karışmaz); paket bazlı yetenek tablosu altyapısı hazır (şimdilik dört pakette aynı, mevcut paketler değişmedi) | ✅ (altyapı gerçek; AI demo, harici işlem yok) |
| **NORA (Aşama 7):** Yapay Zekâ sekmesi NORA'nın merkezi: logo, ad, slogan (Düşünür. Öğrenir. Planlar. Geliştirir.), aktif proje, Hafıza ve Görev Merkezi bağlantıları, gerçek/demo durumu. NORA yeni bir motor değil, mevcut proje/hafıza/görev/onay/geçmiş motorlarını kullanan arayüz ve kimliktir; plan taslağı, onay ve harici işlem kuralları aynen geçerlidir. Sunucu tarafında sistem talimatı NORA'yı tanıtır ve NORA'nın işlem başlatmadığını söyler. Erişim paketle denetlenecek şekilde hazırlandı (`noraAccess`, `NORA_BY_PACKAGE`), ama **şu an uygulanmıyor** (`enforced:false`): gerçek abonelik/ödeme yok | ✅ (kimlik ve arayüz; AI demo) |
| **Not Defteri (Aşama 8):** Araçlar > Not Defteri (ayrı sekme yok; NORA ekranındaki kısayol aynı sistemi açar). Not oluştur/görüntüle/düzenle/sil (silme onaylı), arama, kategori ve proje filtresi, tarihe/başlığa göre sıralama, son düzenlenenler. 7 hazır kategori + özel kategori için mimari (`notebook.cats`, arayüzü henüz yok). Notlar `state.notebook` içinde, **proje hafızasından ayrı** bir veri türüdür; JSON yedeğine girer, eski yedekler (not alanı yok) açılır. Genel not projesizdir; proje notu yalnızca o projeyle görünür. Arşivlenen projenin notları korunur; proje silerken bağlı not varsa kullanıcı "genel notlara taşı" veya "notlarla sil" seçer, seçmeden hiçbir şey silinmez. Hassas bilgi içeren notlar (kart/IBAN, şifre vb.) işaretlenir ve NORA'ya gösterilmez. Notlar sunucuya hiçbir yolla gönderilmez. **NORA:** varsayılan olarak notları OKUYAMAZ (Not Defteri'nde açık izin ister); okuma kapsamı sohbet kapsamıyla aynıdır (genel sohbet → genel notlar, proje sohbeti → yalnızca o projenin notları). Not komutları (listele, son not, kaydet, düzenle öner, projeye bağla öner, görev öner, hafızaya aktar) tamamen yerelde çalışır; her değişiklik önce onay kartı olarak gösterilir. Görev önerisi Aşama 6'daki `proposePlan` ile TASLAK üretir (orada ayrıca onay gerekir). NORA not silmez. Özetleme gerçek AI gerektirir: kullanılamıyor diye açıkça söylenir; "düzenle" ve "projeye bağla" kural tabanlı demodur | ✅ (yerel; AI özellikleri demo/yok) |
| **Seçilen metni NORA'ya not al (Aşama 9):** uygulamanın kendi ekranlarında bir metni seçince (basılı tutma / üç dokunuş) küçük bir araç çubuğu çıkar: **NORA'ya Not Al**, **Not Defterine Kaydet**, **Kopyala**. Kaydetme ekranı seçilen metnin tamamını gösterir; başlık otomatik önerilir ve değiştirilebilir, kategori ve proje bağlantısı isteğe bağlıdır; "Kaydet" demeden hiçbir şey saklanmaz, "Vazgeç" hiçbir not bırakmaz. "NORA'ya Not Al" yolunda kategori ve (tek bir projeyle net eşleşme varsa) proje önerilir; bu öneriler **kural tabanlı demodur**, ekranda açıkça yazar, gerçek yapay zekâ analizi değildir ve mevcut notlarını okumaz. Aynı metin zaten bir notta varsa uyarır ("Yine de kaydet" / "Mevcut notu aç"). Kayıt Aşama 8'in `state.notebook` yapısına yazılır (yedeğe otomatik girer, NORA erişim izinleri aynen geçerlidir). **Teknik sınır:** yalnızca bu uygulamanın ana içeriğinde, kullanıcının kendi seçtiği metin için ve yalnızca sayfanın `selectionchange` olayıyla çalışır; başka uygulamayı/ekranı okuma, erişilebilirlik izni, arka plan izleme, mikrofon yoktur. Giriş kutuları, alt menü ve üst çubuk içindeki seçimde çubuk çıkmaz. Çubuk çıkmazsa (ör. bazı cihazlarda seçim menüsü farklıysa) metni kopyalayıp Not Defteri > Yeni not'a yapıştırmak her zaman çalışır | ✅ (Chromium'da test edildi; gerçek Android WebView'da denenmedi) |
| **Arayüz iyileştirmeleri (Aşama 10):** (1) **Görev Merkezi:** her görevde numaralı yatay aşama göstergesi (daireler + aralarında dolan çizgiler, biten aşama ✓, devam eden aşama neon yeşil, başlanmamışlar sade). Aşamalar görevin GERÇEK durumundan türetilir (`Core.taskStages`, salt okunur): onay gerektirmeyen görevde Plan → Hazırlık → Sonuç, onaylı görevde araya Onay girer; başarısız/iptal görev "durdu" olarak işaretlenir. (2) **Projeler:** belirgin yüzde + neon çubuk, kartta ve detayda aynı bileşen; yüzde mevcut `Core.progress` hesabından gelir. (3) **Gelir-Gider:** üç dilimli pasta (gelir / diğer giderler / mecburi harcamalar), tutarlar ve yüzdeler yanında, kayıt yoksa boş durum. Kayıt formunda tür seçilir: Gelir, Diğer gider, Mecburi harcama (kira, faturalar, zorunlu ödeme). Mecburi harcama, gider kaydının alt türüdür (`type:'out', kind:'must'`); toplam gider = diğer + mecburi, çift sayım yoktur. **Eski kayıtlar** olduğu gibi kalır: türsüz giderler "diğer gider" sayılır, asla mecburiye tahmin edilmez (veri geçişi gerekmedi; alan yalnızca mecburi kayıtta saklanır, eski yedekler ve eski sürümler uyumlu). Kullanıcı eski kaydı düzenleyip türünü değiştirebilir. Tekrarlayan kayıtlar da mecburi olabilir. (4) **Gelir hedefi:** pastadan bağımsız ayrı kart: büyük gerçek yüzde, neon çubuk (görsel olarak %100'de durur, aşımda gerçek oran gösterilir), hedef / gerçekleşen / kalan (veya aşan) tutar. Yalnızca bu ayın gerçekleşen gelirinden hesaplanır (gider katılmaz); hedef yoksa hedef girişi gösterilir | ✅ (Chromium'da test edildi; gerçek cihazda denenmedi) |
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


## NORA: mimari ve ileride başka uygulamalara taşıma

NORA bir **marka ve asistan kimliğidir**; temel bir yapay zekâ modeli değildir. Kullanıcı yalnızca NORA'yı görür, arkadaki model sağlayıcısı ayrıdır.

- **İstemci (`www/`)** sağlayıcıyı bilmez. Tek bağlantı noktası `www/config.js` içindeki `API_URL`'dir (Worker adresi). NORA'nın adı, sloganı, erişim tablosu ve demo yanıtları `www/core.js` içindeki `NORA*` tanımlarındadır.
- **Sunucu (`server/worker.mjs`)** sağlayıcıyı bir "sağlayıcı katmanı" (`PROVIDERS`) arkasında tutar: her sağlayıcı üç işlev tanımlar (`hasKey`, `request`, `parse`). Şimdilik yalnızca `anthropic` var ve çalışan bağlantı değişmedi. Başka bir sağlayıcıya geçmek için yeni bir giriş eklenir ve `PROVIDER` ortam değişkeni ayarlanır; istemci, NORA kimliği ve testler aynı kalır. Bilinmeyen `PROVIDER` değeri varsayılana düşer. Bu, tam bir soyutlama sistemi değil, bilerek küçük tutulmuş bir hazırlıktır; ikinci bir sağlayıcı eklenmedi ve denenmedi.
- **Başka uygulamalara entegrasyon hedefi:** NORA'yı ileride başka uygulamalara taşımak için (1) kimlik ve sistem talimatı, (2) Worker uç noktası (`/chat`, `/health`) ve (3) görev/onay/hafıza kuralları ayrı katmanlardır. Başka bir uygulama aynı Worker'ı çağırıp kendi bağlam özetini gönderebilir; görev ve onay motoru (`core.js`) bağımsız bir modüldür. Bu taşıma henüz yapılmadı; yalnızca mimari buna engel olmayacak şekilde tutuldu.
- **Paket erişimi:** `noraAccess(state)` ekranların tek kontrol noktasıdır. Paket yetkisine bağlamak için `NORA_ENFORCED` ve `NORA_BY_PACKAGE` değişir; ödeme/abonelik (Play Billing) ayrı bir iştir ve yapılmadı.
