# Rutinsiz

KOBİ'lerin tekrarlayan işlerini (fatura girişi, müşteri bildirimleri, raporlama) otomatikleştiren **kurgusal** bir
hizmetin landing page'i ve talep formu. Form, gönderilen talebi sunucuda Postgres'e kalıcı olarak kaydeder.

- **Canlı adres:** https://rutinsiz.vercel.app
- **Kaynak kod:** https://github.com/Musakusbey/rutinsiz
- **AI kullanımı ve kararlar:** [AI_LOG.md](AI_LOG.md)

> ENTEKSİS uygulama değerlendirmesi için hazırlanmıştır. Formda yalnızca kurgusal test verisi kullanın.

## Görev gereksinimleri → karşılığı

| Gereksinim | Nerede / nasıl |
|---|---|
| Mobil ve masaüstü uyumlu landing page | `app/page.tsx`, `components/*`. 320–1440 px arasında yatay taşma yok (ölçüldü) |
| İsim, e-posta, hizmet seçimi, açıklama içeren form | `components/RequestForm.tsx` |
| İstemci ve sunucu tarafında doğrulama | Tek Zod şeması `lib/validation.ts`, hem formda hem `app/api/requests/route.ts`'de kullanılıyor |
| Gönderiliyor, başarı ve hata durumları | Form durumları: `idle → submitting → success / error` |
| Kaydın sunucuda kalıcı saklanması | Neon Postgres, `service_requests` tablosu (`db/schema.sql`) |
| Başarı mesajı yalnızca kayıt başarılıysa | Yalnızca `201` + `id` yanıtında gösteriliyor. 500, ağ hatası, zaman aşımı, id'siz 201 ve 200 için testler var |
| Canlı URL, kaynak kod, README, AI_LOG | Bu dosya ve [AI_LOG.md](AI_LOG.md) |

## Stack

| Katman | Seçim | Neden |
|---|---|---|
| Uygulama | Next.js 16 (App Router) + TypeScript | Sayfa ve API tek repoda; Vercel'e ayarsız deploy |
| Stil | Tailwind CSS 4 | Hızlı responsive düzen |
| Doğrulama | Zod 4 | İstemci ve sunucu aynı şemayı kullanıyor, kurallar birbirinden sapamıyor |
| Veritabanı | Neon Postgres (ücretsiz plan) | Vercel'in dosya sistemi kalıcı değil; SQLite veya JSON dosyası orada kaybolur |
| DB erişimi | `postgres` (postgres.js), ORM yok | Parametreli SQL: az sihir, SQL injection'a kapalı |
| Test | Vitest, Testing Library, jsdom | |
| CI / Deploy | GitHub Actions, Vercel | |

## Veri akışı

```
Tarayıcı (RequestForm)
  │ 1. Zod ile doğrula (lib/validation.ts). Hata varsa istek gönderilmez, alan altında mesaj gösterilir.
  │ 2. POST /api/requests   Content-Type: application/json   (10 sn zaman aşımı)
  ▼
app/api/requests/route.ts
  │ 3. 415 JSON değil · 413 >10 KB · 400 geçersiz UTF-8 / bozuk JSON / nesne değil / honeypot dolu
  │ 4. Aynı Zod şemasıyla doğrula ve normalize et (trim, e-posta küçük harf) → hata varsa 422 + alan hataları
  │ 5. insertServiceRequest(): parametreli INSERT … RETURNING id, created_at
  ▼
Neon Postgres: service_requests (CHECK kısıtları şemanın aynısı; son savunma hattı)
  │
  └─► 201 { id, createdAt } → form "Talebiniz alındı" ve kayıt numarasını gösterir
      DB hatası → 500 (iç ayrıntı yok) → form hata gösterir, girilen veriyi korur
```

## Proje yapısı

```
app/
  api/requests/route.ts   POST /api/requests
  layout.tsx, page.tsx    sayfa iskeleti ve bölümler
components/               Header, Hero, Problem, Services, HowItWorks, RequestForm, Footer
lib/
  services.ts             hizmet listesi (kartlar, <select>, Zod enum; schema.sql'de elle aynısı)
  validation.ts           Zod şeması ve doğrulama yardımcıları
  db.ts                   postgres.js bağlantısı (ilk kullanımda açılır)
  requests.ts             insertServiceRequest()
db/schema.sql             tablo ve CHECK kısıtları
scripts/migrate.mjs       şemayı uygular
tests/                    birim, API, form ve gerçek veritabanı testleri
```

## Kurulum (yerel)

