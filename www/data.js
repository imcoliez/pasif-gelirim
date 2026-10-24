/* Pasif Gelirim - sabit içerik: gelir modelleri, görevler, sözlük, sorular */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Data = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  const QUESTIONS = [
    {
      id: 'time', text: 'Bu işe günde ne kadar zaman ayırabilirsin?',
      options: [
        { v: 'low', t: '30 dakika civarı' },
        { v: 'mid', t: '1-2 saat' },
        { v: 'high', t: '3 saat veya daha fazla' }
      ]
    },
    {
      id: 'money', text: 'Başlangıç için ne kadar bütçen var?',
      options: [
        { v: 'none', t: 'Hiç yok, ücretsiz araçlarla başlamak istiyorum' },
        { v: 'low', t: 'Küçük bir bütçem var' },
        { v: 'mid', t: 'Orta düzeyde bütçe ayırabilirim' }
      ]
    },
    {
      id: 'skill', text: 'Hangisi sana en rahat gelir?',
      options: [
        { v: 'write', t: 'Yazı yazmak, anlatmak' },
        { v: 'visual', t: 'Görsel / video hazırlamak' },
        { v: 'talk', t: 'İnsanlarla konuşmak, ikna etmek' },
        { v: 'system', t: 'Düzenli ve sistemli çalışmak' }
      ]
    },
    {
      id: 'speed', text: 'İlk gelir için ne kadar beklemeye razısın?',
      options: [
        { v: 'fast', t: 'Mümkün olduğunca erken (haftalar)' },
        { v: 'mid', t: '1-3 ay beklerim' },
        { v: 'slow', t: 'Uzun vadeli kurmaya hazırım (3+ ay)' }
      ]
    }
  ];

  const MODELS = [
    {
      id: 'sosyal-medya',
      title: 'Sosyal Medya İçerik Hesabı',
      emoji: '📱',
      summary: 'Belirli bir konuda düzenli içerik üretip takipçi topluyor, zamanla ortaklık, ürün veya hizmetle gelire çeviriyorsun.',
      honest: 'Takipçi sayısı tek başına gelir demek değildir. İlk haftalarda ve hatta aylarda gelir olmayabilir.',
      score: {
        time: { low: 0, mid: 2, high: 3 }, money: { none: 3, low: 2, mid: 2 },
        skill: { write: 2, visual: 3, talk: 2, system: 1 }, speed: { fast: 0, mid: 1, slow: 3 }
      },
      planIdeas: [
        'Kitlenin sık sorduğu bir soruyu 30-45 saniyelik içerikte cevapla',
        'Bir yanlış bilinen şeyi düzelten içerik hazırla',
        'Adım adım "nasıl yapılır" içeriği çek',
        'Kendi öğrendiğin bir şeyi "bugün öğrendim" formatında paylaş',
        'Takipçilerinden gelen yorumu içeriğe dönüştür',
        'Haftanın en iyi içeriğinin sonuçlarını incele, benzerini üret'
      ],
      decisions: ['Haftaya hangi içerik formatına ağırlık verilsin?', 'Reklam/ortaklık teklifleri hangi koşulda kabul edilsin?'],
      tasks: [
        { id: 't1', title: 'Hedef Kitleni Belirle', body: 'Hedef kitle, içeriklerini izlemesini istediğin insan grubudur. Yaşlarını, ilgi alanlarını ve çözmek istediğin sorunlarını tek bir kişiyi tarif eder gibi 5 cümleyle yaz. "Herkes" bir hedef kitle değildir; ne kadar net yazarsan içerik fikri bulmak o kadar kolaylaşır.' },
        { id: 't2', title: 'Nişini Seç', body: 'Niş, genel bir konunun içinde seçtiğin dar alandır. Örneğin "yemek" geniş, "tek tencerede öğrenci yemekleri" nişdir. İlgin, bilgin ve kitlenin ihtiyacı kesiştiği bir konu seç. Üç aday yaz, birini seç.' },
        { id: 't3', title: 'Hesabı Kur ve Profili Hazırla', body: 'Hesap adın, profil fotoğrafın ve kısa biyografin kim olduğunu ve ne fayda sağladığını tek bakışta anlatmalı. Biyografiye "kimin için, ne için" cümlesini ekle.' },
        { id: 't4', title: 'İlk 10 İçerik Fikrini Yaz', body: 'Kitlenin sorularından, yorumlardan ve rakip hesaplardan ilham alarak 10 içerik fikri çıkar. Kopyalama; kendi bakış açını ekle. Her fikri tek cümleyle yaz.' },
        { id: 't5', title: 'Haftalık Yayın Takvimi Oluştur', body: 'İçerik takvimi, hangi gün ne yayınlayacağını gösteren plandır. Başta gerçekçi ol: haftada 3 içerik, her gün zorlanarak yapılan içerikten iyidir. Takvimi telefonuna not et.' },
        { id: 't6', title: 'İlk 7 Gün Yayın ve Ölçüm', body: 'İlk içeriklerini yayınla. Her içerik için izlenme, kaydetme ve yorum sayısını not et. Amaç mükemmel olmak değil, neyin işe yaradığını görmektir.' },
        { id: 't7', title: 'Gelir Yolunu Seç', body: 'Gelir; reklam/ortaklık, kendi dijital ürünün veya hizmetin olabilir. Hangi yolu seçersen seç, kitlene dürüst ol: sponsorlu içerikleri belirt. Bu görevde bir yol seç ve neden seçtiğini yaz.' }
      ]
    },
    {
      id: 'dijital-sablon',
      title: 'Dijital Şablon / E-kitap Satışı',
      emoji: '📄',
      summary: 'Bir sorunu çözen şablon, planlayıcı veya kısa e-kitap hazırlıyor, bir kez üretip tekrar tekrar satıyorsun.',
      honest: 'Ürün hazırlamak işin kolay kısmı. Asıl zor kısım, ürünü doğru insanlara göstermek. Satış garantisi yoktur.',
      score: {
        time: { low: 1, mid: 2, high: 2 }, money: { none: 2, low: 3, mid: 3 },
        skill: { write: 2, visual: 3, talk: 0, system: 3 }, speed: { fast: 1, mid: 2, slow: 2 }
      },
      planIdeas: [
        'Ürünün çözdüğü sorunu anlatan kısa bir paylaşım hazırla',
        'Üründen bir ekran görüntüsü ve kullanım örneği paylaş',
        'Müşteriden gelen bir geri bildirimi (izinle) paylaş',
        'Ürüne küçük bir ücretsiz örnek sürüm hazırla',
        'Ürün açıklamasını sadeleştir ve test et',
        'Yeni ürün için kitlene soru sor'
      ],
      decisions: ['Yeni ürün mü yapılsın, mevcut ürün mü geliştirilsin?', 'Fiyat değişikliği denensin mi?']
      ,
      tasks: [
        { id: 't1', title: 'Hedef Kitle ve Sorunu Belirle', body: 'Hedef kitle, ürününü kullanacak insan grubudur. Onların günlük hayatta yaşadığı küçük ama sürekli bir sorunu seç (örn. öğrencinin ders programı karmaşası). Sorun ne kadar netse ürün o kadar kolay satılır.' },
        { id: 't2', title: 'Ürün Fikrini Seç', body: 'Sorunu çözen en basit ürünü seç: şablon, kontrol listesi, planlayıcı veya kısa rehber. İlk ürün küçük olsun; 1-2 günde bitirebileceğin boyutta.' },
        { id: 't3', title: 'Benzer Ürünleri İncele', body: 'Aynı konudaki ürünleri incele. Fiyatlarına, eksiklerine ve yorumlarına bak. Amaç kopyalamak değil, eksik kalan noktayı bulmak.' },
        { id: 't4', title: 'İlk Ürünü Hazırla', body: 'Ücretsiz bir tasarım aracıyla ürünü hazırla. Önce kendin kullan, sonra bir tanıdığına denet. Ürünün başında "nasıl kullanılır" kısa bir açıklama olsun.' },
        { id: 't5', title: 'Satış Sayfası ve Fiyat', body: 'Satış sayfasında ürünün çözdüğü sorunu, içeriğini ve kime uygun olduğunu açıkça yaz. Fiyatı benzer ürünlere bakarak belirle; dürüstçe vaat et, abartma.' },
        { id: 't6', title: 'Satış Kanalını Seç', body: 'Ürünü nerede satacağını seç (bir pazar yeri, kendi sayfan veya sosyal medya). Her kanalın komisyon ve kuralları farklıdır; kuralları oku.' },
        { id: 't7', title: 'İlk Duyuru ve Geri Bildirim', body: 'Çevrene ve hedef kitlene ürünü duyur. İlk alıcılardan geri bildirim iste ve ürünü buna göre iyileştir.' }
      ]
    },
    {
      id: 'freelance',
      title: 'Freelance Hizmet (yazı, tasarım, çeviri...)',
      emoji: '🧰',
      summary: 'Bildiğin bir beceriyi hizmet olarak sunuyor, müşteri buluyor ve iş başına gelir elde ediyorsun.',
      honest: 'Bu model genelde en hızlı sonuç verenlerden biridir ama pasif değildir; zamanını işe çevirirsin.',
      score: {
        time: { low: 1, mid: 3, high: 3 }, money: { none: 3, low: 2, mid: 2 },
        skill: { write: 3, visual: 3, talk: 3, system: 1 }, speed: { fast: 3, mid: 2, slow: 0 }
      },
      planIdeas: [
        'Potansiyel müşterilere 3 kişisel mesaj gönder',
        'Portfolyona yeni bir örnek iş ekle',
        'Eski müşteriden referans iste',
        'Hizmet açıklamanı daha net yeniden yaz',
        'Bir platformda 3 uygun ilana teklif ver',
        'Haftalık teslim ve zaman kaydını gözden geçir'
      ],
      decisions: ['Fiyatlar bu hafta güncellensin mi?', 'Yeni bir hizmet kalemi eklensin mi?'],
      tasks: [
        { id: 't1', title: 'Hizmetini Tanımla', body: 'Tek cümleyle yaz: "Ben ... için ... yapıyorum." Hedef kitle, hizmet verdiğin kişi/işletme grubudur. Çok şeyi aynı anda sunmak yerine tek net hizmetle başla.' },
        { id: 't2', title: 'Portfolyo İçin 3 Örnek Hazırla', body: 'Portfolyo, yapabildiklerini gösteren örnek iş koleksiyonudur. Müşterin yoksa kendi hazırladığın 3 örnek iş yeterlidir. Örnekleri gerçekçi ve temiz hazırla.' },
        { id: 't3', title: 'Profilini Oluştur', body: 'Uygun bir platformda veya kendi sayfanda profil aç. Fotoğraf, kısa tanıtım ve örnek işlerini ekle. Neyi yapıp neyi yapmadığını açıkça yaz.' },
        { id: 't4', title: 'Fiyatını Belirle', body: 'Harcayacağın süreyi ve piyasadaki benzer fiyatları karşılaştır. Çok düşük fiyat güveni azaltabilir; çok yüksek fiyat başta iş almayı zorlaştırır. Bir başlangıç fiyatı seç, sonra güncelle.' },
        { id: 't5', title: 'İlk 10 Müşteri Adayına Ulaş', body: 'İş ilanlarına teklif ver veya uygun işletmelere kısa, kişisel mesaj gönder. Her mesajda karşı tarafın sorununa değin; kopyala-yapıştır mesajdan kaçın.' },
        { id: 't6', title: 'İlk İşi Teslim Et ve Referans İste', body: 'Referans, memnun müşterinin senin hakkında yazdığı kısa görüştür. İşi zamanında teslim et ve izinle referans iste.' },
        { id: 't7', title: 'Süreci Sisteme Bağla', body: 'Teklif, teslim ve ödeme adımlarını basit bir liste haline getir. Böylece her müşteride aynı kalitede çalışırsın.' }
      ]
    },
    {
      id: 'blog-affiliate',
      title: 'Niş Blog + Bağlantı Ortaklığı',
      emoji: '✍️',
      summary: 'Belirli bir konuda faydalı yazılar yazıyor, arama motorlarından gelen okuyucuları ortaklık bağlantılarıyla gelire çeviriyorsun.',
      honest: 'Arama motorlarında görünmek aylar sürebilir. İlk dönemde gelir beklememek daha sağlıklı.',
      score: {
        time: { low: 0, mid: 2, high: 3 }, money: { none: 2, low: 3, mid: 3 },
        skill: { write: 3, visual: 1, talk: 0, system: 3 }, speed: { fast: 0, mid: 1, slow: 3 }
      },
      planIdeas: [
        'Bir sorunun cevabını veren 800 kelimelik makale taslağı çıkar',
        'Eski bir makaleyi güncelle ve geliştir',
        'Anahtar kelime listene 5 yeni arama ifadesi ekle',
        'Bir ürün karşılaştırma yazısı hazırla (ortaklık bağlantısını belirterek)',
        'Makalene görsel ve kısa özet ekle',
        'Haftalık ziyaretçi ve tıklama verilerini incele'
      ],
      decisions: ['Hangi konuda yeni makale serisi açılsın?', 'Hangi ortaklık programı sürdürülsün?'],
      tasks: [
        { id: 't1', title: 'Niş ve Hedef Kitleni Belirle', body: 'Niş, dar bir konu alanıdır. Hedef kitle ise o konuda bilgi arayan insanlardır. Hem sevebileceğin hem de insanların arayıp sorduğu bir alan seç.' },
        { id: 't2', title: 'Anahtar Kelime Araştırması', body: 'Anahtar kelime, insanların arama kutusuna yazdığı ifadedir. Aynı sorunu farklı kelimelerle arayan insanları bul ve 20 ifade listele.' },
        { id: 't3', title: 'Blogunu Kur', body: 'Ücretsiz veya düşük maliyetli bir blog altyapısı seç. Hakkımda, iletişim ve gizlilik sayfalarını ekle.' },
        { id: 't4', title: 'İlk 5 Makaleyi Yaz', body: 'Her makale tek bir soruyu net cevaplasın. Başlığı arama ifadesine yakın olsun. Gerçek bilgiye dayan, abartılı vaatlerden kaçın.' },
        { id: 't5', title: 'Ortaklık Programlarını İncele', body: 'Bağlantı ortaklığı (affiliate), tavsiyen üzerine yapılan satıştan komisyon almandır. Başvurmadan önce şartları oku ve okuyucuya ortaklık bağlantısı kullandığını açıkça belirt.' },
        { id: 't6', title: 'Makaleleri Duyur', body: 'Makalelerini ilgili topluluklarda ve sosyal medyada, kurallara uyarak paylaş. Spam yapma.' },
        { id: 't7', title: 'Ölçüm ve İyileştirme', body: 'Hangi makalenin okunduğunu ve tıklandığını takip et. İşe yarayan konuları genişlet, yaramayanları sadeleştir.' }
      ]
    },
    {
      id: 'yerel-hizmet',
      title: 'Yerel İşletmelere Dijital Hizmet',
      emoji: '🏪',
      summary: 'Küçük işletmelere QR menü, işletme profili, sosyal medya düzeni gibi dijital işleri hazırlıyor, hizmet bedeli alıyorsun.',
      honest: 'İnsanlarla konuşmak ve reddedilmeyi göze almak gerekir. Ama hızlı geri bildirim alırsın.',
      score: {
        time: { low: 1, mid: 3, high: 3 }, money: { none: 3, low: 2, mid: 2 },
        skill: { write: 1, visual: 2, talk: 3, system: 2 }, speed: { fast: 3, mid: 2, slow: 0 }
      },
      planIdeas: [
        '3 yeni işletmenin dijital eksiklerini not al',
        'Örnek çalışmana yeni bir örnek ekle',
        'Mevcut müşterine kısa bir durum raporu gönder',
        '2 işletmeyi ziyaret edip kısa bir tanıtım yap',
        'Mesaj şablonunu sonuçlara göre iyileştir',
        'Aylık bakım teklifini bir müşteriye sun'
      ],
      decisions: ['Hizmet paketine yeni bir kalem eklensin mi?', 'Bu hafta kaç işletmeye ulaşılsın?'],
      tasks: [
        { id: 't1', title: 'Hizmet Paketini Tanımla', body: 'Net bir paket belirle: örneğin QR menü + işletme profili düzeni. Neyi yaptığını, ne kadar sürede teslim ettiğini ve neyi yapmadığını yaz.' },
        { id: 't2', title: 'Örnek Çalışma Hazırla', body: 'Kendi hazırladığın bir örnek işletme çalışması göster. Gerçek bir işletmenin adını izinsiz kullanma.' },
        { id: 't3', title: '10 İşletmelik Aday Listesi', body: 'Yakın çevrendeki ve dijital varlığı zayıf 10 işletmeyi listele. Her biri için tek cümleyle eksiği yaz.' },
        { id: 't4', title: 'İlk Mesaj / Konuşma Metni', body: 'Kısa, saygılı ve işletmenin yararına odaklı bir tanıtım metni hazırla. Baskı yapma; "bakmak ister misiniz?" diye sor.' },
        { id: 't5', title: 'Görüşme ve Teklif', body: 'Teklifte yapılacak işi, süreyi ve fiyatı açıkça yaz. Söz verdiğin şeyi yazılı hale getir.' },
        { id: 't6', title: 'Teslim ve Referans', body: 'İşi teslim et, kullanımı kısaca anlat ve izinle kısa bir referans iste.' },
        { id: 't7', title: 'Aylık Bakım Teklifi', body: 'Memnun müşteriye düzenli bakım/güncelleme hizmeti öner. Kapsamı net yaz.' }
      ]
    }
  ];

  const GLOSSARY = {
    'hedef kitle': 'Hedef kitle, ürününün veya içeriğinin ulaşmak istediği insan grubudur. Örnek: "üniversite öğrencileri, bütçeli yemek arayanlar". Ne kadar netse mesajın o kadar etkili olur.',
    'niş': 'Niş, geniş bir alanın içinden seçtiğin dar konudur. "Spor" geniş, "evde 20 dakikalık spor" niştir. Dar konu, doğru kitleye ulaşmayı kolaylaştırır.',
    'portfolyo': 'Portfolyo, yapabildiğin işleri gösteren örnek koleksiyonudur. Müşteri ne alacağını burada görür.',
    'affiliate': 'Bağlantı ortaklığı (affiliate): bir ürünü tavsiye edersin, senin bağlantınla satış olursa komisyon alırsın. Okuyucuya bunu açıkça belirtmek gerekir.',
    'bağlantı ortaklığı': 'Bağlantı ortaklığı (affiliate): bir ürünü tavsiye edersin, senin bağlantınla satış olursa komisyon alırsın. Okuyucuya bunu açıkça belirtmek gerekir.',
    'seo': 'SEO, sayfanın arama motorlarında bulunabilir olması için yapılan çalışmadır. Sonuç vermesi genellikle haftalar veya aylar alır.',
    'içerik takvimi': 'İçerik takvimi, hangi gün ne yayınlayacağını gösteren plandır. Küçük ve sürdürülebilir tut.',
    'referans': 'Referans, memnun bir müşterinin senin hakkında yazdığı kısa görüştür. Yeni müşteriler için güven kaynağıdır.',
    'dönüşüm': 'Dönüşüm, bir ziyaretçinin istediğin eylemi yapmasıdır (satın almak, kayıt olmak gibi). Dönüşüm oranı, bu eylemi yapanların yüzdesidir.',
    'gelir modeli': 'Gelir modeli, paranın hangi yolla geleceğini anlatır: ürün satışı, hizmet bedeli, komisyon, reklam gibi.',
    'organik erişim': 'Organik erişim, reklam vermeden doğal yollarla ulaşılan insan sayısıdır.'
  };

  return { QUESTIONS, MODELS, GLOSSARY };
});
