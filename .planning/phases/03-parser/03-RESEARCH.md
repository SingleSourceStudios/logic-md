# Phase 3: Parser - Research

**Researched:** 2026-03-31
**Domain:** YAML frontmatter parsing, markdown processing, TypeScript result types
**Confidence:** HIGH

## Summary

Phase 3 builds the core parser module that converts raw LOGIC.md file content (a string) into a typed `LogicSpec` object or descriptive error messages. The parser uses `gray-matter` (already installed at v4.0.3) to extract YAML frontmatter from markdown files, then casts the resulting data to `LogicSpec`.

The critical finding from this research is that **gray-matter throws uncaught exceptions** on invalid YAML and missing closing delimiters. The parser MUST wrap gray-matter calls in try/catch to convert these js-yaml `YAMLException` errors into structured `ParseError[]` results. gray-matter is a CJS module using `export =`, so under the project's `verbatimModuleSyntax` setting, it must be imported via `createRequire` -- the same pattern already used in `schema.ts`.

**Primary recommendation:** Build a single `parser.ts` file with a `parse(input: string)` function that returns a discriminated union `ParseResult = ParseSuccess | ParseFailure`. Use `matter.test()` for frontmatter detection before parsing, wrap `matter()` in try/catch for YAML errors, and handle empty/missing data cases explicitly.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PARS-01 | Extract YAML frontmatter from .md files using gray-matter | gray-matter API fully researched -- `matter(string)` returns `{ data, content }`. Must use `createRequire` for import under verbatimModuleSyntax. |
| PARS-06 | Handle edge cases: empty frontmatter, missing delimiters, invalid YAML | All edge cases tested empirically -- see Common Pitfalls section for exact gray-matter behavior per edge case. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | 4.0.3 | YAML frontmatter extraction from markdown strings | Already installed. De facto standard for frontmatter parsing. Returns `{ data, content, isEmpty }`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| js-yaml | (transitive via gray-matter) | YAML parsing engine | gray-matter uses it internally. YAMLException is the error type thrown on invalid YAML. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | Manual regex + js-yaml | No benefit -- gray-matter handles delimiter detection, language detection, caching. Don't hand-roll. |

**Installation:**
```bash
# Already installed -- no new dependencies needed
```

## Architecture Patterns

### Recommended Project Structure
```
packages/core/
  parser.ts          # parse() function, ParseResult type, ParseError type
  parser.test.ts     # Tests for parser
  types.ts           # LogicSpec (existing, no changes)
  schema.ts          # Schema validator (existing, no changes)
  index.ts           # Add parser exports
```

### Pattern 1: Discriminated Union Result Type
**What:** Return `ParseSuccess | ParseFailure` instead of throwing
**When to use:** Always -- parser is a library function, callers need structured error handling
**Example:**
```typescript
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

export interface ParseSuccess {
  ok: true;
  data: LogicSpec;
  content: string;   // markdown body after frontmatter
}

export interface ParseFailure {
  ok: false;
  errors: ParseError[];
}

export type ParseResult = ParseSuccess | ParseFailure;
```

### Pattern 2: createRequire for CJS Import
**What:** Use Node's `createRequire` to import gray-matter (CJS module with `export =`)
**When to use:** Required due to `verbatimModuleSyntax: true` in tsconfig
**Example:**
```typescript
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const matter = require("gray-matter") as typeof import("gray-matter");
```
This pattern is already established in `schema.ts` for ajv-formats.

### Pattern 3: Pre-check with matter.test()
**What:** Use `matter.test(input)` to detect frontmatter presence before parsing
**When to use:** To differentiate "no frontmatter" (valid edge case returning error) from "has frontmatter but it's broken"
**Example:**
```typescript
if (!matter.test(input)) {
  // No frontmatter delimiters found -- return ParseFailure
}
```

