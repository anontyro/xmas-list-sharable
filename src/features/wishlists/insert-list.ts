import { getDb } from "@/db/client";
import { wishlist } from "@/db/schema";
import { fail, ok } from "@/lib/result";
import { generateSlug } from "./slug";

type ListFields = { title: string; occasion: string; year: number };

const pgCode = (e: unknown) => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
};

/** The one place a list is inserted: a random slug (drawn again on a collision) and a draft or published state. Shared by the admin and the member (decision 0029). */
export async function insertList(memberId: string, fields: ListFields, publish: boolean) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [l] = await getDb()
        .insert(wishlist)
        .values({ ...fields, memberId, slug: generateSlug(), publishedAt: publish ? new Date() : null })
        .returning({ id: wishlist.id, slug: wishlist.slug });
      return ok(l);
    } catch (e) {
      const code = pgCode(e);
      if (code === "23503") return fail("NOT_FOUND", "That member no longer exists");
      if (code !== "23505") throw e; // a slug collision: draw another
    }
  }
  return fail("SLUG_COLLISION", "Could not create the list, please try again");
}
