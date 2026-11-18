import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STICKERS } from "@/components/ui/sticker-names";
import { AVATAR_STICKERS, avatarSchema, toAvatar } from "@/features/family/avatars";

describe("AVATAR_STICKERS", () => {
  it("is the eight pictures of decision 0020, each a real sticker file", () => {
    expect([...AVATAR_STICKERS].sort()).toEqual(["child", "gingerbread", "holly", "reindeer", "santahat", "snowflake", "snowglobe", "star"]);
    for (const name of AVATAR_STICKERS) {
      expect(name in STICKERS).toBe(true);
      expect(existsSync(`public/stickers/${name}.png`)).toBe(true);
    }
  });

  it("accepts a listed name and rejects anything else", () => {
    expect(avatarSchema.safeParse("holly").success).toBe(true);
    for (const bad of ["tree", "Holly", "", "../holly", null, 3]) expect(avatarSchema.safeParse(bad).success).toBe(false);
  });

  it("reads a stored value as a picture, or null for no picture or a name that has since left the list", () => {
    expect(toAvatar("star")).toBe("star");
    expect(toAvatar(null)).toBeNull();
    expect(toAvatar("tree")).toBeNull();
  });
});
