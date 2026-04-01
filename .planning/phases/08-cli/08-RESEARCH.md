# Phase 8: CLI - Research

**Researched:** 2026-03-31
**Domain:** Node.js CLI tooling, zero-dependency argument parsing, terminal output
**Confidence:** HIGH

## Summary

Phase 8 builds the CLI layer on top of the fully-implemented core library. The CLI package at `packages/cli/` already exists as a scaffold that re-exports `VERSION` from `@logic-md/core`. The three commands (`validate`, `lint`, `compile`) all compose core exports: `parse`, `validate`, `resolve` (DAG), `resolveImports`, and `evaluate`. The "zero additional dependencies" constraint means we use only Node.js built-in APIs.

The key technical decisions are straightforward: use `node:util.parseArgs` for argument parsing (stable since Node 20, available experimentally since Node 18.3) and raw ANSI escape codes for colorized output (universal, zero overhead, avoids `node:util.styleText` version concerns). The CLI entry point needs a `#!/usr/bin/env node` shebang and a `bin` field in `package.json`. The lint command is the only new logic -- it performs best-practice checks (unused steps, unreachable branches, missing fallbacks) that go beyond schema validation.

**Primary recommendation:** Flat file structure in `packages/cli/` with `cli.ts` as the entry point dispatching to `commands/validate.ts`, `commands/lint.ts`, and `commands/compile.ts`. Use `node:util.parseArgs` for arg parsing and a small `format.ts` utility wrapping ANSI escape codes for colored output.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLI-01 | `logic-md validate <file>` -- validate a LOGIC.md file and report errors | Core `validate()` already does full schema validation with line numbers. CLI wraps it with file reading and formatted output. |
| CLI-02 | `logic-md lint <file>` -- check best practices (unused steps, unreachable branches, missing fallbacks) | New lint logic needed. DAG `resolve()` already detects unreachable steps. Additional checks: steps with no description, branches without default, missing fallback section. |
| CLI-03 | `logic-md compile <file>` -- output compiled reasoning scaffold | New compile logic. Parse + validate + resolve DAG + resolve imports, then output the resolved spec as structured JSON or formatted scaffold. |
| CLI-04 | Exit codes: 0 = success, 1 = validation errors, 2 = file not found | `process.exit()` with correct codes. Wrap file reads in try/catch for ENOENT detection. |
| CLI-05 | Colorized terminal output with error/warning/info levels | ANSI escape codes in a `format.ts` utility. Red for errors, yellow for warnings, cyan for info, green for success. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `node:util` | Node 20+ | `parseArgs` for CLI argument parsing | Built-in, stable since Node 20, zero dependencies |
| `node:fs` | Node 18+ | `readFileSync` for reading .logic.md files | Built-in file I/O |
| `node:path` | Node 18+ | `resolve`, `dirname` for file path handling | Built-in path utilities |
| `node:process` | Node 18+ | `process.exit()`, `process.argv`, `process.stderr` | Built-in process control |
| `@logic-md/core` | workspace | All parsing, validation, DAG, imports, expression APIs | The core library this CLI wraps |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Raw ANSI codes | N/A | Terminal colorization | Always -- avoids `styleText` version concerns |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:util.parseArgs` | Manual `process.argv` slicing | parseArgs handles edge cases (flags, boolean options, unknown args) properly |
| Raw ANSI codes | `node:util.styleText` | styleText only stable in Node 22.17+; project targets Node 18+. ANSI codes work everywhere. |
| Raw ANSI codes | `chalk` | Would add a dependency -- violates zero-dep constraint |
| `node:util.parseArgs` | `commander` / `yargs` | Would add a dependency -- violates zero-dep constraint |

**Installation:**
```bash
# No additional installation needed -- all built-in Node APIs + workspace dependency
```

## Architecture Patterns

### Recommended Project Structure
```
packages/cli/
  cli.ts              # Entry point with shebang, arg parsing, command dispatch
  commands/
    validate.ts       # validate command implementation
    lint.ts           # lint command implementation  
    compile.ts        # compile command implementation
  format.ts           # ANSI color helpers + output formatting
  index.ts            # Public API re-exports (VERSION, etc.)
  index.test.ts       # Existing test
  cli.test.ts         # CLI integration tests
  commands/
    validate.test.ts  # validate command tests
    lint.test.ts      # lint command tests
    compile.test.ts   # compile command tests
  package.json        # Needs bin field added
  tsconfig.json       # Existing config
  vitest.config.ts    # Existing config