### Anti-Patterns to Avoid
- **Throwing exceptions from parse():** Callers (Phase 4 validator, Phase 7 import resolver, Phase 8 CLI) all need structured errors. Never throw from the public API.
- **Validating schema in the parser:** Phase 4 handles schema validation with ajv. The parser only extracts and casts -- it does NOT validate that the YAML conforms to the LogicSpec JSON Schema.
- **Using `import` for gray-matter:** Will fail under `verbatimModuleSyntax` because gray-matter uses `export =` (CJS).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter extraction | Regex-based `---` splitting | `gray-matter` | Handles edge cases: language tags after `---`, caching, Buffer input, excerpt extraction |
| YAML parsing | Custom YAML parser | `js-yaml` (via gray-matter) | YAML spec is complex, edge cases are numerous |
| Frontmatter detection | String.startsWith('---') | `matter.test()` | Handles edge cases like `----` (not a delimiter) |

**Key insight:** gray-matter solves frontmatter extraction completely. The parser's job is wrapping it with error handling and type casting.

## Common Pitfalls

### Pitfall 1: gray-matter Throws on Invalid YAML
**What goes wrong:** Calling `matter(input)` with malformed YAML between valid `---` delimiters throws a `YAMLException` (from js-yaml). Missing closing `---` also causes a throw because gray-matter treats everything after `---` as YAML.
**Why it happens:** gray-matter delegates YAML parsing to js-yaml which throws on parse failure.
**How to avoid:** Wrap `matter()` in try/catch. Extract line/column from `YAMLException.mark` property (`{ line, column, position }`).
**Warning signs:** Any test with malformed YAML that doesn't use try/catch will crash the test runner.

### Pitfall 2: Empty Frontmatter Returns Empty Object
**What goes wrong:** `---\n---\nContent` is valid and returns `{ data: {}, isEmpty: true }`. This is NOT invalid YAML -- it's explicitly empty frontmatter. The parser must decide: is this a ParseFailure (missing required fields) or ParseSuccess with empty data?
**Why it happens:** gray-matter correctly parses empty frontmatter as an empty object.
**How to avoid:** Return `ParseSuccess` with `data: {}`. Let the downstream validator (Phase 4) reject it for missing `spec_version` and `name`. The parser's job is extraction, not validation.
**Warning signs:** Conflating "empty frontmatter" with "parse error".

### Pitfall 3: No Frontmatter is Not an Error for gray-matter
**What goes wrong:** Input without `---` delimiters returns `{ data: {}, content: fullInput }` with no error. gray-matter treats this as valid markdown with no frontmatter.
**Why it happens:** gray-matter is designed for optional frontmatter.
**How to avoid:** Use `matter.test(input)` to detect frontmatter. If not present, return a `ParseFailure` with a clear message: "No YAML frontmatter found. LOGIC.md files must start with `---`".

### Pitfall 4: CJS Import Under verbatimModuleSyntax
**What goes wrong:** `import matter from 'gray-matter'` fails TypeScript compilation because gray-matter uses `export =` which is incompatible with ESM `import default` under `verbatimModuleSyntax`.
**Why it happens:** Project uses `verbatimModuleSyntax: true` which enforces that import syntax matches the module's actual export style.
**How to avoid:** Use `createRequire(import.meta.url)` pattern from `schema.ts`.

### Pitfall 5: Missing Closing Delimiter Treated as All-YAML
**What goes wrong:** Input like `---\nname: test\nSome markdown without closing ---` causes gray-matter to treat everything after the opening `---` as YAML, which then fails to parse and throws.
**Why it happens:** gray-matter looks for `\n---` as the closing delimiter. If not found, the entire remainder is passed to js-yaml.
**How to avoid:** The try/catch around `matter()` will catch this. The error message from js-yaml will mention the specific YAML parse failure. The parser should wrap it with a more user-friendly message.

## Code Examples

Verified patterns from empirical testing and existing codebase:

