// Compares regenerated fixtures with the committed ones by value, not by bytes.
//
// CI regenerates the answer keys on Linux x86, while they are committed from
// another machine, so the last bits of some floats may differ. The rules:
//   - The same set of files on both sides (.gitkeep ignored).
//   - JSON files: same structure (array lengths, object keys), equal strings,
//     booleans and null, integers equal exactly (qubit indices, counts, ids), and
//     any other number within the tolerance (default 1e-10).
//   - MANIFEST.json: the same file list and the same meta. Its hashes are not
//     compared, since they depend on the bytes; pnpm check:fixtures checks the
//     committed hashes against the committed files.
//   - Any other file: equal bytes.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

export const DEFAULT_TOLERANCE = 1e-10;
const MANIFEST = "MANIFEST.json";
const IGNORED = new Set([".gitkeep"]);

function kindOf(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function show(v: unknown): string {
  const kind = kindOf(v);
  if (kind === "array" || kind === "object") return kind;
  return typeof v === "number" ? String(v) : JSON.stringify(v);
}

/** Differences between two parsed JSON values, one line each, with a JSON path. */
export function compareJson(
  committed: unknown,
  regenerated: unknown,
  tol: number,
  where = "$",
): string[] {
  const kind = kindOf(committed);
  if (kind !== kindOf(regenerated)) {
    return [`${where}: ${show(committed)} vs ${show(regenerated)} (different types)`];
  }
  if (kind === "number") {
    const a = committed as number;
    const b = regenerated as number;
    if (Number.isInteger(a) && Number.isInteger(b))
      return a === b ? [] : [`${where}: ${show(a)} vs ${show(b)}`];
    return Math.abs(a - b) <= tol
      ? []
      : [`${where}: ${show(a)} vs ${show(b)} (differs by more than ${String(tol)})`];
  }
  if (kind === "array") {
    const a = committed as unknown[];
    const b = regenerated as unknown[];
    if (a.length !== b.length)
      return [`${where}: array length ${String(a.length)} vs ${String(b.length)}`];
    return a.flatMap((x, i) => compareJson(x, b[i], tol, `${where}[${String(i)}]`));
  }
  if (kind === "object") {
    const a = committed as Record<string, unknown>;
    const b = regenerated as Record<string, unknown>;
    const errors: string[] = [];
    for (const key of Object.keys(a))
      if (!(key in b)) errors.push(`${where}: key ${key} only in the committed file`);
    for (const key of Object.keys(b))
      if (!(key in a)) errors.push(`${where}: key ${key} only in the regenerated file`);
    for (const key of Object.keys(a)) {
      if (key in b) errors.push(...compareJson(a[key], b[key], tol, `${where}.${key}`));
    }
    return errors;
  }
  return committed === regenerated ? [] : [`${where}: ${show(committed)} vs ${show(regenerated)}`];
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => !e.isDirectory())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join("/"))
    .filter((rel) => !IGNORED.has(rel));
}

/** The manifest with each hash replaced, so only its file list and meta are compared. */
function withoutHashes(manifest: unknown): unknown {
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) return manifest;
  const m = manifest as Record<string, unknown>;
  const files = m.files;
  if (typeof files !== "object" || files === null || Array.isArray(files)) return manifest;
  return { ...m, files: Object.fromEntries(Object.keys(files).map((k) => [k, "<hash>"])) };
}

function parse(file: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { ok: false };
  }
}

/** Every difference between the committed folder and a regenerated one; empty if they agree. */
export function compareFixtureDirs(
  committedDir: string,
  regeneratedDir: string,
  tol = DEFAULT_TOLERANCE,
): string[] {
  for (const dir of [committedDir, regeneratedDir]) {
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return [`${dir}: not a folder`];
  }
  const a = new Set(listFiles(committedDir));
  const b = new Set(listFiles(regeneratedDir));
  const errors: string[] = [];
  for (const rel of [...new Set([...a, ...b])].sort()) {
    if (!b.has(rel)) {
      errors.push(`${rel}: only in the committed fixtures`);
      continue;
    }
    if (!a.has(rel)) {
      errors.push(`${rel}: only in the regenerated output`);
      continue;
    }
    const fa = path.join(committedDir, rel);
    const fb = path.join(regeneratedDir, rel);
    if (!rel.endsWith(".json")) {
      if (!readFileSync(fa).equals(readFileSync(fb))) errors.push(`${rel}: bytes differ`);
      continue;
    }
    const pa = parse(fa);
    const pb = parse(fb);
    if (!pa.ok || !pb.ok) {
      errors.push(
        `${rel}: not valid JSON in the ${pa.ok ? "regenerated output" : "committed fixtures"}`,
      );
      continue;
    }
    const [va, vb] =
      rel === MANIFEST ? [withoutHashes(pa.value), withoutHashes(pb.value)] : [pa.value, pb.value];
    errors.push(...compareJson(va, vb, tol).map((e) => `${rel}: ${e}`));
  }
  return errors;
}
