import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5433/db",
  ADMIN_SECRET: "twelve-chars!",
  SESSION_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("accepts a valid set", () => {
    expect(parseEnv(valid).SESSION_SECRET).toHaveLength(32);
  });
  it("rejects a SESSION_SECRET shorter than 32 characters", () => {
    expect(() => parseEnv({ ...valid, SESSION_SECRET: "x".repeat(31) })).toThrow();
  });
  it("rejects a short ADMIN_SECRET and a missing DATABASE_URL", () => {
    expect(() => parseEnv({ ...valid, ADMIN_SECRET: "short" })).toThrow();
    expect(() => parseEnv({ ...valid, DATABASE_URL: undefined })).toThrow();
  });
});
