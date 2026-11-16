import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { fail, ok, type Result } from "@/lib/result";
import { isLoopback, isPublicAddress } from "./ssrf";

export type FetchFailureCode = "BLOCKED_ADDRESS" | "TIMEOUT" | "TOO_LARGE" | "NOT_HTML" | "HTTP_ERROR" | "INVALID_URL";

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 5000;
const MAX_BYTES = 1_000_000;
const USER_AGENT = "FamilyGiftsBot/1.0";

/**
 * Tests may reach a local server on loopback, on any port. Private, link-local and every other blocked range stay blocked.
 * Ignored unless NODE_ENV is "test", so a built production app (which always reports "production") never honours it.
 */
const testHostsAllowed = () => process.env.FG_ALLOW_TEST_HOSTS === "1" && process.env.NODE_ENV === "test";
const addressAllowed = (ip: string) => isPublicAddress(ip) || (testHostsAllowed() && isLoopback(ip));

const failure = (code: FetchFailureCode, message: string) => fail(code, message);

type Page = { html: string; finalUrl: string };

/**
 * Fetches one HTML page for the importers. The address is resolved first, every resulting IP must be public, and the
 * connection is made to that exact IP, so DNS cannot change its answer between the check and the connect.
 * Every redirect hop goes through the same checks. Plain GET, no cookies, nothing from the caller beyond the URL.
 */
export async function safeFetchHtml(rawUrl: string, opts: { timeoutMs?: number } = {}): Promise<Result<Page>> {
  const deadline = Date.now() + (opts.timeoutMs ?? TIMEOUT_MS);
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchOnce(current, deadline);
    if (!("redirect" in res)) return res;
    current = res.redirect;
  }
  return failure("HTTP_ERROR", "Too many redirects");
}

type Hop = Result<Page> | { redirect: string };

async function fetchOnce(rawUrl: string, deadline: number): Promise<Hop> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return failure("INVALID_URL", "That isn't a web address");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return failure("INVALID_URL", "Only http and https addresses work");
  if (url.username || url.password) return failure("INVALID_URL", "Addresses with a login in them aren't allowed");
  const port = url.port === "" ? (url.protocol === "https:" ? 443 : 80) : Number(url.port);
  if (!testHostsAllowed() && port !== 80 && port !== 443) return failure("INVALID_URL", "That address uses an unusual port");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string; family: number }[];
  try {
    addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  } catch {
    return failure("HTTP_ERROR", "That site could not be found");
  }
  if (addresses.length === 0) return failure("HTTP_ERROR", "That site could not be found");
  if (!addresses.every((a) => addressAllowed(a.address))) return failure("BLOCKED_ADDRESS", "That address can't be fetched");
  const pinned = addresses[0];

  const remaining = deadline - Date.now();
  if (remaining <= 0) return failure("TIMEOUT", "The page took too long to answer");

  return new Promise<Hop>((resolve) => {
    const done = (r: Hop) => {
      clearTimeout(timer);
      resolve(r);
    };
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml", "Accept-Encoding": "identity" },
        // Connect to the address we already checked, never to a fresh DNS answer.
        lookup: (_h, opts, cb) => (opts && (opts as { all?: boolean }).all ? (cb as unknown as (e: null, a: unknown) => void)(null, [pinned]) : cb(null, pinned.address, pinned.family)),
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = res.headers.location;
        if (status >= 300 && status < 400 && location) {
          res.resume();
          try {
            return done({ redirect: new URL(location, url).toString() });
          } catch {
            return done(failure("INVALID_URL", "The page redirected somewhere invalid"));
          }
        }
        if (status >= 400 || status < 200) {
          res.resume();
          return done(failure("HTTP_ERROR", `The site answered with an error (${status})`));
        }
        const type = String(res.headers["content-type"] ?? "");
        if (!/text\/html|application\/xhtml\+xml/i.test(type)) {
          res.resume();
          return done(failure("NOT_HTML", "That link isn't a web page"));
        }
        const encoding = String(res.headers["content-encoding"] ?? "identity").toLowerCase();
        if (encoding !== "identity") {
          res.resume();
          return done(failure("HTTP_ERROR", "The site sent a compressed page we can't read"));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            req.destroy();
            return done(failure("TOO_LARGE", "That page is too big to read"));
          }
          chunks.push(chunk);
        });
        res.on("end", () => done(ok({ html: Buffer.concat(chunks).toString("utf8"), finalUrl: url.toString() })));
        res.on("error", () => done(failure("HTTP_ERROR", "The connection broke while reading the page")));
      },
    );
    const timer = setTimeout(() => {
      req.destroy();
      done(failure("TIMEOUT", "The page took too long to answer"));
    }, remaining);
    req.on("error", () => done(failure("HTTP_ERROR", "Could not connect to that site")));
    req.end();
  });
}