Gereksinim: **Node.js 22+** ve bir Postgres bağlantı adresi (Neon ücretsiz planı yeterli).

```bash
git clone https://github.com/Musakusbey/rutinsiz.git
cd rutinsiz
npm ci
cp .env.example .env.local      # DATABASE_URL'i doldurun
npm run db:migrate              # service_requests tablosunu oluşturur (tekrar çalıştırmak güvenli)
npm run dev                     # http://localhost:3000
```

| Değişken | Zorunlu | Açıklama |
|---|---|---|
| `DATABASE_URL` | Evet | Neon **pooled** bağlantı adresi. Vercel'de de yalnızca bu tanımlı |
| `DATABASE_URL_TEST` | Hayır | Ayrı bir Neon branch'i. Yalnızca gerçek veritabanı testi kullanır; boşsa o test atlanır |

`next build`, veritabanı olmadan da çalışır: bağlantı ilk istekte açılır.

## Testler

```bash
npm test             # tüm testler
npm run lint
npm run typecheck    # next typegen + tsc
npm run db:migrate:test   # gerçek veritabanı testi için şemayı test branch'ine uygular
```

| Dosya | Test | Ne sınanıyor |
|---|---|---|
| `tests/validation.test.ts` | 28 | Her alanın sınır değerleri, trim ve küçük harf, izin dışı hizmet, kontrol karakterleri, Postgres `char_length` ile aynı uzunluk sayımı, boş ve kısa alan mesajları |
| `tests/api-requests.test.ts` | 15 | 201, 422 (DB'ye dokunulmadan), 400 (bozuk JSON, nesne olmayan gövde, honeypot, geçersiz UTF-8), 413 (başlığa ve gerçek bayta göre), 415, 500 (iç ayrıntı sızmadan), `no-store`. DB modülü mock'lanır |
| `tests/request-form.test.tsx` | 12 | Geçersizken istek gitmemesi ve odağın ilk hatalı alana gitmesi, gönderiliyor durumu ve çift gönderim engeli, başarının yalnızca 201 + id ile gösterilmesi, 500/200/id'siz 201/HTML 502/ağ hatası/10 sn zaman aşımında başarı gösterilmemesi ve verinin korunması, 422 alan hataları |
| `tests/db.integration.test.ts` | 4 | Gerçek Postgres: kaydedip aynı veriyi geri okuma, CHECK kısıtları, NUL karakterinin reddi. Kendi kayıtlarını siler |

- Yerelde `DATABASE_URL_TEST` ile: **59 / 59 geçti**. CI'da (test veritabanı yok): 55 geçti, 4 atlandı.
- Mutasyon kontrolü: honeypot kontrolü ve başarı koşulu bilerek bozulduğunda ilgili testler kırmızıya döndü (AI_LOG'da).
- GitHub Actions her push'ta lint, typecheck, test ve build çalıştırıyor.

### Canlı sitede manuel doğrulama

Ayrıntılar ve çıktılar [AI_LOG.md](AI_LOG.md)'de:

- `curl` ile bütün durum kodları.
- Headless Chrome ile 320/390/768/1440 px'te taşma ölçümü.
- Yalnızca klavyeyle form akışı, ardından kaydın `id` ile veritabanında sorgulanması.
- Lighthouse (mobil): Erişilebilirlik 100, En iyi pratikler 100, SEO 100.

## API

`POST /api/requests`, gövde JSON (UTF-8):

```json
{
  "name": "Ayşe Yılmaz",
  "email": "ayse@ornek.com",
  "service": "invoice-automation",
  "description": "Aylık 200 faturayı elle muhasebe tablosuna giriyoruz.",
  "website": ""
}
```

| Durum | Kod | Gövde |
|---|---|---|
| Kayıt oluştu | 201 | `{ "id": "<uuid>", "createdAt": "<ISO>" }` |
| Bozuk JSON, nesne olmayan gövde, geçersiz UTF-8, dolu honeypot | 400 | `{ "error": "…" }` |
| Gövde 10 KB'den büyük | 413 | `{ "error": "…" }` |
| `Content-Type` JSON değil | 415 | `{ "error": "…" }` |
| Alan hataları | 422 | `{ "error": "…", "errors": { "email": "…" } }` |
| Veritabanı hatası | 500 | `{ "error": "…" }`. Ayrıntı yalnızca sunucu logunda, kullanıcı verisi olmadan |
| GET vb. | 405 | Next.js |

Doğrulama kuralları:
- `name` 2–100 karakter.
- `email` geçerli format ve en fazla 254 karakter.
- `service` şu değerlerden biri: `invoice-automation`, `customer-notifications`, `reporting-integration`, `process-analysis`.
- `description` 10–2000 karakter.
- Metinler trim edilir. Kontrol karakterleri reddedilir; açıklamada sekme ve satır sonuna izin verilir.

## Güvenlik notları

- **SQL:** Tüm sorgular parametreli (postgres.js tagged template). Veritabanında CHECK kısıtları var.
- **XSS:** React çıktıyı escape ediyor, `dangerouslySetInnerHTML` yok.
- **Gizli değerler:** Yalnızca ortam değişkeninde. Repoda `.env.example` var; `.env.local` gitignore'da.
- **Spam:** Gizli honeypot alanı. Dolu gelirse **sahte başarı dönülmüyor**: başarı yanıtı her zaman gerçek bir kayıt demek.
- **Siteler arası form gönderimi:** Yalnızca `application/json` kabul ediliyor. Başka bir sitedeki düz HTML formu, CORS preflight olmadan buraya kayıt oluşturamaz.
- **Gövde:** Boyut sınırı var. Geçersiz UTF-8 bozuk karakterle saklanmıyor, reddediliyor (canlıda bulunan hata, AI_LOG'da).
- **Başlıklar:** `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` ve kısıtlı bir CSP (`frame-ancestors`, `base-uri`, `form-action`, `object-src`); `X-Powered-By` kapalı.

## Erişilebilirlik ve kullanılabilirlik

- `lang="tr"`, "İçeriğe geç" linki, semantik bölümler ve başlık hiyerarşisi.
- Her alanda `<label>`. Hatalar `aria-invalid` ile işaretleniyor ve `aria-describedby` ile alana bağlı; mesajlar Türkçe.
- **Hata durumunda:** odak ilk hatalı alana gidiyor, hata kutusu `role="alert"` ile okunuyor.
- **Başarı durumunda:** odak başarı başlığına gidiyor.
- **Gönderim sırasında:** buton `disabled` yerine `aria-disabled` alıyor, klavye odağı kaybolmuyor. Durum ekran okuyucuya `aria-live` ile bildiriliyor.
- **Mobil:** dokunma hedefleri en az 44 px, inputlar 16 px (iOS'ta zoom yapmıyor).
- **Görsel:** odak halkası görünür, animasyon `prefers-reduced-motion`'a uyuyor.

## Bilinen eksikler

- **Rate limiting yok.** Serverless ortamda bellek içi sayaç güvenilir değil. Vercel Firewall ya da Redis tabanlı bir sayaçla eklenebilir.
- **CAPTCHA yok;** yalnızca honeypot var.
- **Kayıtları listeleyen bir yönetim ekranı yok.** Kayıtlar Neon konsolundan görülüyor.
- **Talep geldiğinde e-posta bildirimi yok.**
- **CSP'de `script-src` yok.** Nonce tabanlı tam bir CSP her sayfanın dinamik render edilmesini gerektirirdi.
- **Uçtan uca tarayıcı testi CI'da değil.** Canlı akış, repoya eklenmeyen bir headless Chrome script'iyle elle doğrulandı.
- **Bölge farkı:** Veritabanı AWS us-east-2'de (Ohio), Vercel fonksiyonu varsayılan bölgede (iad1). Türkiye'den ilk istek ~1–1,5 sn sürebiliyor.
- **KVKK aydınlatma metni yok** (kurgusal proje).

## Şablon ve kaynak kullanımı

- İlk commit (`c157c8b`), `npx create-next-app@latest --ts --tailwind --eslint --app --use-npm` çıktısının **değiştirilmemiş** hâlidir. `AGENTS.md` ve `CLAUDE.md` de o şablondan gelir.
- Şablondan sonra değiştirilen dosyalar: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `next.config.ts`, `package.json`, `package-lock.json`, `.gitignore`, `README.md`.
- Diğer bütün dosyalar bu çalışmada yazıldı.
- Hazır UI kiti, tema veya başka bir açık kaynak şablon kullanılmadı.
- Kod, AI (Claude Code) ile birlikte yazıldı. Hangi önerinin kabul edildiği, değiştirildiği ya da reddedildiği ve nasıl doğrulandığı [AI_LOG.md](AI_LOG.md)'de.

## Harcanan süre

Yaklaşık **2 saat** (29.09.2026, 12:59–15:00). Plan, Neon/Vercel hesap kurulumu ve canlı doğrulama dahil.
