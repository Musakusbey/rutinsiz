import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ServiceRequest } from "@/lib/validation";

// Runs against a real Postgres (a separate Neon branch) only when DATABASE_URL_TEST is set;
// otherwise the suite is reported as skipped. Every row it creates is deleted afterwards.
const testUrl = process.env.DATABASE_URL_TEST;

describe.skipIf(!testUrl)("service_requests on a real database", () => {
  let db: typeof import("@/lib/db");
  let requests: typeof import("@/lib/requests");
  const createdIds: string[] = [];

  const sample: ServiceRequest = {
    name: "Entegrasyon Testi",
    email: "entegrasyon@ornek.com",
    service: "process-analysis",
    description: "Kurgusal test kaydı; test sonunda silinir.",
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = testUrl; // lib/db reads it lazily on first use
    db = await import("@/lib/db");
    requests = await import("@/lib/requests");
  });

  afterAll(async () => {
    if (!db) return;
    if (createdIds.length) {
      await db.getSql()`delete from service_requests where id = any(${createdIds}::uuid[])`;
    }
    await db.closeSql();
  });

  it("stores a request and reads the same data back", async () => {
    const created = await requests.insertServiceRequest(sample);
    createdIds.push(created.id);

    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    const [row] = await db.getSql()`
      select name, email, service, description, created_at
      from service_requests where id = ${created.id}
    `;
    expect(row).toMatchObject(sample);
    expect(new Date(row.created_at).toISOString()).toBe(created.createdAt);
  });

  it("enforces the service allowlist in the database itself", async () => {
    await expect(
      requests.insertServiceRequest({ ...sample, service: "hacking" as ServiceRequest["service"] }),
    ).rejects.toThrow(/check constraint/);
  });

  it("enforces length limits in the database itself", async () => {
    await expect(requests.insertServiceRequest({ ...sample, name: "a" })).rejects.toThrow(/check constraint/);
  });

  // This is why lib/validation.ts rejects control characters: Postgres would otherwise fail with a 500.
  it("cannot store a NUL character in a text column", async () => {
    await expect(
      requests.insertServiceRequest({ ...sample, description: "Açıklama \u0000 içeren metin" }),
    ).rejects.toThrow();
  });
});
