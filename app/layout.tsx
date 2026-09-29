import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  // latin-ext carries the Turkish letters (ş, ğ, ı, İ).
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Rutinsiz · KOBİ'ler için iş otomasyonu",
  description:
    "Rutinsiz; fatura, müşteri bildirimi ve raporlama gibi tekrarlayan işleri analiz eder, otomatiğe bağlar ve çalışır durumda tutar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${geistSans.variable} antialiased motion-safe:scroll-smooth`}>
      <body className="min-h-dvh bg-white text-slate-900">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white"
        >
          İçeriğe geç
        </a>
        {children}
      </body>
    </html>
  );
}
