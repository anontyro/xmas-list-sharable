/** A product the owner can review and edit before saving. Shared by the URL importer and the Amazon importer. */
export type ImportDraft = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceMinor: number | null;
  currency: string | null;
  canonicalUrl: string | null;
  sourceUrl: string;
  /** Things the owner should look at: missing or doubtful fields. */
  warnings: string[];
};
