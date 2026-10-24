# Minik Adımlar – Çocuk Gelişim Rehberi

Anne karnından 10 yaşına kadar büyüme, gelişim, aşılar ve dikkat edilmesi gerekenleri anlatır.
Mobil uygulama (PWA) olarak çalışır; kurulduktan sonra internet olmadan da açılır.

## Bilgisayarda deneme
`index.html` dosyasını tarayıcıda açın. Çevrimdışı çalışma ve "ana ekrana ekle" özelliği ise yalnızca uygulama bir web sunucusundan açıldığında çalışır:

    python -m http.server 8000

Ardından tarayıcıda http://localhost:8000 adresini açın.

## Telefona uygulama olarak kurma
1. Klasörü ücretsiz bir statik barındırma hizmetine yükleyin (GitHub Pages, Netlify, Cloudflare Pages).
2. Telefonda bu adresi açın:
   - Android / Chrome: Menü → "Uygulamayı yükle"
   - iPhone / Safari: Paylaş → "Ana Ekrana Ekle"

## Dosyalar
- `index.html`: uygulama kabuğu
- `css/style.css`: tasarım (açık ve koyu tema)
- `js/app.js`: ekranlar ve gezinme
- `js/illustration.js`: animasyonlu çocuk ve fetüs çizimleri
- `js/charts.js`: grafikler ve DSÖ z-skoru hesapları
- `js/content.js`: tüm içerik ve kaynaklar
- `js/growth-data.js`: DSÖ büyüme tabloları (LMS)
- `manifest.webmanifest`, `sw.js`, `icons/`: PWA dosyaları
