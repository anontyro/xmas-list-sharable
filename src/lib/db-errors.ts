/** The Postgres error code of a failed query (drizzle wraps the driver error in `cause`). */
export const pgCode = (e: unknown): string | undefined => {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.cause?.code ?? err?.code;
};

/** A unique index or constraint refused the write (a taken name, a slug collision, a second active claim). */
export const isUniqueViolation = (e: unknown) => pgCode(e) === "23505";
