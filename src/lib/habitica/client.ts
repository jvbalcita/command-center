import type {
  CreateTaskInput,
  HabiticaResponse,
  HabiticaStats,
  HabiticaTask,
  HabiticaTaskQueryType,
  HabiticaUser,
} from "./types";

const BASE_URL = "https://habitica.com/api/v3";

export class HabiticaError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "HabiticaError";
  }
}

export interface HabiticaCredentials {
  userId: string;
  apiToken: string;
}


/**
 * Rate limiter for Habitica API — max 30 requests per 60 seconds.
 * Tracks request timestamps and waits if limit is reached.
 */
class HabiticaRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests = 30;
  private readonly windowMs = 60_000;

  async wait(): Promise<void> {
    const now = Date.now();
    // Remove timestamps older than 60 seconds
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 100; // +100ms buffer
      console.log(`[RateLimiter] Waiting ${waitMs}ms (limit: ${this.maxRequests}/min)`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this.timestamps.push(Date.now());
  }

  get remaining(): number {
    const now = Date.now();
    const active = this.timestamps.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - active.length);
  }
}

export class HabiticaClient {
  constructor(
    private readonly creds: HabiticaCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = BASE_URL,
  ) {}

  private rateLimiter = new HabiticaRateLimiter();

  private get headers(): Record<string, string> {
    return {
      "x-api-user": this.creds.userId,
      "x-api-key": this.creds.apiToken,
      "x-client": "mission-control",
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    await this.rateLimiter.wait();
    const url = `${this.baseUrl}${path}`;
    console.log(`[HabiticaClient] ${init.method || "GET"} ${url} (${this.rateLimiter.remaining} remaining)`);
    const res = await this.fetchImpl(url, {
      ...init,
      headers: { ...this.headers, ...init.headers },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "60", 10);
      console.warn(`[RateLimiter] 429 — waiting ${retryAfter}s`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      return this.request<T>(path, init);
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[HabiticaClient] ERROR ${res.status}: ${body}`);
      throw new HabiticaError(`Habitica ${res.status}: ${body}`, res.status);
    }

    const json = (await res.json()) as HabiticaResponse<T>;
    if (!json.success) {
      console.error(`[HabiticaClient] API error: ${json.message ?? json.error}`);
      throw new HabiticaError(json.message ?? json.error ?? "Habitica request failed");
    }
    return json.data;
  }

  /** GET /user */
  async getUser(): Promise<HabiticaUser> {
    return this.request<HabiticaUser>("/user");
  }

  /** GET /user — returns just the stats block */
  async getUserStats(): Promise<HabiticaStats> {
    const user = await this.getUser();
    return user.stats;
  }

  /** GET /tasks/user[?type=...] — `type` uses Habitica's plural forms. */
  async listTasks(type?: HabiticaTaskQueryType): Promise<HabiticaTask[]> {
    const qs = type ? `?type=${type}` : "";
    return this.request<HabiticaTask[]>(`/tasks/user${qs}`);
  }

  /** GET /tasks/:id */
  async getTask(id: string): Promise<HabiticaTask> {
    return this.request<HabiticaTask>(`/tasks/${id}`);
  }

  /** POST /tasks/user */
  async createTask(input: CreateTaskInput): Promise<HabiticaTask> {
    return this.request<HabiticaTask>("/tasks/user", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /** PUT /tasks/:id */
  async updateTask(id: string, patch: Partial<CreateTaskInput>): Promise<HabiticaTask> {
    return this.request<HabiticaTask>(`/tasks/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
  }

  /** POST /tasks/:id/score/:direction */
  async scoreTask(id: string, direction: "up" | "down" = "up"): Promise<HabiticaTask> {
    return this.request<HabiticaTask>(`/tasks/${id}/score/${direction}`, {
      method: "POST",
    });
  }

  /** Completing a todo in Habitica = scoring "up". */
  async completeTask(id: string): Promise<HabiticaTask> {
    return this.scoreTask(id, "up");
  }

  /** DELETE /tasks/:id */
  async deleteTask(id: string): Promise<unknown> {
    return this.request<unknown>(`/tasks/${id}`, { method: "DELETE" });
  }
}
