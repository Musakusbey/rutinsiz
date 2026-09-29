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
| ChatGPT | Neon arayüzünde bağlantı adresinin nerede olduğu ve `.env.local` biçimi hakkında yardım |

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

### 13:30 — GitHub
- Public repo (`Musakusbey/rutinsiz`) açıkça onayım alındıktan sonra oluşturuldu. Push öncesi kontrol: repoda yalnızca
  `.env.example` var, bağlantı adresi/şifre kalıbı taraması temiz.
- GitHub Actions'taki ilk çalışma yeşil; log'da **54 test geçti, 4 atlandı** (atlananlar gerçek veritabanı testleri, CI'da `DATABASE_URL_TEST` yok).

### 14:34 — Neon kurulumu
- Proje **AWS US East 2 (Ohio)** bölgesinde açıldı (planda Frankfurt vardı). **Karar:** Projeyi yeniden kurmak yerine
  Vercel fonksiyon bölgesi Frankfurt'a çekilmeyecek, varsayılan Washington (iad1) bırakılacak; böylece uygulama ile
  veritabanı aynı kıyıda kalıyor. Neon'da ana branch'in adı `main` değil `production`.
- `production`'dan `test` branch'i açıldı; entegrasyon testi yalnızca bunu kullanıyor.
- İki bağlantı adresi de `.env.local`'a yazılması için AI sohbetine yapıştırıldı. Veritabanında yalnızca kurgusal veri
  var; değerlendirme bittikten sonra iki şifre de Neon'dan sıfırlanacak.

### 14:36 — Gerçek veritabanında doğrulama
- `npm run db:migrate:test` ve `npm run db:migrate` iki branch'e şemayı uyguladı.
- Neon adresindeki `channel_binding=require` parametresinin postgres.js ile sorun çıkarıp çıkarmayacağından emin değildik;
  denendi, bağlantı sorunsuz kuruldu.
- İki adresin gerçekten ayrı veritabanlarına gittiği şifre yazdırılmadan kontrol edildi: farklı `neon.branch_id`
  (`br-old-voice-…` / `br-lively-block-…`), ikisi de pooled.
- Entegrasyon testi **4/4 geçti**: kaydedip geri okuma, hizmet listesi CHECK'i, uzunluk CHECK'i, NUL reddi.
- 13:13'teki varsayım doğrulandı: Postgres NUL karakterini `22021 invalid byte sequence for encoding "UTF8": 0x00`
  ile reddediyor. Yani `validation.ts`'deki kontrol karakteri kuralı olmasa bu girdi 422 yerine 500 üretirdi.
- Testlerin kendi kayıtlarını sildiği doğrulandı: test branch'inde 0 satır kaldı.

### 14:40 — Uçtan uca: tarayıcı → API → Neon
- `next build` + `next start` gerçek veritabanıyla çalıştırıldı; form headless Chrome'da (390 px) yalnızca klavyeyle dolduruldu.
- Ekranda "Talebiniz alındı" ve kayıt numarası `f9cb0df3-0633-45a1-921f-c48238e19afb` göründü, odak başlığa taşındı.
- Başarı mesajına güvenmek yerine veritabanı sorgulandı: bu `id` ile satır production tablosunda var; ad/e-posta/hizmet
  doğru, Türkçe karakterler bozulmamış, e-posta küçük harfe çevrilmiş.

### 14:47 — Vercel deploy
- Repo Vercel'e bağlandı, yalnızca `DATABASE_URL` (production branch) tanımlandı. Canlı adres: https://rutinsiz.vercel.app
- Deploy edilen commit, GitHub deployments API'den okundu ve yereldeki `HEAD` ile karşılaştırıldı: aynı SHA.
- Canlıda `curl` ile: 201, 422, NUL içeren açıklama → **422** (13:13'teki kararın canlıdaki karşılığı), bozuk JSON → 400,
  honeypot → 400, 20 KB → 413, `text/plain` → 415, `GET` → 405. Güvenlik başlıkları geliyor; Vercel ayrıca HSTS ekliyor.

### 14:48 — Canlıda bulunan hata: geçersiz UTF-8 sessizce bozuk veri olarak kaydediliyordu
- **Belirti:** curl ile gönderilen `"Canlı API Testi"` kaydı veritabanında `Canl� API Testi` olarak duruyordu.
  Tarayıcıdan gönderilen kayıtlarda Türkçe karakterler sağlamdı.
- **Teşhis (ölçerek):** curl'ün gönderdiği baytlar küçük bir yerel sunucuda yakalandı: `ı` için UTF-8 `c4 b1` yerine
  `fd` (Windows-1254) gidiyordu. Yani istemci hatalıydı; ama sunucu da `request.text()` ile geçersiz baytı sessizce
  `U+FFFD`'ye çevirip **bozuk veriyi kaydetti**. Asıl kusur buydu.
- **Düzeltme:** Gövde `TextDecoder("utf-8", { fatal: true })` ile çözülüyor; geçersiz UTF-8 → 400.
  Önce hatayı yeniden üreten test yazıldı ve kırmızı olduğu görüldü, sonra düzeltme yapıldı (commit `62e954c`).
- **Canlıda tekrar sınandı:** aynı curl komutu artık **400** alıyor; gövde UTF-8 dosyadan gönderildiğinde
  `ş ğ ü ö ç ı İ` veritabanına sağlam yazılıyor. Bozuk kayıt (`99acff82…`) bu hatanın kanıtı olarak tabloda bırakıldı.

### 14:51 — Canlı sitede tarayıcı ve erişilebilirlik kontrolleri
- 320 / 390 / 768 / 1440 px: yatay taşma yok.
- Klavyeyle akış canlıda tekrarlandı: başarı mesajı `562dc4b9-…` numarasıyla çıktı, satır production tablosunda bulundu.
- Lighthouse (mobil, canlı adres): **Erişilebilirlik 100, En iyi pratikler 100, SEO 100**; başarısız denetim yok.

### 14:55 — README
- README'deki sayılar ve iddialar yazıldıktan sonra kaynağıyla karşılaştırıldı:
  - test sayıları Vitest çıktısıyla, CI rakamları GitHub Actions log'uyla eşleşiyor;
  - "şablondan sonra değiştirilen dosyalar" listesi `git diff c157c8b` ile karşılaştırıldı. `package-lock.json` eksikti, eklendi.

## Harcanan süre

Yaklaşık 2 saat (12:59–15:00). Neon/Vercel hesap kurulumu ve canlı doğrulama dahil.

## Özet: kabul / değiştir / ret

| Öneri | Sonuç |
|---|---|
| Next.js + Zod + Neon + Vitest planı | Kabul |
| `--legacy-peer-deps` ile çakışmayı geçmek | Reddedildi; tipler Node 22'ye yükseltildi |
| Honeypot'ta botlara sahte başarı dönmek (yaygın pratik) | Reddedildi; 400 |
| Zod uzunluk sayımı için özel kod | Gereksiz çıktı (Zod 4.6 zaten kod noktası sayıyor); test ile sabitlendi |
| 415 durum kodu | Plana eklendi (gerekçe yukarıda) |
| Boş alan mesajı | Test bulgusu üzerine değiştirildi |
| Vercel bölgesini Frankfurt yapmak | Uygulanmadı; veritabanı Ohio'da açıldığı için varsayılan iad1 bırakıldı |
| Gövdeyi `request.text()` ile okumak | Canlıdaki bulgu üzerine değiştirildi; katı UTF-8 çözümü |