```

### Pattern 1: Command Dispatch with parseArgs
**What:** Single entry point parses the first positional as the subcommand, then delegates to the appropriate handler.
**When to use:** Always -- this is the CLI entry point pattern.
**Example:**
```typescript
#!/usr/bin/env node
// cli.ts
import { parseArgs } from "node:util";

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    help: { type: "boolean", short: "h", default: false },
    json: { type: "boolean", default: false },
    version: { type: "boolean", short: "v", default: false },
  },
});

const [command, ...rest] = positionals;

switch (command) {
  case "validate":
    await runValidate(rest[0], values);
    break;
  case "lint":
    await runLint(rest[0], values);
    break;
  case "compile":
    await runCompile(rest[0], values);
    break;
  default:
    printUsage();
    process.exit(command ? 1 : 0);
}
```

### Pattern 2: Result-Based Error Flow
**What:** Each command function returns an exit code. The entry point calls `process.exit()` once at the top level.
**When to use:** Always -- keeps command functions testable by not calling process.exit internally.
**Example:**
```typescript
// commands/validate.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validate } from "@logic-md/core";
import { formatError, formatSuccess } from "../format.js";

export function runValidate(
  filePath: string | undefined,
  options: { json?: boolean },
): number {
  if (!filePath) {
    console.error(formatError("No file specified. Usage: logic-md validate <file>"));
    return 1;
  }

  const absPath = resolve(filePath);
  let content: string;
  try {
    content = readFileSync(absPath, "utf-8");
  } catch {
    console.error(formatError(`File not found: ${filePath}`));
    return 2; // Exit code 2 for file not found
  }

  const result = validate(content);
  if (result.ok) {
    console.log(formatSuccess("Valid LOGIC.md file"));
    return 0;
  }

  for (const err of result.errors) {
    const loc = err.line ? `:${err.line}${err.column ? `:${err.column}` : ""}` : "";
    console.error(formatError(`${filePath}${loc}: ${err.message}`));
  }
  return 1;
}
```

### Pattern 3: ANSI Color Utility
**What:** Thin wrapper around ANSI escape codes for colored terminal output.
**When to use:** All user-facing output.
**Example:**
```typescript
// format.ts
const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// Respect NO_COLOR env variable (https://no-color.org/)
const noColor = "NO_COLOR" in process.env || process.env.TERM === "dumb";

function colorize(code: string, text: string): string {
  return noColor ? text : `${code}${text}${RESET}`;
}

export function formatError(msg: string): string {
  return colorize(RED, `error: ${msg}`);
}

export function formatWarning(msg: string): string {
  return colorize(YELLOW, `warning: ${msg}`);
}

export function formatInfo(msg: string): string {
  return colorize(CYAN, `info: ${msg}`);
}

export function formatSuccess(msg: string): string {
  return colorize(GREEN, msg);
}
```

### Pattern 4: Lint as Pure Function
**What:** The lint command performs best-practice analysis beyond schema validation. It uses `parse()` to get the spec, then runs checks.
**When to use:** CLI-02 implementation.
**Example:**
```typescript
// commands/lint.ts -- lint checks as pure functions on LogicSpec

export interface LintDiagnostic {
  level: "warning" | "info";
  message: string;
  step?: string;
}

