---
phase: 14-token-estimation
plan: 01
status: complete
started: 2026-04-02
completed: 2026-04-02
---

## One-liner

Approximate token estimation (~4 chars/token) and 2000-token budget warnings on compiled steps.

## What Was Built

- `estimateTokens(text)`: Returns `Math.ceil(text.length / 4)`, 0 for empty string
- `tokenWarning` optional field on `CompiledStep`: populated when `systemPromptSegment` exceeds 2000 estimated tokens
- Integration in `compileStep()`: estimates tokens after building prompt segment, attaches warning if over budget

## Key Files

### Created
(none)

### Modified
- `packages/core/compiler.ts` — `estimateTokens` implementation (line 390) + tokenWarning logic in `compileStep`
- `packages/core/types.ts` — `tokenWarning?: string` added to `CompiledStep` interface
- `packages/core/compiler.test.ts` — estimateTokens and token warning tests

## Self-Check: PASSED

- [x] estimateTokens("") returns 0
- [x] estimateTokens uses Math.ceil(text.length / 4)
- [x] compileStep adds tokenWarning when segment exceeds 2000 tokens
- [x] compileStep omits tokenWarning for short segments
- [x] All existing tests pass

## Deviations

None. Implementation executed as planned but SUMMARY.md was not created at execution time (retroactively documented).

## Requirements

- TOKN-01: Complete
- TOKN-02: Complete
