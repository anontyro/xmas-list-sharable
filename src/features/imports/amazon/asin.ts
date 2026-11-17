const ASIN_IN_PATH = /\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?![A-Z0-9])/;

/** The ASIN in an Amazon product path or URL, or null. */
export const asinFrom = (href: string): string | null => ASIN_IN_PATH.exec(href)?.[1] ?? null;

export const productUrl = (asin: string) => `https://www.amazon.co.uk/dp/${asin}`;
