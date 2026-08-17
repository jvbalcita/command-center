import type {
  CreateTaskInput,
  HabiticaResponse,
  HabiticaStats,
  HabiticaTask,
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

export class HabiticaClient {
  constructor(
    private readonly creds: HabiticaCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl: string = BASE_URL,
  ) {}

  private get headers(): Record<string, string> {
    return {
      "x-api-user": this.creds.userId,
      "x-api-key": this.creds.apiToken,
      "x-client": "mission-control",
      "Content-Type": "application/json",
    };
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...this.headers, ...init.headers },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new HabiticaError(`Habitica ${res.status}: ${body}`, res.status);
    }

    const json = (await res.json()) as HabiticaResponse<T>;
    if (!json.success) {
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

  /** GET /tasks/user[?type=...] */
  async listTasks(type?: "habit" | "daily" | "todo"): Promise<HabiticaTask[]> {
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
