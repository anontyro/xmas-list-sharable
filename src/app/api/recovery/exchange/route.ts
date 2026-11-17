import { setSessionCookie } from "@/lib/auth/cookies";
import { createSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/security/client-ip";
import { isBlocked, recordFailure } from "@/lib/security/rate-limit";
import { guestForRecoveryToken } from "@/features/authentication/recovery";

const HEADERS = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
const ATTEMPTS_PER_WINDOW = 10; // per address, per 15 minutes
const NOT_FOUND = () => Response.json({ error: "This link doesn't work." }, { status: 404, headers: HEADERS });

/** Swaps a recovery token for a guest session. Every failure looks the same, so nothing says why a link failed. */
export async function POST(request: Request) {
  const key = `recovery:${await clientIp()}`;
  if (await isBlocked(key)) return Response.json({ error: "Too many attempts. Try again later." }, { status: 429, headers: HEADERS });
  await recordFailure(key, ATTEMPTS_PER_WINDOW);

  const body: unknown = await request.json().catch(() => null);
  const token = body && typeof body === "object" && "token" in body ? (body as { token: unknown }).token : null;
  if (typeof token !== "string" || token.length < 20 || token.length > 100) return NOT_FOUND();

  const guestId = await guestForRecoveryToken(token);
  if (!guestId) return NOT_FOUND();

  const session = await createSession("guest", guestId);
  await setSessionCookie("guest", session.token, session.expiresAt);
  return new Response(null, { status: 204, headers: HEADERS });
}
