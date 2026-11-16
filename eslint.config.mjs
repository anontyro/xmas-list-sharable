import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Owner and admin code must never touch claim or planner data (decision 0006, spec D29).
    files: [
      "src/app/(owner)/**",
      "src/app/(admin)/**",
      "src/features/family/**",
      "src/features/wishlists/owner-*.ts",
      "src/features/wishlists/components/Owner*.tsx",
      "src/features/wishlists/components/ItemForm.tsx",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/reservations", "@/features/reservations/*", "@/features/planner", "@/features/planner/*", "**/features/reservations/**", "**/features/planner/**"],
              message: "Owner and admin code must not import claim or planner code.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);
