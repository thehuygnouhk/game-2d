import { describe, expect, it } from "vitest";
import { checkPassword, hashPassword, ipHash, isCommonPassword, readAccess, sha256, signAccess } from "../src/security";

describe("security helpers (security-and-anticheat §3)", () => {
  it("hashes passwords with argon2id and checks them", async () => {
    const h = await hashPassword("hoa-mai-2026");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await checkPassword(h, "hoa-mai-2026")).toBe(true);
    expect(await checkPassword(h, "hoa-mai-2027")).toBe(false);
    expect(await checkPassword("not a hash", "x")).toBe(false);
  });
  it("signs 15-minute access tokens and rejects other keys", async () => {
    const key = new TextEncoder().encode("k".repeat(32));
    const t = await signAccess(key, "acc-1");
    expect(await readAccess(key, t)).toBe("acc-1");
    expect(await readAccess(new TextEncoder().encode("x".repeat(32)), t)).toBeNull();
    expect(await readAccess(key, "garbage")).toBeNull();
  });
  it("blocks common passwords and hashes tokens and IPs", () => {
    expect(isCommonPassword("Password")).toBe(true);
    expect(isCommonPassword("suoi-mo-xanh")).toBe(false);
    expect(sha256("a")).toHaveLength(64);
    const key = new TextEncoder().encode("k");
    expect(ipHash(key, "1.2.3.4")).toBe(ipHash(key, "1.2.3.4"));
    expect(ipHash(key, "1.2.3.4")).not.toBe(ipHash(key, "1.2.3.5"));
  });
});