### gray-matter Edge Case Behavior (Empirically Verified)
```typescript
// Empty string -> { data: {}, content: "", excerpt: "" }
matter("");

// No frontmatter -> { data: {}, content: "Just markdown", isEmpty: false }
// matter.test("Just markdown") returns false
matter("Just some markdown");

// Empty frontmatter -> { data: {}, content: "Content", isEmpty: true }
matter("---\n---\nContent");

// Valid frontmatter -> { data: { name: "test" }, content: "Body" }
matter("---\nname: test\n---\nBody");

// Missing closing delimiter -> THROWS YAMLException
// gray-matter treats everything after --- as YAML
matter("---\nname: test\nNo closing");

// Invalid YAML in valid delimiters -> THROWS YAMLException
matter("---\n: [broken\n---\nContent");
```

### YAMLException Error Shape
```typescript
// When gray-matter throws, the error has:
interface YAMLExceptionMark {
  line: number;    // 0-based line number
  column: number;  // 0-based column number
  position: number;
}

// Access via: (error as any).mark
// Access reason via: (error as any).reason
```

### createRequire Import Pattern (from schema.ts)
```typescript
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const matter = require("gray-matter") as typeof import("gray-matter");
```

### Recommended parse() Implementation Skeleton
```typescript
export function parse(input: string): ParseResult {
  // 1. Handle empty input
  if (!input || input.trim() === "") {
    return { ok: false, errors: [{ message: "Input is empty" }] };
  }

  // 2. Check for frontmatter presence
  if (!matter.test(input)) {
    return {
      ok: false,
      errors: [{ message: "No YAML frontmatter found. LOGIC.md files must start with ---" }],
    };
  }

  // 3. Extract frontmatter (may throw on invalid YAML)
  try {
    const result = matter(input);

    // 4. Empty frontmatter is valid extraction (validator handles required fields)
    return {
      ok: true,
      data: result.data as LogicSpec,
      content: result.content,
    };
  } catch (error: unknown) {
    // 5. Convert YAML errors to ParseError[]
    return {
      ok: false,
      errors: [yamlExceptionToParseError(error)],
    };
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gray-matter 3.x | gray-matter 4.0.3 (current, stable) | 2018 | Stable API, no changes expected. Last npm publish was 2018 but still the standard. |
| Throw-based error handling | Result type unions | Modern TS pattern | Downstream consumers get type-safe error handling |

**Deprecated/outdated:**
- gray-matter's `eval` option: disabled by default, must never be enabled (security risk)

## Open Questions

1. **Should parse() accept Buffer input?**
   - What we know: gray-matter accepts `string | Buffer`. The phase requirements say `parse(fileContent)` suggesting string.
   - What's unclear: Whether file reading is the parser's job or the caller's job.
   - Recommendation: Accept `string` only. File reading belongs to the caller (CLI in Phase 8, import resolver in Phase 7).

2. **Should the markdown body (`content`) be preserved in the result?**
   - What we know: gray-matter separates `data` (YAML) from `content` (markdown body). The LogicSpec type has no field for markdown content.
   - What's unclear: Whether downstream consumers need the markdown body.
   - Recommendation: Include `content` in `ParseSuccess` for potential use by CLI compile command (Phase 8). It's free to include since gray-matter already separates it.

## Sources

### Primary (HIGH confidence)
- gray-matter v4.0.3 source code and TypeScript definitions -- read directly from node_modules
- Empirical testing of all edge cases via Node.js REPL
- Existing codebase: `schema.ts` (createRequire pattern), `types.ts` (LogicSpec interface), `index.ts` (exports)
- Project `tsconfig.json` (verbatimModuleSyntax, nodenext module resolution)

### Secondary (MEDIUM confidence)
- gray-matter GitHub README (https://github.com/jonschlinkert/gray-matter)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - gray-matter is already installed and its API was empirically verified
- Architecture: HIGH - result type pattern is well-established, createRequire pattern already in codebase
- Pitfalls: HIGH - all edge cases were tested empirically with actual gray-matter output

**Research date:** 2026-03-31
**Valid until:** Indefinite -- gray-matter 4.0.3 is stable (no updates since 2018), project dependencies are locked
