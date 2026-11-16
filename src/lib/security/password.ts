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
