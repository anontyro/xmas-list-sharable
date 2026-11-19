import { z } from "zod";

/** The stickers a member can pick as a picture (decision 0020). Checked here, not by the database, so the list can change without a migration. */
export const AVATAR_STICKERS = ["gingerbread", "reindeer", "star", "holly", "child", "santahat", "snowflake", "snowglobe"] as const;

export type AvatarSticker = (typeof AVATAR_STICKERS)[number];

export const avatarSchema = z.enum(AVATAR_STICKERS);

/** A stored value as a picture name, or null (initials) for null or anything no longer in the list. */
export const toAvatar = (value: string | null): AvatarSticker | null => {
  const parsed = avatarSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};
