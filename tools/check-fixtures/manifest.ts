// Checks every file under fixtures/golden against its SHA-256 in MANIFEST.json.
//
// MANIFEST.json is written by the generators in tools/fixtures, never by hand:
//   { "meta": { ... optional, not checked ... },
//     "files": { "<posix path relative to fixtures/golden>": "<sha256 hex>" } }
// Any other top-level key is an error. MANIFEST.json itself and the top-level
// .gitkeep are not listed. With no MANIFEST.json the folder must hold no files.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export const MANIFEST = "MANIFEST.json";
const EXEMPT = new Set([MANIFEST, ".gitkeep"]);
const SHA256 = /^[0-9a-f]{64}$/;

export interface CheckResult {
  /** One line per problem; empty means the folder matches the manifest. */
  errors: string[];
  /** Number of files whose hash was checked. */
  checked: number;
}

interface ListedFile {
  rel: string;
  regular: boolean;
}

function listFiles(dir: string): ListedFile[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => !e.isDirectory())
    .map((e) => ({
      rel: path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join("/"),
      regular: e.isFile(),
    }))
    .filter((f) => !EXEMPT.has(f.rel))
    .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlainRelative(p: string): boolean {
  if (p === "" || p.startsWith("/") || p.includes("\\")) return false;
  return p.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

/** Parse MANIFEST.json into path -> hash, or return the problems with it. */
function readManifest(file: string): { files: Map<string, string> } | { errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { errors: [`${MANIFEST}: not valid JSON`] };
  }
  if (!isPlainObject(raw)) return { errors: [`${MANIFEST}: must be a JSON object`] };

  const errors: string[] = [];
  for (const key of Object.keys(raw)) {
    if (key !== "files" && key !== "meta")
      errors.push(`${MANIFEST}: unknown top-level key "${key}"`);
  }
  if ("meta" in raw && !isPlainObject(raw.meta))
    errors.push(`${MANIFEST}: "meta" must be an object`);
  if (!isPlainObject(raw.files)) {
    errors.push(`${MANIFEST}: "files" must be an object`);
    return { errors };
  }

  const files = new Map<string, string>();
  for (const [rel, hash] of Object.entries(raw.files)) {
    if (!isPlainRelative(rel)) errors.push(`${MANIFEST}: "${rel}" is not a plain relative path`);
    else if (EXEMPT.has(rel)) errors.push(`${MANIFEST}: "${rel}" may not be listed`);
    else if (typeof hash !== "string" || !SHA256.test(hash)) {
      errors.push(`${MANIFEST}: "${rel}" must map to a lowercase hex SHA-256`);
    } else files.set(rel, hash);
  }
  return errors.length > 0 ? { errors } : { files };
}

export function checkGoldenDir(dir: string): CheckResult {
  const onDisk = listFiles(dir);
  const manifestPath = path.join(dir, MANIFEST);

  if (!existsSync(manifestPath)) {
    return {
      errors: onDisk.map((f) => `${f.rel}: not listed in ${MANIFEST} (there is no ${MANIFEST})`),
      checked: 0,
    };
  }

  const manifest = readManifest(manifestPath);
  if ("errors" in manifest) return { errors: manifest.errors, checked: 0 };

  const errors: string[] = [];
  let checked = 0;
  for (const f of onDisk) {
    const expected = manifest.files.get(f.rel);
    if (!f.regular) {
      errors.push(`${f.rel}: not a regular file`);
    } else if (expected === undefined) {
      errors.push(`${f.rel}: not listed in ${MANIFEST}`);
    } else {
      const actual = createHash("sha256")
        .update(readFileSync(path.join(dir, f.rel)))
        .digest("hex");
      if (actual !== expected)
        errors.push(`${f.rel}: SHA-256 is ${actual}, ${MANIFEST} says ${expected}`);
      checked++;
    }
  }
  const present = new Set(onDisk.map((f) => f.rel));
  for (const rel of manifest.files.keys()) {
    if (!present.has(rel)) errors.push(`${rel}: listed in ${MANIFEST} but missing`);
  }
  return { errors, checked };
}
