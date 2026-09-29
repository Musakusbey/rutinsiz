// Single source of truth for the services offered.
// Used by the landing page cards, the form <select>, the Zod enum and
// (mirrored by hand) the CHECK constraint in db/schema.sql.
export const SERVICES = [
  {
    id: "invoice-automation",
    label: "Fatura ve belge otomasyonu",
    description:
      "Gelen faturaları e-postadan alır, bilgilerini okur ve muhasebe tablonuza kendiliğinden işler.",
  },
  {
    id: "customer-notifications",
    label: "Müşteri bildirimleri",
    description:
      "Sipariş, randevu ve ödeme hatırlatmalarını doğru kişiye, doğru zamanda otomatik gönderir.",
  },
  {
    id: "reporting-integration",
    label: "Raporlama ve entegrasyon",
    description:
      "Dağınık tabloları ve araçları birbirine bağlar; haftalık raporunuz kendiliğinden hazırlanır.",
  },
  {
    id: "process-analysis",
    label: "Süreç analizi",
    description:
      "Neyin otomatikleşmeye değer olduğundan emin değilseniz iş akışınızı birlikte inceleyip önceliklendiririz.",
  },
] as const;

export type ServiceId = (typeof SERVICES)[number]["id"];

export const SERVICE_IDS = SERVICES.map((s) => s.id) as [ServiceId, ...ServiceId[]];
