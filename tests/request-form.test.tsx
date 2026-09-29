// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestForm } from "@/components/RequestForm";

const fetchMock = vi.fn();
const RECORD_ID = "3f1c7e0a-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  vi.useRealTimers();
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function fillValidForm(user: UserEvent) {
  await user.type(screen.getByLabelText("Ad soyad"), "Ayşe Yılmaz");
  await user.type(screen.getByLabelText("E-posta"), "Ayse@Ornek.com");
  await user.selectOptions(screen.getByLabelText("Hizmet"), "invoice-automation");
  await user.type(screen.getByLabelText("Açıklama"), "Aylık 200 faturayı elle giriyoruz.");
}

const submitButton = () => screen.getByRole("button", { name: /Talebi gönder|Gönderiliyor/ });

describe("RequestForm", () => {
  it("does not send anything while fields are invalid and focuses the first invalid field", async () => {
    const user = userEvent.setup();
    render(<RequestForm />);

    await user.click(submitButton());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Ad soyad")).toHaveFocus();
    for (const label of ["Ad soyad", "E-posta", "Hizmet", "Açıklama"]) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription(expect.stringMatching(/\S/));
    }
  });

  it("clears a field error as soon as the value becomes valid", async () => {
    const user = userEvent.setup();
    render(<RequestForm />);
    await user.click(submitButton());
    expect(screen.getByText("Adınızı girin.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Ad soyad"), "Ayşe");

    expect(screen.queryByText("Adınızı girin.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ad soyad")).not.toHaveAttribute("aria-invalid");
  });

  it("sends normalized data plus the empty honeypot as JSON", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(201, { id: RECORD_ID, createdAt: "2026-09-29T10:00:00.000Z" }));
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/requests");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({
      name: "Ayşe Yılmaz",
      email: "ayse@ornek.com",
      service: "invoice-automation",
      description: "Aylık 200 faturayı elle giriyoruz.",
      website: "",
    });
  });

  it("shows a sending state and ignores repeated clicks until the server answers", async () => {
    const user = userEvent.setup();
    let respond!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => (respond = resolve)));
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());

    expect(submitButton()).toHaveTextContent("Gönderiliyor…");
    expect(submitButton()).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.click(submitButton());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    respond(jsonResponse(201, { id: RECORD_ID, createdAt: "2026-09-29T10:00:00.000Z" }));
    expect(await screen.findByRole("status")).toHaveTextContent(RECORD_ID);
  });

  it("shows success with the record id only after a 201, and moves focus to it", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(201, { id: RECORD_ID, createdAt: "2026-09-29T10:00:00.000Z" }));
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Talebiniz alındı.");
    expect(status).toHaveTextContent(RECORD_ID);
    expect(screen.getByRole("heading", { name: "Talebiniz alındı." })).toHaveFocus();

    // Starting over gives an empty form.
    await user.click(screen.getByRole("button", { name: "Yeni bir talep gönder" }));
    expect(screen.getByLabelText("Ad soyad")).toHaveValue("");
  });

  it.each([
    ["500 server error", () => jsonResponse(500, { error: "Talebiniz şu anda kaydedilemedi. Lütfen biraz sonra tekrar deneyin." }), "şu anda kaydedilemedi"],
    ["201 without an id", () => jsonResponse(201, {}), "gönderilemedi"],
    ["200 instead of 201", () => jsonResponse(200, { id: RECORD_ID }), "gönderilemedi"],
    ["non-JSON gateway error", () => new Response("<html>Bad Gateway</html>", { status: 502 }), "gönderilemedi"],
  ])("never shows success on %s and keeps the entered data", async (_, makeResponse, message) => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(makeResponse());
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Talebiniz alındı.")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ad soyad")).toHaveValue("Ayşe Yılmaz");
    expect(submitButton()).toHaveTextContent("Talebi gönder");
  });

  it("shows a connection error when the network request fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Sunucuya ulaşılamadı");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("gives up after 10 seconds and says so", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());
    await vi.advanceTimersByTimeAsync(10_000);

    expect(await screen.findByRole("alert")).toHaveTextContent("zamanında yanıt vermedi");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("puts server-side field errors (422) next to the matching field", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        error: "Lütfen işaretli alanları düzeltin.",
        errors: { email: "Geçerli bir e-posta adresi girin (ör. ad@ornek.com)." },
      }),
    );
    render(<RequestForm />);

    await fillValidForm(user);
    await user.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Lütfen işaretli alanları düzeltin.");
    const email = screen.getByLabelText("E-posta");
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Geçerli bir e-posta adresi girin (ör. ad@ornek.com).");
    expect(email).toHaveFocus();
  });
});