export function lintSpec(spec: LogicSpec): LintDiagnostic[] {
  const diagnostics: LintDiagnostic[] = [];

  if (spec.steps) {
    // Check 1: Steps without descriptions
    for (const [name, step] of Object.entries(spec.steps)) {
      if (!step.description) {
        diagnostics.push({
          level: "info",
          message: `Step "${name}" has no description`,
          step: name,
        });
      }
    }

    // Check 2: Unreachable steps (use DAG resolver)
    const dagResult = resolve(spec.steps);
    if (!dagResult.ok) {
      for (const err of dagResult.errors) {
        if (err.type === "unreachable") {
          diagnostics.push({
            level: "warning",
            message: err.message,
          });
        }
      }
    }

    // Check 3: Branches without a default
    for (const [name, step] of Object.entries(spec.steps)) {
      if (step.branches?.length && !step.branches.some((b) => b.default)) {
        diagnostics.push({
          level: "warning",
          message: `Step "${name}" has branches but no default branch`,
          step: name,
        });
      }
    }
  }

  // Check 4: Missing fallback section
  if (!spec.fallback) {
    diagnostics.push({
      level: "info",
      message: "No fallback configuration defined",
    });
  }

  return diagnostics;
}
```

### Anti-Patterns to Avoid
- **Calling process.exit() inside command functions:** Makes functions untestable. Return exit codes instead; call process.exit() once at the top level.
- **Throwing errors for expected failures:** Validation errors and file-not-found are expected outcomes, not exceptions. Use return values.
- **Ignoring NO_COLOR:** The CLI should respect the `NO_COLOR` environment variable per https://no-color.org/ convention.
- **Mixing stderr and stdout:** Errors and warnings go to `stderr`; data output (like compile results) goes to `stdout` so it can be piped.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Argument parsing | Custom argv parser | `node:util.parseArgs` | Handles edge cases: `--flag=value`, `-hv` shorthand expansion, unknown option errors |
| Schema validation | Custom YAML checks | `@logic-md/core.validate()` | Already handles all JSON Schema validation with line numbers |
| DAG analysis | Custom graph traversal | `@logic-md/core.resolve()` | Already does topo sort, cycle detection, unreachable detection |
| YAML parsing | Custom parser | `@logic-md/core.parse()` | Already handles frontmatter extraction with error reporting |

**Key insight:** The CLI is a thin presentation layer. All complex logic already exists in `@logic-md/core`. The only new logic is the lint checks (best-practice heuristics) and the compile output formatter.

## Common Pitfalls

### Pitfall 1: Forgetting the Shebang
**What goes wrong:** `npx logic-md validate` fails because Node doesn't know to interpret the file as JavaScript.
**Why it happens:** TypeScript compilation strips shebangs by default in some configurations.
**How to avoid:** Add `#!/usr/bin/env node` as the first line of `cli.ts`. TypeScript 5.x preserves shebangs in output.
**Warning signs:** "Permission denied" or "cannot execute binary file" errors.

### Pitfall 2: Missing bin Field in package.json
**What goes wrong:** `npx logic-md` doesn't work because npm doesn't know which file to execute.
**Why it happens:** The bin field is not configured in `packages/cli/package.json`.
**How to avoid:** Add `"bin": { "logic-md": "./dist/cli.js" }` to the CLI package.json.
**Warning signs:** "command not found" when running `npx logic-md`.

### Pitfall 3: Exit Code Confusion
**What goes wrong:** Scripts that depend on exit codes break because the wrong code is returned.
**Why it happens:** Mixing up exit code semantics (0/1/2).
**How to avoid:** Define exit codes as constants: `EXIT_SUCCESS = 0`, `EXIT_ERROR = 1`, `EXIT_NOT_FOUND = 2`. Test them explicitly.
**Warning signs:** CI pipelines passing when they should fail.

### Pitfall 4: validate() Expects File Content, Not Spec Object
**What goes wrong:** Passing a parsed LogicSpec to `validate()` instead of raw file content.
**Why it happens:** The core `validate()` function takes the raw file string (with `---` delimiters), not a pre-parsed object. This is because it needs the raw YAML for line number mapping.
**How to avoid:** Read the file, pass the string directly to `validate()`. For lint and compile, use `parse()` first to get the spec object.
**Warning signs:** "No YAML frontmatter found" errors when validation should succeed.

### Pitfall 5: Relative Path Resolution
**What goes wrong:** `logic-md validate ./example.logic.md` fails because the path isn't resolved relative to CWD.
**Why it happens:** File paths need to be resolved against `process.cwd()`.
**How to avoid:** Always `resolve(filePath)` before `readFileSync()`.
**Warning signs:** ENOENT errors for files that exist.

### Pitfall 6: Import Resolver Needs basedir
**What goes wrong:** `resolveImports()` fails to find imported files.
**Why it happens:** `resolveImports(spec, basedir)` requires the directory of the source file as `basedir`, not CWD.
**How to avoid:** Use `dirname(resolve(filePath))` as the basedir argument.
**Warning signs:** "Import file not found" for files that exist relative to the source.

## Code Examples

### Reading a File with Exit Code 2 on Not Found
```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readFile(filePath: string): { content: string } | { error: number } {
  try {
    const absPath = resolve(filePath);
    return { content: readFileSync(absPath, "utf-8") };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EISDIR") {
      return { error: 2 };
    }
    throw err; // Re-throw unexpected errors
  }
}
```

