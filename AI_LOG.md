# AI_LOG — Rutinsiz

Bu dosya, çalışma sırasında yapay zekâyı nasıl kullandığımı, hangi önerileri kabul ettiğimi,
değiştirdiğimi ya da reddettiğimi ve sonucu nasıl doğruladığımı kayıt altına alır.
Kayıtlar iş yapılırken tutuldu; sonradan yeniden kurgulanmadı. Saatler İstanbul saatidir (29.09.2026).

## Araçlar

| Araç | Ne için |
|---|---|
| Claude Code (model: Claude Opus 5.5), VS Code eklentisi | Görev analizi, plan, kod ve test taslakları, komut çalıştırma, doğrulama script'leri |
| Headless Chrome + `puppeteer-core` (repoya eklenmedi) | Mobil taşma ölçümü, klavyeyle form akışı kontrolü |
| `curl` | API durum kodlarını istemciyi atlayarak doğrudan sınamak |

## Görev dağılımı

- **Ben:** Kapsam ve ürün kararları (hizmet: Rutinsiz; stack: Next.js + TypeScript; Neon/Vercel), planın onayı,
  "önce plan, sonra kod" ve "doğrulanmamış hiçbir şey bitmiş sayılmaz" kuralı, kodun ve metinlerin incelenmesi,
  hesap kurulumları (GitHub, Vercel, Neon), teslim.
- **AI:** Ekran görüntülerinden gereksinim çıkarma, plan taslağı, kod ve test taslakları, doğrulama komutları,
  bu log için taslak kayıtlar.

## Kronolojik kayıt

### 13:01 — Görev analizi ve plan (kod yok)
- **Yönlendirme:** Görevin 6 ekran görüntüsü verildi. "Henüz kod yazma; 11 başlıkta kısa plan ver, kapsamı 3–4 saatte tut, gereksiz özellik ekleme."
- **AI önerisi:** Tek sayfalık landing + tek API ucu (`POST /api/requests`), ortak Zod şeması, Neon Postgres, Vitest, Vercel.
- **Kararlar:**
  - Next.js (App Router) + TypeScript: kabul (bildiğim stack; görüşmede anlatabilmem önemli).
  - Veritabanı: **SQLite yerine Postgres (Neon)**. Vercel'in dosya sistemi kalıcı değil; SQLite/JSON dosyası orada kaybolur.
  - ORM yok, parametreli SQL (postgres.js): daha az sihir, açıklaması kolay.
  - Kapsam dışı: auth, admin paneli, e-posta bildirimi. Bilinen eksik olarak README'ye yazılacak.

### 13:09 — İskelet
- `create-next-app` ile Next.js **16.3.7** kuruldu. İlk commit (`c157c8b`) şablonun **değiştirilmemiş** hâlidir; sonraki commit'ler benim işimdir.
- Şablonun ürettiği `AGENTS.md`, bu sürümdeki API'lerin modelin bildiğinden farklı olabileceği uyarısını içeriyordu.
  AI kod yazmadan önce `node_modules/next/dist/docs` altındaki route handler, `headers` ve Vitest kılavuzlarını okudu.

### 13:11 — Bağımlılık çakışması
- `vitest@5`, `@types/node@^22` bekliyordu; şablonda `^20` vardı (npm ERESOLVE).
- **Reddedilen yol:** `--legacy-peer-deps` / `--force` (uyumsuzluğu gizler).
- **Karar:** Çalışma ortamı zaten Node 22.17 olduğu için `@types/node` 22'ye yükseltildi; `engines.node >= 22` eklendi.
- Vitest 5 `loadEnv`'i artık `vitest/config` üzerinden vermiyor → `vite`'tan import edildi. `vite-tsconfig-paths`
  uyarısı üzerine eklenti kaldırıldı, Vite'ın yerleşik `resolve.tsconfigPaths` ayarı kullanıldı.

### 13:13 — Doğrulama şeması: önce kütüphane davranışı ölçüldü
- Zod 4'ün API'si v3'ten farklı; şema yazılmadan önce davranış küçük bir script ile denendi:
  trim/lowercase'in e-posta kontrolünden önce çalıştığı, `flattenError`, bilinmeyen alanların atıldığı doğrulandı.
- **Beklenmeyen bulgu:** `z.string().min(2)`, `"😀"` (JS `length` = 2) değerini reddetti. Kaynak kodda Zod 4.6'nın
  uzunluğu **kod noktası** olarak saydığı görüldü (`util.codePointLength`). Bu, Postgres `char_length` ile aynı
  sayım demek; yani "Zod'dan geçip veritabanı CHECK kısıtına takılma (500)" riski yok. Ek kod gerekmedi,
  davranış bir testle sabitlendi (`counts characters like Postgres char_length`).
- **Karar:** Metin alanlarında kontrol karakterleri reddediliyor (açıklamada sekme/satır sonu serbest).
  Gerekçe: Postgres `text` alanı NUL (`\u0000`) kabul etmez; doğrulama olmasa bu kullanıcı girdisi 422 yerine 500 üretirdi.
  Entegrasyon testi bunu gerçek veritabanında sınayacak (bkz. aşağıda).

