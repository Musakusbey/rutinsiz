export function Hero() {
  return (
    <section aria-labelledby="hero-baslik" className="bg-gradient-to-b from-teal-50 to-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-800">
          KOBİ&apos;ler için iş otomasyonu
        </p>
        <h1
          id="hero-baslik"
          className="mt-3 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl"
        >
          Her hafta aynı işi elle yapmayı bırakın.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-700">
          Rutinsiz; fatura girişi, müşteri bildirimleri ve raporlama gibi tekrarlayan işleri analiz eder,
          otomatiğe bağlar ve çalışır durumda tutar. 5–50 kişilik ekipler için, kullandığınız araçları
          değiştirmeden.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#talep"
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-teal-700 px-6 font-semibold text-white hover:bg-teal-800"
          >
            Otomasyon talebi oluştur
          </a>
          <a
            href="#nasil-calisir"
            className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 font-semibold text-slate-800 hover:border-slate-400"
          >
            Nasıl çalışır?
          </a>
        </div>
      </div>
    </section>
  );
}
