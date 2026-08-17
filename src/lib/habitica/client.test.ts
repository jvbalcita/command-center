import { describe, expect, it, vi } from "vitest";
import { HabiticaClient, HabiticaError } from "./client";

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

const creds = { userId: "user-123", apiToken: "token-abc" };

describe("HabiticaClient", () => {
  it("POSTs to /tasks/user with auth headers on createTask", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({ success: true, data: { id: "h-1", type: "todo", text: "hi" } }),
    );
    const client = new HabiticaClient(creds, fetchMock as unknown as typeof fetch);

    const task = await client.createTask({ text: "hi", type: "todo", priority: 1.5 });

    expect(task.id).toBe("h-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://habitica.com/api/v3/tasks/user");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-user"]).toBe("user-123");
    expect(headers["x-api-key"]).toBe("token-abc");
    expect(headers["x-client"]).toBe("mission-control");
    expect(JSON.parse(init.body as string)).toEqual({
      text: "hi",
      type: "todo",
      priority: 1.5,
    });
  });

  it("throws HabiticaError on a non-2xx response", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: false, error: "Unauthorized" }, false, 401),
    );
    const client = new HabiticaClient(creds, fetchMock as unknown as typeof fetch);

    await expect(client.getUser()).rejects.toBeInstanceOf(HabiticaError);
  });

  it("throws when the API returns success:false", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: false, message: "Not found" }, true, 200),
    );
    const client = new HabiticaClient(creds, fetchMock as unknown as typeof fetch);

    await expect(client.getUser()).rejects.toThrow("Not found");
  });

  it("completeTask scores 'up'", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      jsonResponse({ success: true, data: { id: "h-1" } }),
    );
    const client = new HabiticaClient(creds, fetchMock as unknown as typeof fetch);

    await client.completeTask("h-1");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://habitica.com/api/v3/tasks/h-1/score/up");
    expect(init.method).toBe("POST");
  });

  it("getUserStats returns the stats block", async () => {
    const user = { id: "u1", stats: { hp: 50, lvl: 3, gp: 10 } };
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: user }));
    const client = new HabiticaClient(creds, fetchMock as unknown as typeof fetch);

    const stats = await client.getUserStats();
    expect(stats).toMatchObject({ hp: 50, lvl: 3, gp: 10 });
  });
});
