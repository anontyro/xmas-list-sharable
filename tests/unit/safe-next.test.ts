import { describe, expect, it } from "vitest";
import { safeNext } from "@/features/authentication/safe-next";

describe("safeNext", () => {
  it.each([
    "/", "/planner", "/access", "/l/a8Kp2vQx9m", "/l/a8Kp2vQx9m?sort=price_asc&priority=most_wanted,would_love&max=25.50", "/l/a8Kp2vQx9m?",
  ])("keeps %j", (path) => {
    expect(safeNext(path)).toBe(path);
  });

  it.each([
    "https://evil.example", "http://localhost:3217/", "//evil.example", "//evil.example/l/a8Kp2vQx9m", "/\\evil.example", "\\\\evil.example", "/l/\\evil",
    "/l/short", "/l/a8Kp2vQx9mX", "/l/a8Kp2vQx9", "/l/", "/l", "/owner", "/admin", "/owner/login", "/planner/budget", "/planner?x=1", "/access/",
    "/l/a8Kp2vQx9m#frag", "/l/a8Kp2vQx9m?x=<script>", "/l/a8Kp2vQx9m?x= 1", "/l/a8Kp2vQx9m?x=1\n", "/\n", " /", "/ ", "",
    "javascript:alert(1)", "data:text/html,hi", "l/a8Kp2vQx9m", "/../admin", "/l/../admin",
  ])("sends %j to the home page", (path) => {
    expect(safeNext(path)).toBe("/");
  });

  it("sends anything that is not a string, or is too long, to the home page", () => {
    for (const v of [undefined, null, 42, {}, ["/planner"], true]) expect(safeNext(v)).toBe("/");
    expect(safeNext(`/l/a8Kp2vQx9m?x=${"a".repeat(300)}`)).toBe("/");
    expect(safeNext(`/l/a8Kp2vQx9m?x=${"a".repeat(270)}`)).toBe(`/l/a8Kp2vQx9m?x=${"a".repeat(270)}`);
  });
});
