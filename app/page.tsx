import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Problem } from "@/components/Problem";
import { RequestForm } from "@/components/RequestForm";
import { Services } from "@/components/Services";

export default function Home() {
  return (
    <>
      <Header />
      <main id="icerik">
        <Hero />
        <Problem />
        <Services />
        <HowItWorks />
        <section id="talep" aria-labelledby="talep-baslik" className="bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[2fr_3fr]">
            <div>
              <h2 id="talep-baslik" className="text-3xl font-bold tracking-tight">
                Otomasyon talebinizi iletin
              </h2>
              <p className="mt-3 text-slate-700">
                Hangi işi otomatikleştirmek istediğinizi kısaca anlatın. Talebiniz kaydedilir ve size bir kayıt
                numarası verilir.
              </p>
              <p className="mt-3 text-sm text-slate-600">
                Bu bir değerlendirme projesidir; lütfen gerçek kişisel bilgi yerine kurgusal test verisi girin.
              </p>
            </div>
            <div className="relative rounded-lg border border-slate-200 bg-white p-6 sm:p-8">
              <RequestForm />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
