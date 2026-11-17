import http, { type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const dns = vi.hoisted(() => ({ lookup: vi.fn(), real: (() => Promise.reject(new Error("unset"))) as (host: string, opts: object) => Promise<unknown> }));
vi.mock("node:dns/promises", async (orig) => {
  const real = await orig<typeof import("node:dns/promises")>();
  dns.real = (host: string, opts: object) => real.lookup(host, opts as never);
  dns.lookup.mockImplementation(dns.real);
  return { ...real, default: real, lookup: dns.lookup };
});

import { safeFetchHtml } from "@/lib/security/safe-fetch";

let server: Server;
let base: string;
let requests: string[];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push(`${req.headers.host} ${req.url}`);
    const url = req.url ?? "/";
    if (url === "/ok") return void res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end("<html><title>Hello</title></html>");
    if (url === "/json") return void res.writeHead(200, { "Content-Type": "application/json" }).end("{}");
    if (url === "/gzip") return void res.writeHead(200, { "Content-Type": "text/html", "Content-Encoding": "gzip" }).end("x");
    if (url === "/missing") return void res.writeHead(404, { "Content-Type": "text/html" }).end("nope");
    if (url === "/big") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return void res.end("a".repeat(1_100_000));
    }
    if (url === "/slow") return void setTimeout(() => res.writeHead(200, { "Content-Type": "text/html" }).end("late"), 1500);
    if (url === "/to-private") return void res.writeHead(302, { Location: "http://10.0.0.1/secret" }).end();
    if (url === "/to-metadata") return void res.writeHead(301, { Location: "http://169.254.169.254/latest/meta-data/" }).end();
    if (url === "/to-file") return void res.writeHead(302, { Location: "file:///etc/passwd" }).end();
    const hop = /^\/hop(\d+)$/.exec(url);
    if (hop) {
      const n = Number(hop[1]);
      return void (n === 0 ? res.writeHead(200, { "Content-Type": "text/html" }).end("<html>end</html>") : res.writeHead(302, { Location: `/hop${n - 1}` }).end());
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

const env = process.env as Record<string, string | undefined>;
beforeEach(() => {
  dns.lookup.mockReset();
  dns.lookup.mockImplementation(dns.real); // undo any fake answers left by an earlier test
  requests = [];
  env.FG_ALLOW_TEST_HOSTS = "1";
});
afterEach(() => {
  delete env.FG_ALLOW_TEST_HOSTS;
  env.NODE_ENV = "test";
});

const code = (r: { ok: boolean; error?: { code: string } }) => (r.ok ? "ok" : r.error!.code);

describe("safeFetchHtml", () => {
  it("returns the HTML of a normal page", async () => {
    const r = await safeFetchHtml(`${base}/ok`);
    expect(r).toMatchObject({ ok: true, data: { html: "<html><title>Hello</title></html>", finalUrl: `${base}/ok` } });
  });

  it("follows up to three redirects and refuses a longer chain", async () => {
    expect(code(await safeFetchHtml(`${base}/hop3`))).toBe("ok");
    expect(code(await safeFetchHtml(`${base}/hop5`))).toBe("HTTP_ERROR");
  });

  it("re-checks every redirect hop: private, metadata and non-http targets are refused", async () => {
    expect(code(await safeFetchHtml(`${base}/to-private`))).toBe("BLOCKED_ADDRESS");
    expect(code(await safeFetchHtml(`${base}/to-metadata`))).toBe("BLOCKED_ADDRESS");
    expect(code(await safeFetchHtml(`${base}/to-file`))).toBe("INVALID_URL");
  });

  it("refuses a hostname that resolves to a private address, without connecting", async () => {
    dns.lookup.mockImplementationOnce(async () => [{ address: "10.1.2.3", family: 4 }]);
    expect(code(await safeFetchHtml(`http://sneaky.example:${new URL(base).port}/ok`))).toBe("BLOCKED_ADDRESS");
    expect(requests).toHaveLength(0);
  });

  it("refuses a hostname when any one of its addresses is private", async () => {
    dns.lookup.mockImplementationOnce(async () => [{ address: "93.184.216.34", family: 4 }, { address: "192.168.0.9", family: 4 }]);
    expect(code(await safeFetchHtml("http://mixed.example/ok"))).toBe("BLOCKED_ADDRESS");
  });

  it("connects to the address it checked, not a second DNS answer (no rebinding)", async () => {
    // First answer: loopback (allowed in tests). A later answer would be private; it must never be asked for.
    dns.lookup.mockImplementationOnce(async () => [{ address: "127.0.0.1", family: 4 }]);
    dns.lookup.mockImplementation(async () => [{ address: "10.0.0.1", family: 4 }]);
    const r = await safeFetchHtml(`http://rebind.example:${new URL(base).port}/ok`);
    expect(code(r)).toBe("ok");
    expect(requests[0]).toMatch(/^rebind\.example:\d+ \/ok$/);
  });

  it.each(["http://2130706433/", "http://0x7f000001/", "http://127.1/", "http://0177.0.0.1/", "http://[::ffff:7f00:1]/", "http://[::127.0.0.1]/", "http://localhost/", "http://[::1]/"])(
    "refuses a loopback address written as %s",
    async (url) => {
      delete env.FG_ALLOW_TEST_HOSTS;
      expect(code(await safeFetchHtml(url))).toBe("BLOCKED_ADDRESS");
      expect(requests).toHaveLength(0);
    },
  );

  it("refuses unusual ports (flag off), non-http schemes and logins in the address", async () => {
    delete env.FG_ALLOW_TEST_HOSTS;
    expect(code(await safeFetchHtml("http://93.184.216.34:8080/"))).toBe("INVALID_URL");
    expect(code(await safeFetchHtml("file:///etc/passwd"))).toBe("INVALID_URL");
    expect(code(await safeFetchHtml("ftp://example.com/"))).toBe("INVALID_URL");
    expect(code(await safeFetchHtml("http://user:pass@93.184.216.34/"))).toBe("INVALID_URL");
    expect(code(await safeFetchHtml("not a url"))).toBe("INVALID_URL");
  });

  it("refuses loopback when the test flag is off, and ignores the flag outside the test environment", async () => {
    // Port 80 so only the address rule can be what refuses it.
    delete env.FG_ALLOW_TEST_HOSTS;
    expect(code(await safeFetchHtml("http://127.0.0.1/ok"))).toBe("BLOCKED_ADDRESS");
    env.FG_ALLOW_TEST_HOSTS = "1";
    env.NODE_ENV = "production";
    expect(code(await safeFetchHtml("http://127.0.0.1/ok"))).toBe("BLOCKED_ADDRESS");
    expect(code(await safeFetchHtml(`${base}/ok`))).toBe("INVALID_URL"); // the port rule also stops reaching the test server
    expect(requests).toHaveLength(0);
  });

  it("refuses bodies over 1 MB, non-HTML, compressed and error responses", async () => {
    expect(code(await safeFetchHtml(`${base}/big`))).toBe("TOO_LARGE");
    expect(code(await safeFetchHtml(`${base}/json`))).toBe("NOT_HTML");
    expect(code(await safeFetchHtml(`${base}/gzip`))).toBe("HTTP_ERROR");
    expect(code(await safeFetchHtml(`${base}/missing`))).toBe("HTTP_ERROR");
  });

  it("gives up on a slow response", async () => {
    expect(code(await safeFetchHtml(`${base}/slow`, { timeoutMs: 300 }))).toBe("TIMEOUT");
  });

  it("reports a host that cannot be found", async () => {
    dns.lookup.mockImplementationOnce(async () => {
      throw new Error("ENOTFOUND");
    });
    expect(code(await safeFetchHtml("http://nowhere.example/"))).toBe("HTTP_ERROR");
  });
});
