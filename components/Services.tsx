import { SERVICES } from "@/lib/services";

export function Services() {
  return (
    <section id="hizmetler" aria-labelledby="hizmetler-baslik" className="bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 id="hizmetler-baslik" className="text-3xl font-bold tracking-tight">
          Hizmetler
        </h2>
        <p className="mt-3 max-w-2xl text-slate-700">
          Tek bir süreçle başlayın; işe yaradığını gördükçe genişletin.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <li key={service.id} className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold">{service.label}</h3>
              <p className="mt-2 leading-relaxed text-slate-700">{service.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
