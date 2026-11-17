"use client";

import { useState } from "react";
import Sticker from "@/components/ui/Sticker";
import { stickerForGift } from "./gift-sticker";
import Thumb from "./Thumb";
import { tintFor } from "./tint";

type Props = { id: string; title: string; imageUrl: string | null };

/** The picture or sticker for a gift: the product picture when there is one and it loads, else a sticker chosen from the title. */
export function GiftThumbView({ id, title, imageUrl, failed, onImageError }: Props & { failed: boolean; onImageError?: () => void }) {
  return (
    <Thumb tint={tintFor(id)}>
      {imageUrl && !failed ? (
        // A plain <img>: owners paste any host, which next/image would need configured one by one. The title is next to it, so it is decorative.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={onImageError} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Sticker name={stickerForGift(title, id)} width={40} />
      )}
    </Thumb>
  );
}

export default function GiftThumb(props: Props) {
  // Remember which URL failed, so a new picture link gets a fresh try without an effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <GiftThumbView {...props} failed={props.imageUrl !== null && failedUrl === props.imageUrl} onImageError={() => setFailedUrl(props.imageUrl)} />;
}
