const PAINS = [
  {
    title: "Faturalar tek tek giriliyor",
    text: "E-postayla gelen her faturayı açıp tutarı, tarihi ve firmayı muhasebe tablosuna elle yazıyorsunuz.",
  },
  {
    title: "Aynı mesaj her gün yeniden yazılıyor",
    text: "Sipariş onayı, randevu ve ödeme hatırlatmaları için müşterilere benzer e-postaları tek tek gönderiyorsunuz.",
  },
  {
    title: "Rapor için beş dosya birleştiriliyor",
    text: "Ay sonu raporu, farklı araçlardan indirilen tabloların kopyala-yapıştırla birleştirilmesiyle hazırlanıyor.",
  },
];

export function Problem() {
  return (
    <section id="sorun" aria-labelledby="sorun-baslik" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 id="sorun-baslik" className="text-3xl font-bold tracking-tight">
        Tanıdık geliyor mu?
      </h2>
      <p className="mt-3 max-w-2xl text-slate-700">
        Küçük ekiplerde zamanın önemli bir kısmı, bir bilgisayarın hatasız yapabileceği işlere gidiyor. Elle
        yapılan her tekrar hem saat kaybı hem de hata riski demek.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-3">
        {PAINS.map((pain) => (
          <li key={pain.title} className="rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold">{pain.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{pain.text}</p>
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl rounded-lg bg-teal-50 p-5 font-medium text-teal-900">
        Rutinsiz bu adımları sizin yerinize çalışan otomasyonlara dönüştürür; ekibiniz de müşteriye ve işin
        kendisine odaklanır.
      </p>
    </section>
  );
}
