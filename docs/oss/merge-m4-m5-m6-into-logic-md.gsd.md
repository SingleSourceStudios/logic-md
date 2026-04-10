/gsd:quick

## What
Merge the M4/M5/M6 work (CLI extension, MCP server, Claude Code plugin) from the Modular9 codebase into the EXISTING standalone logic-md repo at `~/development/logic-md`. The logic-md repo already exists with M1+M2 complete (v1.1.0 tagged, parser + compiler + CLI v1). The M4/M5/M6 work ended up in Modular9 by accident and needs to be brought home.

## Context
Historical situation discovered just now:

**Already in `~/development/logic-md` (correct home):**
- M1 Core (parser, validator, expression engine, DAG resolver, compiler) — tagged v1.1.0
- M2 Reasoning Compiler — tagged v1.1.0, all 17 phases complete
- Existing structure: packages/core/, packages/cli/ (with 3 v1 commands: validate, lint, compile)
- Git history: main branch, LICENSE, CONTRIBUTING.md, biome.json, vitest.config.ts, tsconfig.json, tsconfig.build.json, .github/ workflows, docs/, examples/, .planning/ folder
- This is the canonical repo

**Accidentally landed in `~/development/modular9/` (needs to move):**
- `packages/logic-md-core/` — vendored copy of the core package from M3 Vercel fix. This is a DUPLICATE of what's already in ~/development/logic-md/packages/core/. It may have drift (e.g., the package.json exports field fix from 6df80eb) that needs to be reconciled.
- `packages/cli/` — M4 CLI extension work. This is a SUPERSET of ~/development/logic-md/packages/cli/ — it has 9 commands instead of 3, plus 12 templates, shell completion, watch mode, diff, fmt, init, test. Contains all the M4 code that should be in the standalone repo.
- `packages/mcp/` — M5 MCP server work. This is NEW — doesn't exist in the standalone repo at all. Contains 7 MCP tools, stdio + HTTP transport, security sandboxing.
- M6 Claude Code plugin work lives at `.claude/commands/logic/` in Modular9 — 5 slash commands. These should also be copied to the standalone repo under `claude-code/` or `integrations/claude-code/`.

The task: bring M4/M5/M6 home to `~/development/logic-md`, reconcile any drift, verify everything still builds and tests green, and leave Modular9's vendored copies untouched for now (Modular9 keeps working via its local packages/ folder until a future cleanup task).

## Success Criteria

### Pre-flight checks
1. Confirm `~/development/logic-md` exists and is a git repo on `main` branch
2. `git status` in `~/development/logic-md` must be clean — if there are uncommitted changes, abort and report
3. Create a new branch `feat/m4-m5-m6-merge` in `~/development/logic-md` for this work
4. Confirm `~/development/modular9/packages/logic-md-core/`, `~/development/modular9/packages/cli/`, and `~/development/modular9/packages/mcp/` all exist

