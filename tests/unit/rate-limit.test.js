import { beforeEach, describe, expect, it } from "vitest";
import { clearAll, hit, peek, reset } from "@/lib/rate-limit";

const rule = { limit: 3, windowMs: 1000 };

beforeEach(() => clearAll());

describe("rate limiter", () => {
  it("allows up to the limit and then blocks", () => {
    expect(hit("k", rule, 0).allowed).toBe(true);
    expect(hit("k", rule, 10).allowed).toBe(true);
    expect(hit("k", rule, 20).allowed).toBe(true);
    const blocked = hit("k", rule, 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("forgets hits after the window passes", () => {
    for (let i = 0; i < 3; i += 1) hit("k", rule, i);
    expect(hit("k", rule, 500).allowed).toBe(false);
    expect(hit("k", rule, 1200).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    for (let i = 0; i < 3; i += 1) hit("a", rule, i);
    expect(hit("a", rule, 10).allowed).toBe(false);
    expect(hit("b", rule, 10).allowed).toBe(true);
  });

  it("peek does not consume a hit", () => {
    for (let i = 0; i < 10; i += 1) expect(peek("k", rule, i).allowed).toBe(true);
  });

  it("reset clears a key (successful login)", () => {
    for (let i = 0; i < 3; i += 1) hit("k", rule, i);
    reset("k");
    expect(hit("k", rule, 10).allowed).toBe(true);
  });
});
