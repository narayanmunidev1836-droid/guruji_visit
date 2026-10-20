import { describe, expect, it } from "vitest";
import { AUDIENCE, signToken, verifyToken } from "@/lib/auth/jwt";

describe("signed session tokens", () => {
  it("round-trips a payload for the right audience", async () => {
    const token = await signToken({ sub: "7" }, { audience: AUDIENCE.SESSION, expiresInSeconds: 60 });
    const payload = await verifyToken(token, AUDIENCE.SESSION);
    expect(payload?.sub).toBe("7");
  });

  it("rejects a different audience, an expired token, a tampered token and garbage", async () => {
    const token = await signToken({ sub: "7" }, { audience: AUDIENCE.SESSION, expiresInSeconds: 60 });
    expect(await verifyToken(token, "gpa:other")).toBeNull();

    const expired = await signToken({ sub: "7" }, { audience: AUDIENCE.SESSION, expiresInSeconds: -10 });
    expect(await verifyToken(expired, AUDIENCE.SESSION)).toBeNull();

    const [head, body, signature] = token.split(".");
    expect(await verifyToken(`${head}.${body}.${signature.slice(0, -2)}xx`, AUDIENCE.SESSION)).toBeNull();
    expect(await verifyToken("not-a-token", AUDIENCE.SESSION)).toBeNull();
    expect(await verifyToken(null, AUDIENCE.SESSION)).toBeNull();
  });
});
