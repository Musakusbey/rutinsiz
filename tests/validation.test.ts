import { describe, expect, it } from "vitest";
import { LIMITS, validateField, validateServiceRequest } from "@/lib/validation";

const valid = {
  name: "Ayşe Yılmaz",
  email: "ayse@ornek.com",
  service: "invoice-automation",
  description: "Aylık 200 faturayı elle muhasebe tablosuna giriyoruz.",
};

function errorsFor(input: unknown) {
  const result = validateServiceRequest(input);
  if (result.success) throw new Error("expected validation to fail");
  return result.errors;
}

describe("validateServiceRequest", () => {
  it("accepts a valid request", () => {
    expect(validateServiceRequest(valid)).toEqual({ success: true, data: valid });
  });

  it("trims text fields and lowercases the email", () => {
    const result = validateServiceRequest({
      ...valid,
      name: "  Ayşe Yılmaz  ",
      email: "  Ayse@Ornek.COM ",
      description: `  ${valid.description}  `,
    });
    expect(result).toEqual({ success: true, data: valid });
  });

  it("drops unknown fields instead of passing them on", () => {
    const result = validateServiceRequest({ ...valid, id: "x", created_at: "2020-01-01" });
    expect(result.success && result.data).toEqual(valid);
  });

  it("reports every missing field with a Turkish message", () => {
    const errors = errorsFor({});
    expect(Object.keys(errors).sort()).toEqual(["description", "email", "name", "service"]);
    expect(errors.service).toBe("Listeden bir hizmet seçin.");
  });

  it("says 'enter' for empty fields and states the rule for too-short ones", () => {
    const empty = errorsFor({ name: "  ", email: "", service: "", description: "" });
    expect(empty.name).toBe("Adınızı girin.");
    expect(empty.email).toBe("E-posta adresinizi girin.");
    expect(empty.description).toBe("Kısa bir açıklama yazın.");

    const short = errorsFor({ ...valid, name: "a", description: "kısa" });
    expect(short.name).toBe("Ad en az 2 karakter olmalı.");
    expect(short.description).toBe("Açıklama en az 10 karakter olmalı.");
  });

  it("rejects non-object input", () => {
    expect(validateServiceRequest(null).success).toBe(false);
    expect(validateServiceRequest("text").success).toBe(false);
  });

  describe("name", () => {
    it.each([
      ["whitespace only", "   "],
      ["too short after trim", " a "],
      ["too long", "a".repeat(LIMITS.name.max + 1)],
      ["not a string", 42],
      ["control character", "Ali\u0000Veli"],
    ])("rejects %s", (_, name) => {
      expect(errorsFor({ ...valid, name }).name).toBeDefined();
    });

    it("accepts the exact length limits", () => {
      expect(validateServiceRequest({ ...valid, name: "ab" }).success).toBe(true);
      expect(validateServiceRequest({ ...valid, name: "a".repeat(LIMITS.name.max) }).success).toBe(true);
    });

    // Postgres char_length counts code points; Zod must count the same way,
    // otherwise input could pass validation and then hit the CHECK constraint (500).
    it("counts characters like Postgres char_length (code points)", () => {
      expect(validateServiceRequest({ ...valid, name: "😀" }).success).toBe(false);
      expect(validateServiceRequest({ ...valid, name: "😀".repeat(LIMITS.name.max) }).success).toBe(true);
      expect(validateServiceRequest({ ...valid, name: "😀".repeat(LIMITS.name.max + 1) }).success).toBe(false);
    });
  });

  describe("email", () => {
    it.each(["", "ayse", "ayse@", "@ornek.com", "ayse@ornek", "ayse ornek@ornek.com"])(
      "rejects %j",
      (email) => {
        expect(errorsFor({ ...valid, email }).email).toBeDefined();
      },
    );

    it("rejects addresses longer than 254 characters", () => {
      const email = `${"a".repeat(64)}@${"b".repeat(186)}.com`; // 64 + 1 + 186 + 4 = 255
      expect(email.length).toBe(LIMITS.email.max + 1);
      expect(errorsFor({ ...valid, email }).email).toBeDefined();
    });
  });

  describe("service", () => {
    it.each(["", "hacking", "Invoice-Automation", 1])("rejects %j", (service) => {
      expect(errorsFor({ ...valid, service }).service).toBe("Listeden bir hizmet seçin.");
    });
  });

  describe("description", () => {
    it("rejects text shorter than the minimum after trimming", () => {
      expect(errorsFor({ ...valid, description: "   kısa   " }).description).toBeDefined();
    });

    it("rejects text longer than the maximum", () => {
      const description = "a".repeat(LIMITS.description.max + 1);
      expect(errorsFor({ ...valid, description }).description).toBeDefined();
    });

    it("keeps newlines and tabs but rejects other control characters", () => {
      expect(validateServiceRequest({ ...valid, description: "Satır bir\nSatır\tiki" }).success).toBe(true);
      expect(errorsFor({ ...valid, description: "Satır bir\u0000iki üç" }).description).toBeDefined();
    });
  });
});

describe("validateField", () => {
  it("validates a single field with the same rules", () => {
    expect(validateField("email", "ayse@ornek.com")).toBeUndefined();
    expect(validateField("email", "ayse@")).toBe("Geçerli bir e-posta adresi girin (ör. ad@ornek.com).");
  });
});
