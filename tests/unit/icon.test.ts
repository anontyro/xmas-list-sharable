import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import Icon from "@/components/ui/Icon";
import { ICON_NAMES } from "@/components/ui/icon-names";

describe("Icon", () => {
  it("is decorative by default and uses the given alt otherwise", () => {
    expect(renderToStaticMarkup(createElement(Icon, { name: "christmas/holly" }))).toContain('alt=""');
    expect(renderToStaticMarkup(createElement(Icon, { name: "christmas/holly", alt: "Holly" }))).toContain('alt="Holly"');
  });
  it("only accepts known names", () => {
    // @ts-expect-error not an icon in the pack
    createElement(Icon, { name: "christmas/nope" });
  });
  it("has a file for every name", () => {
    expect(ICON_NAMES).toHaveLength(36);
    for (const n of ICON_NAMES) expect(existsSync(`public/icons/${n}.png`), n).toBe(true);
  });
});
