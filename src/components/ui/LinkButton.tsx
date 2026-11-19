"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import NextLink from "next/link";

/** A themed button that navigates with Next. A client component, so server pages can use it (they cannot pass `component={NextLink}`). */
export default function LinkButton(props: Omit<ButtonProps<typeof NextLink>, "component">) {
  return <Button component={NextLink} {...props} />;
}
