"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { SERVICES } from "@/lib/services";
import {
  FIELD_ORDER,
  LIMITS,
  validateField,
  validateServiceRequest,
  type FieldErrors,
  type FieldName,
} from "@/lib/validation";

type Values = Record<FieldName, string>;
type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: Values = { name: "", email: "", service: "", description: "" };
const TIMEOUT_MS = 10_000;
const GENERIC_ERROR = "Talebiniz gönderilemedi. Bilgileriniz duruyor; lütfen tekrar deneyin.";

const inputClass =
  "mt-1 block w-full rounded-md border bg-white px-3 py-2.5 text-base text-slate-900 aria-[invalid=true]:border-red-700 border-slate-500";

function pickFieldErrors(value: unknown): FieldErrors {
  if (typeof value !== "object" || value === null) return {};
  const source = value as Record<string, unknown>;
  const errors: FieldErrors = {};
  for (const field of FIELD_ORDER) {
    if (typeof source[field] === "string") errors[field] = source[field];
  }
  return errors;
}

export function RequestForm() {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [reference, setReference] = useState("");
  const successHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (status === "success") successHeading.current?.focus();
  }, [status]);

  function focusFirstError(fieldErrors: FieldErrors) {
    const first = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (first) document.getElementById(`field-${first}`)?.focus();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const field = event.target.name as FieldName;
    const value = event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    // Once a field shows an error, re-check it while the user types so the message clears as soon as it is fixed.
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function handleBlur(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const field = event.target.name as FieldName;
    // Don't complain about a field the user merely tabbed through; submit reports empty fields.
    if (event.target.value.trim() === "") return;
    setErrors((prev) => ({ ...prev, [field]: validateField(field, event.target.value) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const validation = validateServiceRequest(values);
    if (!validation.success) {
      setErrors(validation.errors);
      setFormError("");
      setStatus("idle");
      focusFirstError(validation.errors);
      return;
    }

    const website = String(new FormData(event.currentTarget).get("website") ?? "");
    setErrors({});
    setFormError("");
    setStatus("submitting");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validation.data, website }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null);

      // Success is shown only when the server confirms a stored record.
      if (response.status === 201 && typeof data?.id === "string") {
        setReference(data.id);
        setValues(EMPTY);
        setStatus("success");
        return;
      }

      if (response.status === 422) {
        const fieldErrors = pickFieldErrors(data?.errors);
        setErrors(fieldErrors);
        focusFirstError(fieldErrors);
      }
      setFormError(typeof data?.error === "string" ? data.error : GENERIC_ERROR);
      setStatus("error");
    } catch {
      setFormError(
        controller.signal.aborted
          ? "Sunucu zamanında yanıt vermedi. Bilgileriniz duruyor; lütfen tekrar deneyin."
          : "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
      );
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-lg border border-green-700 bg-green-50 p-6">
        <h3 ref={successHeading} tabIndex={-1} className="text-xl font-semibold text-green-900">
          Talebiniz alındı.
        </h3>
        <p className="mt-2 text-green-900">
          Kayıt numaranız: <strong className="font-mono break-all">{reference}</strong>
        </p>
        <p className="mt-1 text-sm text-green-900">Bu numara talebinizin sistemimize kaydedildiğini gösterir.</p>
        <button
          type="button"
          onClick={() => {
            setReference("");
            setStatus("idle");
          }}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-green-800 px-4 font-semibold text-green-900 hover:bg-green-100"
        >
          Yeni bir talep gönder
        </button>
      </div>
    );
  }

  const submitting = status === "submitting";
  const describedBy = (field: FieldName, ...extra: string[]) =>
    [...extra, errors[field] ? `field-${field}-error` : ""].filter(Boolean).join(" ") || undefined;
  const fieldProps = (field: FieldName) => ({
    id: `field-${field}`,
    name: field,
    value: values[field],
    onChange: handleChange,
    onBlur: handleBlur,
    required: true,
    "aria-invalid": errors[field] ? true : undefined,
  });
  const errorText = (field: FieldName) =>
    errors[field] ? (
      <p id={`field-${field}-error`} className="mt-1 text-sm font-medium text-red-700">
        {errors[field]}
      </p>
    ) : null;
  const descriptionLength = Array.from(values.description).length;

  return (
    <form noValidate onSubmit={handleSubmit} aria-busy={submitting} className="space-y-5">
      <p className="text-sm text-slate-600">Tüm alanlar zorunludur.</p>

      <div>
        <label htmlFor="field-name" className="font-medium">
          Ad soyad
        </label>
        <input {...fieldProps("name")} type="text" autoComplete="name" aria-describedby={describedBy("name")} className={inputClass} />
        {errorText("name")}
      </div>

      <div>
        <label htmlFor="field-email" className="font-medium">
          E-posta
        </label>
        <input
          {...fieldProps("email")}
          type="email"
          autoComplete="email"
          spellCheck={false}
          aria-describedby={describedBy("email")}
          className={inputClass}
        />
        {errorText("email")}
      </div>

      <div>
        <label htmlFor="field-service" className="font-medium">
          Hizmet
        </label>
        <select {...fieldProps("service")} aria-describedby={describedBy("service")} className={inputClass}>
          <option value="" disabled>
            Bir hizmet seçin
          </option>
          {SERVICES.map((service) => (
            <option key={service.id} value={service.id}>
              {service.label}
            </option>
          ))}
        </select>
        {errorText("service")}
      </div>

      <div>
        <label htmlFor="field-description" className="font-medium">
          Açıklama
        </label>
        <p id="field-description-hint" className="text-sm text-slate-600">
          Hangi işi, ne sıklıkla ve hangi araçlarla yapıyorsunuz?
        </p>
        <textarea
          {...fieldProps("description")}
          rows={5}
          aria-describedby={describedBy("description", "field-description-hint", "field-description-count")}
          className={inputClass}
        />
        <p
          id="field-description-count"
          className={`mt-1 text-right text-sm ${descriptionLength > LIMITS.description.max ? "font-medium text-red-700" : "text-slate-600"}`}
        >
          {descriptionLength} / {LIMITS.description.max} karakter
        </p>
        {errorText("description")}
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots that fill it are rejected by the API. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="field-website">Web siteniz</label>
        <input id="field-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      {formError && (
        <div role="alert" className="rounded-md border border-red-700 bg-red-50 p-4 text-red-800">
          {formError}
        </div>
      )}

      <button
        type="submit"
        aria-disabled={submitting}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-6 font-semibold text-white hover:bg-teal-800 aria-disabled:cursor-wait aria-disabled:opacity-80 sm:w-auto"
      >
        {submitting && (
          <span
            aria-hidden="true"
            className="size-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin"
          />
        )}
        {submitting ? "Gönderiliyor…" : "Talebi gönder"}
      </button>

      <p aria-live="polite" className="sr-only">
        {submitting ? "Talebiniz gönderiliyor." : ""}
      </p>
    </form>
  );
}
