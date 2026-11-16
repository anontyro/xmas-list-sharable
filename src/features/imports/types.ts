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

/** A draft from the Amazon importer. `uncertain` means a field is missing or doubtful, so the owner should look at it. */
export type AmazonDraft = ImportDraft & { uncertain: boolean };
