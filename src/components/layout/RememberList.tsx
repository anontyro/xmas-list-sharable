"use client";

import { useEffect } from "react";
import { lastListCookie, parseLastList } from "@/lib/last-list";

/** Remembers the list being viewed, so the "Wishlist" link can come back to it. Renders nothing. */
export default function RememberList({ slug }: { slug: string }) {
  useEffect(() => {
    if (parseLastList(slug)) document.cookie = lastListCookie(slug, window.location.protocol === "https:");
  }, [slug]);
  return null;
}
