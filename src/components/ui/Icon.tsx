import Image from "next/image";
import type { IconName } from "./icon-names";

type IconProps = {
  name: IconName;
  size?: number;
  /** Empty (decorative) unless the icon is the only label for something. */
  alt?: string;
};

export default function Icon({ name, size = 48, alt = "" }: IconProps) {
  return <Image src={`/icons/${name}.png`} alt={alt} width={size} height={size} />;
}
