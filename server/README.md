# Yapay zekâ sunucusu kurulumu (Cloudflare Worker)

Bilgisayara program kurmadan, tarayıcıdan yapılır. Yaklaşık 15 dakika.

## 1) Claude API anahtarı
1. console.anthropic.com adresinde hesap aç, ödeme yöntemi ekle (kullandıkça ödenir).
2. **API Keys** bölümünden yeni anahtar oluştur ve kopyala. Kimseyle paylaşma, GitHub'a yükleme.
3. İlk günlerde Console'dan aylık harcama üst sınırı koy.

## 2) Worker oluştur
1. dash.cloudflare.com adresinde ücretsiz hesap aç.
2. **Workers & Pages → Create → Create Worker**. Adı: `pasif-gelirim-ai`. **Deploy** de.
3. **Edit code** ile açılan editörde her şeyi sil, `server/worker.mjs` dosyasının içeriğini yapıştır, **Deploy**.

## 3) Sayaç alanı (KV) ve anahtar
1. **Storage & Databases → KV → Create** ile `LIMITS` adında bir alan oluştur.
2. Worker'ın **Settings → Bindings → Add → KV namespace**: değişken adı `LIMITS`, az önceki alanı seç.
3. **Settings → Variables and Secrets → Add**: tür **Secret**, ad `ANTHROPIC_API_KEY`, değer: kopyaladığın anahtar.
4. İsteğe bağlı değişkenler (Text): `DEVICE_DAILY_MAX` (cihaz başına günlük mesaj, varsayılan 150), `GLOBAL_DAILY_MAX` (tüm kullanıcılar için günlük üst sınır, varsayılan 5000), `MODEL` (varsayılan claude-haiku-5-5).

## 4) Uygulamaya bağla
Worker adresini (`https://pasif-gelirim-ai.....workers.dev`) kopyala ve `www/config.js` içindeki `API_URL` değerine yaz. Dosyayı GitHub'a yükle; APK yeniden derlenir. Boş bırakırsan sohbet demo modunda çalışır.

## Notlar
- Günlük sınırlar şimdilik cihaz kimliğine bağlıdır; uygulamayı silip kuran biri sayacı sıfırlayabilir. `GLOBAL_DAILY_MAX` bu yüzden maliyet için asıl güvencedir. Google Play'e çıkarken hesap/Play doğrulaması eklenmeli.
- 1 saatlik süre sınırı hâlâ uygulamada tutulur (sunucu mesaj sayısını sınırlar).
- Anahtar sızarsa Console'dan sil ve yenisini Worker'a gir.
