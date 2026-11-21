/** REST client for apps/api (network-protocol §10). The refresh token lives in an HttpOnly cookie; the
 * 15-minute access token only in memory (security-and-anticheat §3). */
export interface CharacterSummary {
  id: string;
  name: string;
  gender: "M" | "F";
  origin: "VILLAGER" | "NOBLE" | "ANCIENT";
  class: string;
  level: number;
  map_id: string;
}
export interface TicketResponse {
  wsUrl: string;
  ticket: string;
  protocolVersion: number;
}

const MESSAGES: Record<string, string> = {
  TAKEN: "Tên tài khoản hoặc email đã có người dùng.",
  WEAK_PASSWORD: "Mật khẩu quá phổ biến, hãy chọn mật khẩu khác.",
  BAD_CREDENTIALS: "Sai tên tài khoản hoặc mật khẩu.",
  LOCKED: "Sai mật khẩu quá 5 lần. Thử lại sau 10 phút.",
  RATE_LIMIT: "Thao tác quá nhanh, đợi một chút rồi thử lại.",
  NAME_TAKEN: "Tên nhân vật này đã có người dùng.",
  TOO_MANY: "Mỗi tài khoản có tối đa 3 nhân vật ở máy chủ này.",
  INVALID: "Thông tin chưa hợp lệ.",
  ACCOUNT_LOCKED: "Tài khoản đang bị khóa.",
  REALM_CLOSED: "Máy chủ đang bảo trì.",
  UNAUTHORIZED: "Phiên đăng nhập đã hết, hãy đăng nhập lại.",
  NETWORK: "Không kết nối được máy chủ.",
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    detail: string,
  ) {
    super(MESSAGES[code] ?? detail);
  }
}

export class Api {
  private token = "";
  username = "";

  constructor(readonly base: string) {}

  private async raw(method: string, path: string, body?: unknown): Promise<Response> {
    try {
      return await fetch(`${this.base}${path}`, {
        method,
        credentials: "include",
        headers: {
          ...(body !== undefined ? { "content-type": "application/json" } : {}),
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, "NETWORK", "network");
    }
  }

  private async call<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    let r = await this.raw(method, path, body);
    // an expired access token: rotate the refresh cookie once and try again
    if (r.status === 401 && retry && !path.startsWith("/auth/") && (await this.refresh()))
      r = await this.raw(method, path, body);
    if (r.status === 204) return undefined as T;
    const json = (await r.json().catch(() => ({}))) as { error?: { code: string; message: string } } & T;
    if (!r.ok) throw new ApiError(r.status, json.error?.code ?? "HTTP", json.error?.message ?? `HTTP ${r.status}`);
    return json;
  }

  private keep(r: { accessToken: string; account: { username?: string } }): void {
    this.token = r.accessToken;
    this.username = r.account.username ?? "";
  }

  /** Sign in again from the refresh cookie (page reload). */
  async refresh(): Promise<boolean> {
    const r = await this.raw("POST", "/auth/refresh");
    if (!r.ok) return false;
    this.keep(await r.json());
    return true;
  }
  async login(login: string, password: string): Promise<void> {
    this.keep(await this.call("POST", "/auth/login", { login, password }, false));
  }
  async register(username: string, email: string, password: string): Promise<void> {
    this.keep(await this.call("POST", "/auth/register", { username, email, password }, false));
  }
  async logout(): Promise<void> {
    await this.call("POST", "/auth/logout", undefined, false).catch(() => {});
    this.token = "";
  }
  characters(realmId = 1): Promise<{ max: number; characters: CharacterSummary[] }> {
    return this.call("GET", `/realms/${realmId}/characters`);
  }
  createCharacter(c: { name: string; gender: string; origin: string }, realmId = 1): Promise<CharacterSummary> {
    return this.call("POST", `/realms/${realmId}/characters`, c);
  }
  ticket(characterId: string, realmId = 1): Promise<TicketResponse> {
    return this.call("POST", "/session/ticket", { realmId, characterId });
  }
}