### Reconcile packages/core drift
1. Diff `~/development/modular9/packages/logic-md-core/` against `~/development/logic-md/packages/core/`
2. Identify any files that differ
3. For each difference:
   - If the Modular9 version has the `exports` field fix (main, types, exports block) in package.json from commit 6df80eb — apply that fix to `~/development/logic-md/packages/core/package.json`
   - If there are any source code differences, report them and ask before overwriting (the standalone repo is the canonical source; Modular9's vendored copy should match it, not the other way around, UNLESS Modular9 had necessary fixes)
   - Do NOT blindly copy from Modular9 — the standalone repo is authoritative
4. Commit the reconciliation: "fix(core): apply exports field fix from Modular9 vendored copy"

### Merge packages/cli (M4 extension work)
1. The standalone repo has the v1 CLI with 3 commands (validate, lint, compile). The Modular9 copy has 9 commands plus templates and test fixtures.
2. Copy these NEW files from `~/development/modular9/packages/cli/` to `~/development/logic-md/packages/cli/`:
   - Any new command files in `commands/` that don't exist in the standalone repo (init.ts, test.ts, watch.ts, fmt.ts, diff.ts, completion.ts)
   - Any new test files for those commands
   - The entire `templates/` directory (12 .logic.md template files)
   - Any new fixtures
   - Any new shared utilities referenced by the new commands
3. Reconcile files that exist in BOTH — the Modular9 copy is likely newer. Diff each, apply updates carefully. Report any conflicts.
4. Update `packages/cli/package.json` in the standalone repo to:
   - Bump version to 1.4.0
   - Add any new dependencies introduced by the new commands (chokidar for watch, inquirer or prompts for init, etc.)
   - Ensure `bin` entry points to the built CLI
5. Update `packages/cli/cli.ts` entry point to register all 9 commands
6. Run `npm install` at the root to pick up new workspace dependencies
7. Commit: "feat(cli): merge M4 extension — init, test, watch, fmt, diff, completion, 12 templates"

### Add packages/mcp (M5 MCP server — new package)
1. Create `~/development/logic-md/packages/mcp/` directory
2. Copy ALL files from `~/development/modular9/packages/mcp/` to the new location
3. Ensure `packages/mcp/package.json` has:
   - name: `@logic-md/mcp`
   - version: 1.4.0
   - type: module
   - `@logic-md/core` dependency via `workspace:*`
   - `@modelcontextprotocol/sdk` dependency
   - bin entry: `{ "logic-md-mcp": "./dist/server.js" }` (or whatever the actual entry is)
   - publishConfig: public
   - repository, license, keywords
4. Ensure all internal imports reference `@logic-md/core` (not relative paths to logic-md-core)
5. Update root `package.json` workspaces array to include `packages/mcp`
6. Update root `tsconfig.build.json` to include the new package in project references
7. Run `npm install` at the root
8. Commit: "feat(mcp): merge M5 MCP server — 7 tools, stdio + HTTP transport"

### Copy M6 Claude Code plugin
1. Create `~/development/logic-md/integrations/claude-code/` directory
2. Copy `~/development/modular9/.claude/commands/logic/` contents to `integrations/claude-code/commands/`
3. Copy any related Claude Code plugin docs from Modular9's `docs/claude-code-plugin.md` to `integrations/claude-code/README.md`
4. These files aren't npm-packaged — they're reference/integration files for users to copy into their own .claude/ directory
5. Commit: "feat(claude-code): merge M6 plugin — 5 slash commands, 4 workflow templates"

### Copy documentation
1. Copy from Modular9 to logic-md repo if not already present:
   - `~/development/modular9/docs/LOGIC-md-Specification-v1.0.md` → `~/development/logic-md/docs/SPEC.md` (compare first — standalone repo may already have a version)
   - Any M4/M5/M6 internal GSD prompts → `~/development/logic-md/docs/internal/`
2. Update root `README.md` to document all three packages (core, cli, mcp) plus the Claude Code integration
3. Commit: "docs: update for M4/M5/M6 merge"

### Verification — all packages must build and test green
From `~/development/logic-md` root:
1. `npm install` — clean, no errors
2. `npm run build -w @logic-md/core` — builds successfully
3. `npm run test -w @logic-md/core` — all tests pass (should be the same ~328 from before)
4. `npm run typecheck -w @logic-md/core` — zero errors
5. `npm run lint -w @logic-md/core` — biome clean
6. `npm run build -w @logic-md/cli` — builds successfully
7. `npm run test -w @logic-md/cli` — all tests pass (original v1 tests + new M4 tests)
8. `npm run typecheck -w @logic-md/cli` — zero errors
9. `npm run lint -w @logic-md/cli` — clean
10. `npm run build -w @logic-md/mcp` — builds successfully
11. `npm run test -w @logic-md/mcp` — all tests pass
12. `npm run typecheck -w @logic-md/mcp` — zero errors
13. `npm run lint -w @logic-md/mcp` — clean
14. From root: `npm test` runs all workspace tests and passes
15. `npm run build` at root builds all three packages in correct order (core first)

### CLI smoke tests
After successful build:
```bash
cd ~/development/logic-md
./packages/cli/dist/cli.js validate ./packages/cli/templates/research-synthesizer.logic.md
./packages/cli/dist/cli.js lint ./packages/cli/templates/research-synthesizer.logic.md
./packages/cli/dist/cli.js compile ./packages/cli/templates/research-synthesizer.logic.md --step gather_sources
./packages/cli/dist/cli.js fmt --check ./packages/cli/templates/research-synthesizer.logic.md
./packages/cli/dist/cli.js diff ./packages/cli/templates/research-synthesizer.logic.md ./packages/cli/templates/code-reviewer.logic.md
./packages/cli/dist/cli.js init --template code-reviewer --output /tmp/test-init.logic.md && cat /tmp/test-init.logic.md
```
All should exit 0 with sensible output.

### MCP server smoke test
```bash
cd ~/development/logic-md
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | ./packages/mcp/dist/server.js
```
Should return the list of 7 tools.

### Final steps
1. Run `git log --oneline -20` and confirm the history is clean and chronological
2. Bump all three package versions to 1.4.0 in their package.json files
3. Update root package.json version to 1.4.0
4. DO NOT tag v1.4.0 yet — that's a manual step after final verification
5. DO NOT merge the branch to main — leave it on `feat/m4-m5-m6-merge` for the user to review and merge manually
6. DO NOT touch Modular9 at all in this task — the vendored copies stay as they are
7. Print a comprehensive summary:
   - Files copied per package (counts)
   - Test counts per package (before and after)
   - Any conflicts or drifts encountered and how they were resolved
   - Final build/test status for each package
   - Git log of commits made on the feat branch
   - The commands to merge and tag when ready: `git checkout main && git merge feat/m4-m5-m6-merge && git tag v1.4.0 -m "M4+M5+M6 merged from Modular9"`

## Constraints
- `~/development/logic-md` is AUTHORITATIVE for M1+M2 code. Modular9's copies are derivatives.
- `~/development/modular9` is AUTHORITATIVE for M4+M5+M6 code. That's where it was actually built.
- For M3 (Modular9 runtime integration — LogicMiddleware, visual editor, execution trace), that code STAYS in Modular9. It's application-specific integration, not reusable library code.
- Do NOT delete anything from Modular9 in this task
- Do NOT modify anything in Modular9 in this task
- Use npm workspaces (already configured in the logic-md repo)
- Maintain the existing vitest + biome + TypeScript strict setup
- If any step fails, stop and report — don't force through errors
- If there's a drift/conflict in the core package beyond just the package.json exports fix, stop and ask before proceeding
- All work happens on `feat/m4-m5-m6-merge` branch — main stays untouched until user merges manually
- The Modular9-specific integration code (M3) must NOT be copied — that includes: src/lib/execution/logic-middleware.ts, LOGIC.md visual editor components, TraceInspector, plugin SDK changes, runAgentNode middleware hook. Those belong to Modular9.
