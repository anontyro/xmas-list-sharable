import Image from "next/image";
import type { CSSProperties } from "react";
import { STICKERS, type StickerName } from "./sticker-names";

type StickerProps = {
  name: StickerName;
  /** Rendered width in px; the height follows the sticker's own shape. */
  width?: number;
  /** Empty (decorative) unless the sticker is the only label for something. */
  alt?: string;
  style?: CSSProperties;
};

// The design's `.stk`: a white outline on all four sides plus a soft drop shadow, done in CSS so the PNGs stay plain cut-outs.
const outline =
  "drop-shadow(2px 0 0 #fff) drop-shadow(-2px 0 0 #fff) drop-shadow(0 2px 0 #fff) drop-shadow(0 -2px 0 #fff) drop-shadow(2px 3px 0 rgba(31,42,68,.35))";

export default function Sticker({ name, width = 48, alt = "", style }: StickerProps) {
  const [w, h] = STICKERS[name];
  return <Image src={`/stickers/${name}.png`} alt={alt} width={width} height={Math.round((width * h) / w)} style={{ objectFit: "contain", filter: outline, ...style }} />;
}
