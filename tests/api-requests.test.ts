import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/requests", () => ({ insertServiceRequest: vi.fn() }));

import { POST } from "@/app/api/requests/route";
import { insertServiceRequest } from "@/lib/requests";

const insert = vi.mocked(insertServiceRequest);

const valid = {
  name: "Ayşe Yılmaz",
  email: "ayse@ornek.com",
  service: "invoice-automation",
  description: "Aylık 200 faturayı elle muhasebe tablosuna giriyoruz.",
  website: "",
};

function post(body: string, contentType = "application/json") {
  return POST(
    new Request("http://localhost/api/requests", {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    }),
  );
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  insert.mockReset();
});

describe("POST /api/requests", () => {
  it("stores a valid request and returns 201 with the new id", async () => {
    insert.mockResolvedValue({ id: "3f1c7e0a-0000-4000-8000-000000000001", createdAt: "2026-09-29T10:00:00.000Z" });

    const res = await post(JSON.stringify(valid));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: "3f1c7e0a-0000-4000-8000-000000000001",
      createdAt: "2026-09-29T10:00:00.000Z",
    });
    // The honeypot field is not passed to the database.
    expect(insert).toHaveBeenCalledWith({
      name: valid.name,
      email: valid.email,
      service: valid.service,
      description: valid.description,
    });
  });

  it("normalizes input before storing it", async () => {
    insert.mockResolvedValue({ id: "id", createdAt: "2026-09-29T10:00:00.000Z" });

    await post(JSON.stringify({ ...valid, name: "  Ayşe Yılmaz ", email: " AYSE@Ornek.com" }));

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ name: "Ayşe Yılmaz", email: "ayse@ornek.com" }));
  });

  it("returns 422 with per-field errors and does not touch the database", async () => {
    const res = await post(JSON.stringify({ ...valid, email: "ayse@", service: "hacking" }));

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.errors).toEqual({
      email: expect.any(String),
      service: "Listeden bir hizmet seçin.",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await post("{ name: ");
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(["null", "[]", '"text"', "42"])("returns 400 when the body is %s instead of an object", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 400 when the honeypot field is filled, without storing or claiming success", async () => {
    const res = await post(JSON.stringify({ ...valid, website: "https://spam.example" }));

    expect(res.status).toBe(400);
    expect(await res.json()).not.toHaveProperty("id");
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 413 when the body is larger than 10 KB", async () => {
    const res = await post(JSON.stringify({ ...valid, description: "a".repeat(11 * 1024) }));
    expect(res.status).toBe(413);
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 413 based on Content-Length before reading the body", async () => {
    const res = await POST(
      new Request("http://localhost/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json", "content-length": String(1024 * 1024) },
        body: JSON.stringify(valid),
      }),
    );
    expect(res.status).toBe(413);
  });

  it("returns 415 when the body is not sent as JSON (blocks cross-site form posts)", async () => {
    const res = await post(JSON.stringify(valid), "text/plain");
    expect(res.status).toBe(415);
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 500 without success data or internal details when the database fails", async () => {
    insert.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secret'));

    const res = await post(JSON.stringify(valid));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).not.toHaveProperty("id");
    expect(JSON.stringify(body)).not.toMatch(/ECONNREFUSED|secret|5432/);
    expect(console.error).toHaveBeenCalled();
  });

  it("never caches responses", async () => {
    const res = await post("{");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
