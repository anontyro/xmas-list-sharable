"use client";

import Link, { type LinkProps } from "@mui/material/Link";
import NextLink from "next/link";

/** MUI Link that navigates with Next. A client component, so server pages can use it (they cannot pass `component={NextLink}`). */
export default function AppLink(props: Omit<LinkProps<typeof NextLink>, "component">) {
  return <Link component={NextLink} {...props} />;
}
