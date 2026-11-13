// ESLint rule `local/engine-imports`: every import must resolve inside an allowed
// folder, or name an allowed package.
//
// The check is on the resolved path, not the specifier text, so `./../ui/App` and
// `../engine/../ui/App` are caught like `../ui/App`. Specifiers are resolved as:
//   ./x, ../x   relative to the importing file
//   /x          the repository root (Vite style), and also as an absolute path
//   src/x       the repository root
//   @/x         src/x
//   anything else is a package (its name is `@scope/name` or `name`; a subpath
//   such as `vitest/node` must be allowed in full).
// The allow-list is the boundary, so a folder that is not listed (src/ui,
// src/game, src/levels, src/i18n, ...) is outside it, whatever its spelling.
// Plain JS (with JSDoc types) so eslint.config.js can load it on Node 22.12.
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");

/**
 * @typedef {{ allowedDirs: string[], allowedPackages?: string[] }} Options
 * allowedDirs are relative to the repository root, such as "src/engine".
 */

/**
 * Every path the specifier could mean, or null if it is a package.
 * @param {string} specifier
 * @param {string} fromFile absolute path of the importing file
 * @returns {string[] | null}
 */
export function resolveCandidates(specifier, fromFile) {
  const spec = specifier.replace(/[?#].*$/, "");
  if (spec.startsWith("./") || spec.startsWith("../") || spec === "." || spec === "..") {
    return [path.resolve(path.dirname(fromFile), spec)];
  }
  if (spec.startsWith("/")) return [path.resolve(spec), path.join(root, spec)];
  if (spec === "src" || spec.startsWith("src/")) return [path.join(root, spec)];
  if (spec.startsWith("@/")) return [path.join(root, "src", spec.slice(2))];
  return null;
}

/**
 * @param {string} file absolute, normalised
 * @param {string} dir relative to the repository root
 */
function isInside(file, dir) {
  const rel = path.relative(path.join(root, dir), file);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

/** @type {import("eslint").Rule.RuleModule} */
export const engineImports = {
  meta: {
    type: "problem",
    docs: { description: "Imports must stay inside the allowed folders and packages." },
    schema: [
      {
        type: "object",
        properties: {
          allowedDirs: { type: "array", items: { type: "string" }, minItems: 1 },
          allowedPackages: { type: "array", items: { type: "string" } },
        },
        required: ["allowedDirs"],
        additionalProperties: false,
      },
    ],
    messages: {
      outside:
        "src/engine must stay pure (see CLAUDE.md): '{{spec}}' resolves to {{target}}, outside {{allowed}}.",
      package:
        "src/engine must stay pure (see CLAUDE.md): package '{{spec}}' is not allowed here{{allowedHint}}.",
      nonLiteral:
        "src/engine must stay pure (see CLAUDE.md): import paths must be string literals.",
    },
  },
  create(context) {
    const options = /** @type {Options} */ (context.options[0]);
    const allowedDirs = options.allowedDirs;
    const allowedPackages = options.allowedPackages ?? [];
    const fromFile = context.physicalFilename;

    /**
     * @param {import("estree").Node} node
     * @param {unknown} source
     */
    function check(node, source) {
      if (
        typeof source !== "object" ||
        source === null ||
        !("value" in source) ||
        typeof source.value !== "string"
      ) {
        context.report({ node, messageId: "nonLiteral" });
        return;
      }
      const spec = source.value;
      const candidates = resolveCandidates(spec, fromFile);
      if (candidates === null) {
        if (!allowedPackages.includes(spec)) {
          const allowedHint =
            allowedPackages.length === 0
              ? " (no packages are)"
              : ` (only ${allowedPackages.join(", ")})`;
          context.report({ node, messageId: "package", data: { spec, allowedHint } });
        }
        return;
      }
      const ok = candidates.some((c) => allowedDirs.some((d) => isInside(c, d)));
      if (!ok) {
        const first = candidates[0] ?? spec;
        context.report({
          node,
          messageId: "outside",
          data: {
            spec,
            target: path.relative(root, first) || ".",
            allowed: allowedDirs.join(", "),
          },
        });
      }
    }

    return {
      ImportDeclaration: (node) => check(node, node.source),
      ExportNamedDeclaration: (node) => {
        if (node.source) check(node, node.source);
      },
      ExportAllDeclaration: (node) => check(node, node.source),
      ImportExpression: (node) => check(node, node.source),
      /** @param {any} node TSImportEqualsDeclaration */
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference?.type === "TSExternalModuleReference") {
          check(node, node.moduleReference.expression);
        }
      },
      /** @param {any} node TSImportType: `import("x").T` in a type position */
      TSImportType(node) {
        check(node, node.source);
      },
    };
  },
};

export default { rules: { "engine-imports": engineImports } };
