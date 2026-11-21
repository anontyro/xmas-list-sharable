import { fail } from "@/lib/result";

const MESSAGES = {
  CLAIM_CONFLICT: "Someone else just reserved this",
  NOT_CLAIMANT: "You haven't reserved this gift",
  ITEM_UNAVAILABLE: "This gift is no longer available",
  OWN_LIST: "This is your own list",
  CONFIRM_REQUIRED: "Please confirm before undoing a purchase",
} as const;

export type ClaimErrorCode = keyof typeof MESSAGES;

export const claimError = (code: ClaimErrorCode) => fail(code, MESSAGES[code]);
