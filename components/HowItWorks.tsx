const STEPS = [
  {
    title: "Analiz",
    text: "Ekibinizle kısa bir görüşmede tekrarlayan işleri listeler, en çok zaman alanından başlarız.",
  },
  {
    title: "Kurulum",
    text: "Mevcut araçlarınıza bağlanan otomasyonu kurar, gerçek örneklerle sizinle birlikte test ederiz.",
  },
  {
    title: "Bakım",
    text: "Otomasyonun çalıştığını izler, süreçleriniz değiştikçe güncelleriz.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="nasil-calisir"
      aria-labelledby="nasil-calisir-baslik"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
    >
      <h2 id="nasil-calisir-baslik" className="text-3xl font-bold tracking-tight">
        Nasıl çalışır?
      </h2>
      <ol className="mt-8 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-4">
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-700 font-bold text-white"
            >
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 leading-relaxed text-slate-700">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
