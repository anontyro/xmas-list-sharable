import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const lint = async (filePath: string, code: string) => {
  const [r] = await new ESLint().lintText(code, { filePath });
  return r.messages.filter((m) => m.ruleId === "no-restricted-imports");
};

const claimImport = 'import { getItemState } from "@/features/reservations/guest-claim-view";\nexport const x = getItemState;\n';

describe("owner/admin isolation lint rule", () => {
  it.each([
    "src/app/(owner)/owner/page.tsx",
    "src/app/(admin)/admin/page.tsx",
    "src/features/family/queries.ts",
    "src/features/wishlists/owner-queries.ts",
    "src/features/wishlists/components/OwnerItemList.tsx",
  ])("forbids claim imports in %s", async (file) => {
    expect(await lint(file, claimImport)).toHaveLength(1);
  });
  it("forbids planner imports too", async () => {
    expect(await lint("src/app/(owner)/owner/page.tsx", 'import { x } from "@/features/planner/queries";\nexport { x };\n')).toHaveLength(1);
  });
  it("allows the public side to use claims", async () => {
    expect(await lint("src/features/wishlists/public-queries.ts", claimImport)).toHaveLength(0);
    expect(await lint("src/app/(public)/l/[slug]/page.tsx", claimImport)).toHaveLength(0);
  });
});
