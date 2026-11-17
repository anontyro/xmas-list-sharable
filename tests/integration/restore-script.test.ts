import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { db } from "./db-harness";
import { household } from "@/db/schema";

const hasPg = spawnSync("psql", ["--version"]).status === 0 && spawnSync("pg_restore", ["--version"]).status === 0;
const url = process.env.DATABASE_URL!; // the integration config points this at the test database

describe.skipIf(!hasPg)("scripts/restore.sh", () => {
  it("refuses a database that already has tables and leaves its data alone", async () => {
    await db.insert(household).values({ name: "Keep me" });
    const dump = join(mkdtempSync(join(tmpdir(), "fg-")), "x.dump");
    writeFileSync(dump, "not a real dump"); // never read: the emptiness check comes first
    const r = spawnSync("scripts/restore.sh", [dump, url], { encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/already has \d+ tables/);
    expect(await db.select().from(household)).toHaveLength(1);
  });

  it("needs both arguments and an existing dump file", () => {
    expect(spawnSync("scripts/restore.sh", [], { encoding: "utf8" }).status).not.toBe(0);
    expect(spawnSync("scripts/restore.sh", ["/nope.dump", url], { encoding: "utf8" }).stderr).toContain("No such dump file");
  });

  it("backup.sh dumps the database it is given, not the one in .env", () => {
    const empty = url.replace(/\/[^/]+$/, "/postgres"); // the maintenance database has none of our tables
    const dir = mkdtempSync(join(tmpdir(), "fg-bk-"));
    const run = (target: string) => execFileSync("pg_restore", ["-l", execFileSync("scripts/backup.sh", { env: { ...process.env, DATABASE_URL: target, BACKUP_DIR: dir }, encoding: "utf8" }).trim()], { encoding: "utf8" });
    expect(run(url)).toContain("household");
    expect(run(empty)).not.toContain("household");
  });
});