### 13:15 — API kararları
- Plandaki 201/400/413/422/500 durumları korundu. **Ek:** `Content-Type` JSON değilse **415**. Gerekçe: başka bir
  sitedeki düz HTML formu `enctype="text/plain"` ile JSON'a benzeyen gövdeyi preflight olmadan gönderebilir;
  JSON zorunluluğu bu yolla sahte kayıt oluşturmayı engeller.
- Honeypot dolu gelirse **sahte başarı dönülmüyor**, 400 dönülüyor: "başarı yalnızca gerçek kayıtta" kuralıyla çelişmemesi için.
- Boyut sınırı hem `Content-Length` başlığına hem gerçekten okunan bayt sayısına göre uygulanıyor (başlık eksik ya da yanlış olabilir).
- 500'de istemciye iç ayrıntı gönderilmiyor; sunucu logunda yalnızca hata adı/mesajı/kodu var, kullanıcının gönderdiği veri yok.

### 13:17 — Testlerin yakaladıkları
- **Kendi test hatam:** 255 karakterlik e-posta testinde uzunluk hesabı yanlıştı (254 çıkıyordu). Testin başına koyduğum
  uzunluk kontrolü bunu yakaladı; olmasa test sınırı yanlış yerde ölçecekti.
- **Gerçek kullanılabilirlik hatası:** Form testi, boş bırakılan ad alanında "Adınızı girin." yerine
  "Ad en az 2 karakter olmalı." gösterildiğini ortaya çıkardı (boş string tip kontrolünü geçip ilk olarak `min(2)`'ye takılıyordu).
  Ad ve açıklamaya önce `min(1)` kontrolü eklendi; iki durumu ayıran test eklendi.

### 13:19 — Testlerin gerçekten bir şey sınadığının kontrolü (mutasyon)
- Route'ta honeypot kontrolü geçici olarak kapatıldı → honeypot testi **kırmızı**. Kod geri alındı.
- Formda başarı koşulu `status === 201 && id` yerine `response.ok` yapıldı → "id'siz 201" ve "200" testleri **kırmızı**. Kod geri alındı.

### 13:22 — Gerçek sunucuda doğrulama (`next build` + `next start`, veritabanı bağlı değilken)
- `curl` ile: geçerli istek → **500** (DB yok; yanıtta iç ayrıntı yok), eksik/yanlış alanlar → **422** + alan hataları,
  bozuk JSON → **400**, honeypot → **400**, 20 KB gövde → **413**, `text/plain` → **415**, `GET` → **405**.
- Yanıt başlıkları: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, CSP geliyor; `X-Powered-By` yok.
- Sunucu logu: `insert failed { name: 'Error', message: 'DATABASE_URL is not set' }`, kullanıcı verisi içermiyor.

### 13:24 — Mobil görünüm: yanlış alarm, ölçerek elendi
- Headless Chrome ile 390 px ekran görüntüsünde içerik sağdan kesik göründü.
- Varsayım yapmak yerine ölçüldü: 320 / 390 / 768 / 1440 px'te `scrollWidth == clientWidth`, viewport dışına taşan eleman yok.
  Kesiklik, headless Chrome'un minimum pencere genişliğinden kaynaklanıyordu; gerçek 390 px emülasyonunda sayfa doğru.
- Klavyeyle akış (gerçek tarayıcı): ilk Tab "İçeriğe geç"; boş gönderimde 4 alan `aria-invalid` ve odak ad alanında;
  Tab sırası ad → e-posta → hizmet → açıklama → gönder (honeypot atlanıyor); DB yokken hata kutusu çıktı,
  başarı mesajı çıkmadı, girilen veri korundu.

### 13:27 — CI temiz klonda denendi
- Repo boş bir klasöre klonlanıp CI adımları birebir çalıştırıldı. `tsc`, `LayoutProps` tipini bulamadı:
  bu tip `next build`/`dev` tarafından `.next/` içine üretiliyor, temiz klonda yok. Yerelde `.next/` olduğu için fark edilmemişti.
- Düzeltme: `typecheck` script'i önce `next typegen` çalıştırıyor. Temiz klonda lint, typecheck, test ve build geçti.

<!-- Sonraki kayıtlar: Neon kurulumu, entegrasyon testi, Vercel deploy, canlı doğrulama. -->

## Özet: kabul / değiştir / ret

| Öneri | Sonuç |
|---|---|
| Next.js + Zod + Neon + Vitest planı | Kabul |
| `--legacy-peer-deps` ile çakışmayı geçmek | Reddedildi; tipler Node 22'ye yükseltildi |
| Honeypot'ta botlara sahte başarı dönmek (yaygın pratik) | Reddedildi; 400 |
| Zod uzunluk sayımı için özel kod | Gereksiz çıktı (Zod 4.6 zaten kod noktası sayıyor); test ile sabitlendi |
| 415 durum kodu | Plana eklendi (gerekçe yukarıda) |
| Boş alan mesajı | Test bulgusu üzerine değiştirildi |
