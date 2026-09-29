import { z } from "zod";
import { SERVICE_IDS } from "./services";

// Shared by the browser form and the API route, so both sides enforce
// exactly the same rules. db/schema.sql repeats the limits as CHECK constraints.
export const LIMITS = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  description: { min: 10, max: 2000 },
} as const;

// Postgres `text` rejects NUL (\u0000); other control characters have no place
// in these fields either. Description keeps tab and newlines.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const CONTROL_CHARS_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

export const serviceRequestSchema = z.object({
  name: z
    .string({ error: "Adınızı girin." })
    .trim()
    // An empty field gets "please enter", a too-short one gets the length rule (first issue wins).
    .min(1, { error: "Adınızı girin." })
    .min(LIMITS.name.min, { error: `Ad en az ${LIMITS.name.min} karakter olmalı.` })
    .max(LIMITS.name.max, { error: `Ad en fazla ${LIMITS.name.max} karakter olabilir.` })
    .refine((v) => !CONTROL_CHARS.test(v), { error: "Ad geçersiz karakter içeriyor." }),
  email: z
    .string({ error: "E-posta adresinizi girin." })
    .trim()
    .toLowerCase()
    .min(1, { error: "E-posta adresinizi girin." })
    .max(LIMITS.email.max, { error: "E-posta adresi çok uzun." })
    .pipe(z.email({ error: "Geçerli bir e-posta adresi girin (ör. ad@ornek.com)." })),
  service: z.enum(SERVICE_IDS, { error: "Listeden bir hizmet seçin." }),
  description: z
    .string({ error: "Kısa bir açıklama yazın." })
    .trim()
    .min(1, { error: "Kısa bir açıklama yazın." })
    .min(LIMITS.description.min, {
      error: `Açıklama en az ${LIMITS.description.min} karakter olmalı.`,
    })
    .max(LIMITS.description.max, {
      error: `Açıklama en fazla ${LIMITS.description.max} karakter olabilir.`,
    })
    .refine((v) => !CONTROL_CHARS_EXCEPT_WHITESPACE.test(v), {
      error: "Açıklama geçersiz karakter içeriyor.",
    }),
});

export type ServiceRequest = z.output<typeof serviceRequestSchema>;
export type FieldName = keyof ServiceRequest;
export type FieldErrors = Partial<Record<FieldName, string>>;

export const FIELD_ORDER: FieldName[] = ["name", "email", "service", "description"];

export type ValidationResult =
  | { success: true; data: ServiceRequest }
  | { success: false; errors: FieldErrors };

export function validateServiceRequest(input: unknown): ValidationResult {
  const result = serviceRequestSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };

  // One message per field is enough for the UI: the first one wins.
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as FieldName | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { success: false, errors };
}

export function validateField(field: FieldName, value: unknown): string | undefined {
  const result = serviceRequestSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}
