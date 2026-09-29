const NAV = [
  { href: "#sorun", label: "Neden" },
  { href: "#hizmetler", label: "Hizmetler" },
  { href: "#nasil-calisir", label: "Nasıl çalışır" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#" className="flex items-center gap-2 rounded-md text-lg font-bold tracking-tight">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-md bg-teal-700 text-white">
            R
          </span>
          Rutinsiz
        </a>
        <nav aria-label="Ana menü" className="flex items-center gap-6">
          {/* Only the call to action fits on small screens; the sections are one scroll away. */}
          <ul className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="rounded-sm hover:text-teal-800">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#talep"
            className="inline-flex min-h-11 items-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Talep oluştur
          </a>
        </nav>
      </div>
    </header>
  );
}