### Compile Command Output Format
```typescript
// The compile command parses, validates, resolves DAG, resolves imports,
// then outputs the resolved reasoning scaffold as JSON
import { dirname } from "node:path";
import { parse, validate, resolve as resolveDag, resolveImports } from "@logic-md/core";
import type { LogicSpec } from "@logic-md/core";

function compileSpec(content: string, filePath: string): 
  { ok: true; scaffold: LogicSpec; levels: string[][] } | 
  { ok: false; exitCode: number; message: string } {
  
  // 1. Parse
  const parseResult = parse(content);
  if (!parseResult.ok) {
    return { ok: false, exitCode: 1, message: parseResult.errors[0]!.message };
  }

  // 2. Validate (uses raw content for line numbers)
  const validResult = validate(content);
  if (!validResult.ok) {
    return { ok: false, exitCode: 1, message: `${validResult.errors.length} validation error(s)` };
  }

  // 3. Resolve imports
  const importResult = resolveImports(parseResult.data, dirname(filePath));
  if (!importResult.ok) {
    return { ok: false, exitCode: 1, message: importResult.errors[0]!.message };
  }

  // 4. Resolve DAG
  const spec = importResult.data;
  if (spec.steps) {
    const dagResult = resolveDag(spec.steps);
    if (!dagResult.ok) {
      return { ok: false, exitCode: 1, message: dagResult.errors[0]!.message };
    }
    return { ok: true, scaffold: spec, levels: dagResult.levels };
  }

  return { ok: true, scaffold: spec, levels: [] };
}
```

### Package.json bin Configuration
```json
{
  "name": "@logic-md/cli",
  "version": "0.0.0",
  "type": "module",
  "bin": {
    "logic-md": "./dist/cli.js"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "dependencies": {
    "@logic-md/core": "*"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `commander` / `yargs` for arg parsing | `node:util.parseArgs` | Node 20 (stable April 2024) | Zero-dependency CLI arg parsing |
| `chalk` for terminal colors | Raw ANSI codes or `node:util.styleText` | Node 22.17 (styleText stable) | Zero-dependency color output |
| CJS bin scripts | ESM with shebang | TypeScript 5.x | Shebangs preserved in TS output |

**Deprecated/outdated:**
- `process.argv` manual slicing: Works but `parseArgs` handles edge cases better
- `chalk` < v5: Was CJS, v5+ is ESM-only -- either way, unnecessary with built-in alternatives

## Open Questions

1. **What exactly should "compile" output?**
   - What we know: The compile command outputs the "compiled reasoning scaffold". This is described as "a simplified version of what M2 will do." The full M2 compiler (COMP-01 through COMP-04) will compile into injectable prompt segments.
   - What's unclear: The exact output format for v1. Is it the fully resolved spec as JSON? A formatted text representation? 
   - Recommendation: Output the fully resolved LogicSpec (after import resolution) as formatted JSON to stdout. Include DAG execution order as a comment/metadata. This is useful immediately and aligns with M2's direction. Add `--json` flag for machine-readable output (default to human-readable scaffold summary).

2. **Should lint checks be in core or cli?**
   - What we know: Lint checks are best-practice heuristics, not schema validation.
   - What's unclear: Whether other consumers (VS Code extension, CI tools) would want lint functionality.
   - Recommendation: Put lint logic in a `lint.ts` file within the CLI package for now. It can be moved to core later if needed. The checks are simple enough that extraction is trivial.

3. **parseArgs availability on Node 18**
   - What we know: `parseArgs` is experimental in Node 18.3+, stable in Node 20+. The project has `@types/node: ^22` in devDependencies.
   - What's unclear: Whether any users will actually run on Node 18.
   - Recommendation: Use `parseArgs` -- the types target Node 22+, and the practical minimum is Node 20. Document Node 20+ as the minimum in the CLI package README.

## Sources

### Primary (HIGH confidence)
- Node.js v25 documentation (`node:util.parseArgs`) - https://nodejs.org/api/util.html
- Local codebase analysis of `@logic-md/core` exports and function signatures
- Verified `parseArgs` and `styleText` availability on Node 23.9 via direct testing

### Secondary (MEDIUM confidence)
- Node.js 20.12.0 release notes (styleText introduction) - https://nodejs.org/en/blog/release/v20.12.0
- Node.js chalk-to-styleText migration guide - https://nodejs.org/en/blog/migrations/chalk-to-styletext
- NO_COLOR standard - https://no-color.org/

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All built-in Node.js APIs, verified on current Node version
- Architecture: HIGH - Standard CLI patterns, thin wrapper over well-tested core
- Pitfalls: HIGH - Based on direct codebase analysis (validate() signature, import resolver basedir requirement)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable domain, built-in APIs don't change rapidly)
