import { describe, expect, it } from "vitest";
import { isActive } from "@/components/layout/nav";

describe("isActive", () => {
  it("matches the home page only exactly", () => {
    expect(isActive("/", ["/", "/earlier"])).toBe(true);
    expect(isActive("/planner", ["/"])).toBe(false);
    expect(isActive("/l/a8Kp2vQx9m", ["/"])).toBe(false);
  });

  it("matches a path and everything beneath it, but not a look-alike prefix", () => {
    expect(isActive("/planner", ["/planner"])).toBe(true);
    expect(isActive("/planner/budget", ["/planner"])).toBe(true);
    expect(isActive("/plannerx", ["/planner"])).toBe(false);
    expect(isActive("/l/a8Kp2vQx9m", ["/l"])).toBe(true);
    expect(isActive("/earlier/2025", ["/", "/earlier"])).toBe(true);
  });

  it("matches any of several paths and none of an empty list", () => {
    expect(isActive("/owner/lists/abc", ["/owner/lists"])).toBe(true);
    expect(isActive("/owner", ["/owner/lists"])).toBe(false);
    expect(isActive("/x", [])).toBe(false);
  });
});
