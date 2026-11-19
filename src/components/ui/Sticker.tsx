import Image from "next/image";
import type { CSSProperties } from "react";
import { stickerOutline } from "@/theme/tokens";
import { STICKERS, type StickerName } from "./sticker-names";

type StickerProps = {
  name: StickerName;
  /** Rendered width in px; the height follows the sticker's own shape. */
  width?: number;
  /** Empty (decorative) unless the sticker is the only label for something. */
  alt?: string;
  style?: CSSProperties;
};

export default function Sticker({ name, width = 48, alt = "", style }: StickerProps) {
  const [w, h] = STICKERS[name];
  return <Image src={`/stickers/${name}.png`} alt={alt} width={width} height={Math.round((width * h) / w)} style={{ objectFit: "contain", filter: stickerOutline, ...style }} />;
}
