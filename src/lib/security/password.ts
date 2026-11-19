import { hash, verify } from "@node-rs/argon2";

const PIN = /^\d{6,12}$/;

export class InvalidPinError extends Error {
  constructor() {
    super("PIN must be 6 to 12 digits");
  }
}

export function isValidPin(pin: string): boolean {
  return PIN.test(pin);
}

/** Argon2id with the library defaults (the default algorithm is argon2id). */
export async function hashPin(pin: string): Promise<string> {
  if (!isValidPin(pin)) throw new InvalidPinError();
  return hash(pin);
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  try {
    return await verify(pinHash, pin);
  } catch {
    return false; // a malformed stored hash is a failed login, not a crash
  }
}

// Hashed once, so a member with no PIN costs the same time to check as one with a PIN and sign-in timing does not tell them apart.
const dummyHash = hash("000000");

/** Like `verifyPin`, but a missing hash (no such member, or no PIN set yet) is still checked against a dummy and always fails. */
export async function verifyPinOrDummy(pin: string, pinHash: string | null | undefined): Promise<boolean> {
  const ok = await verifyPin(pin, pinHash ?? (await dummyHash));
  return Boolean(pinHash) && ok;
}
