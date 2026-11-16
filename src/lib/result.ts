export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (code: string, message: string): Result<never> => ({ ok: false, error: { code, message } });

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

/** Wraps a server action body so a failed guard becomes a normal result instead of a thrown error. */
export async function action<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UnauthorizedError) return fail("UNAUTHORIZED", "Please sign in again.");
    throw e;
  }
}
