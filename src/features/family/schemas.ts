import { z } from "zod";
import { isValidPin } from "@/lib/security/password";
import { avatarSchema } from "./avatars";

export const memberName = z.string().trim().min(1, "Enter a name").max(40, "Keep it under 40 characters");
export const pin = z.string().refine(isValidPin, "PIN must be 6 to 12 digits");

export const newMemberInput = z.object({
  displayName: memberName,
  avatar: avatarSchema.nullish(),
  pin: pin.optional(),
});

export type NewMemberInput = z.input<typeof newMemberInput>;

export const listInput = z.object({
  memberId: z.string().uuid(),
  title: z.string().trim().min(1, "Enter a title").max(80),
  occasion: z.string().trim().min(1).max(40).default("Christmas"),
  year: z.number().int().min(2000).max(2100),
});

export type ListInput = z.input<typeof listInput>;
