# LOGIC.md Benchmark Framework - Index

## What This Is

A comprehensive benchmarking framework to measure whether LOGIC.md specs improve structured output quality from multi-step AI agent pipelines.

**Core claim being tested**: Pipelines with LOGIC.md produce structured outputs more reliably than without.

## Quick Start

```bash
cd benchmarks
npm install
npm run benchmark:dry-run   # No API keys required
```

Expected: 60 seconds, generates `results/results.json` and `results/results.md`

## Files at a Glance

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** — 5-minute setup guide
- **[README.md](README.md)** — Full methodology (honesty principle, metrics, caveats)
- **[FRAMEWORK_OVERVIEW.md](FRAMEWORK_OVERVIEW.md)** — Detailed architecture and design

### Core Framework
- **[run.mjs](run.mjs)** — Main benchmark orchestrator (~400 lines)
- **[scoring.mjs](scoring.mjs)** — 5 scoring functions (~300 lines)
- **[llm-adapter.mjs](llm-adapter.mjs)** — Pluggable LLM interface (~350 lines)

### Tasks (3 defined, easily extensible to 5)
- **Code Review** — 4-step COT pipeline, output contracts for verdict + issues
  - Definition: `tasks/code-review.json`
  - Spec: `tasks/specs/code-review.logic.md`
  - Input: `tasks/inputs/code-review-sample.js`

- **Research Synthesis** — 4-step ReAct pipeline, enforces source coverage
  - Definition: `tasks/research-synthesis.json`
  - Spec: `tasks/specs/research-synthesis.logic.md`
  - Input: `tasks/inputs/research-synthesis-sample.txt`

- **Security Audit** — 5-step Plan-Execute pipeline, enforces CWE mapping
  - Definition: `tasks/security-audit.json`
  - Spec: `tasks/specs/security-audit.logic.md`
  - Input: `tasks/inputs/security-audit-sample.js`

### Configuration
- **[package.json](package.json)** — Dependencies and npm scripts
- **[.gitignore](.gitignore)** — Git ignore rules
- **[results/](results/)** — Generated after running benchmarks

## How It Works

### 1. Load Tasks
Each task has:
- **Definition** (JSON): task metadata, I/O schema, control prompt
- **LOGIC.md Spec**: reasoning steps, output contracts, quality gates
- **Sample Input**: realistic test data

### 2. Run Benchmark
For each task × model × condition combination:
1. Generate system prompt (includes LOGIC.md spec for treatment)
2. Call LLM (Claude Sonnet or GPT-4o)
3. Parse JSON output
4. Score on 4 dimensions:
   - **Structured Compliance** (40% weight) — does output match schema?
   - **Describing vs Doing** (30% weight) — how many "I would" patterns?
   - **Pipeline Completion** (20% weight) — did all steps produce outputs?
   - **Quality Gate Compliance** (10% weight, treatment only) — do gates pass?

### 3. Generate Results
- `results.json` — raw data, all runs
- `results.md` — statistics, treatment vs control comparison

## Key Metrics

### Structured Compliance (Primary)
Validates output against expected JSON schema.
- Control baseline: 30-60% (agents often produce text, not JSON)
- Treatment goal: 85%+ (contracts enforce structure)

### Describing vs Doing (Failure Detection)
Detects "I would" patterns (describing instead of executing).
- Patterns: "I would...", "As a..., I would...", "I would then..."
- Control baseline: 30-60% (agents describe rather than do)
- Treatment goal: <10% (contracts enforce execution)
- **This is the core failure mode LOGIC.md solves for**

### Pipeline Completion (Robustness)
Checks if all multi-step reasoning steps produced non-empty outputs.
- Control baseline: 70-90% (some steps may fail)
- Treatment goal: 95%+ (quality gates retry on failure)

### Quality Gate Compliance (Treatment Only)
Measures if post-output validation gates pass.
- Control baseline: N/A (no gates)
- Treatment goal: 90%+ (gates should pass consistently)

## Sampling Design

- **Runs per condition**: 10 (modest; 30+ recommended for tighter intervals)
- **Tasks**: 3 currently, extensible to 5
- **Models**: Claude Sonnet 3.5 (extensible to GPT-4o, Haiku, etc.)
- **Total**: 3 tasks × 2 conditions × 10 runs = 60 runs (~30 minutes)

## Design Principle: Honest Results

**We commit to publishing results regardless of outcome.**

- No cherry-picking runs
- No post-hoc p-hacking
- No tuning thresholds to favor LOGIC.md
- All variance reported openly

If LOGIC.md barely moves the needle, or if it hurts performance, we publish that too.

## Command Line Usage

### Dry Run (No API Keys)
```bash
npm run benchmark:dry-run
```

### Real Run (Requires API Keys)
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
npm run benchmark
```

### Single Task
```bash
node run.mjs --task=code-review --dry-run
```

### Verbose Output
```bash
npm run benchmark:verbose
```

## Understanding Results

### results.json Structure
```json
{
  "results": [
    {
      "task": "code-review",
      "model": "claude-sonnet-3-5",
      "condition": "control",
      "run": 1,
      "metrics": {
        "structuredCompliance": 85,
        "describingVsDoing": 25,
        "pipelineCompletion": 100,
        "qualityGateCompliance": null
      },
      "aggregateScore": 78
    }
  ],
  "stats": {
    "code-review:claude-sonnet-3-5:control": {
      "aggregateScore": { "mean": 72, "stddev": 12, "min": 55, "max": 88 }
    }
  }
}
```

### results.md Structure
- Summary statistics per task/model/condition
- Treatment vs control comparisons
- Key findings with aggregate score differences

## Extending the Framework

### Add a 4th Task
1. Create `tasks/my-task.json` with task definition
2. Create `tasks/specs/my-task.logic.md` with LOGIC.md spec
3. Create `tasks/inputs/my-task-sample.txt` with sample input
4. Run: `node run.mjs --task=my-task --dry-run`

### Add a New Model
1. Update `run.mjs` MODELS list
2. Add adapter to `llm-adapter.mjs` if needed
3. Export API key to environment
4. Run: `npm run benchmark`

## Limitations

- Sample size is modest (10 runs; 30+ recommended)
- 3 tasks provided (5 planned)
- Fixed temperature (0.7)
- 30-second timeout per run
- No per-step timing breakdown (yet)

See README.md for full caveats section.

## Next Steps

1. **Dry run**: `npm run benchmark:dry-run` (validate framework)
2. **Collect data**: Run 10 iterations per condition on code-review task
3. **Analyze**: Check results/results.md for treatment vs control comparison
4. **Publish**: Share findings honestly, regardless of outcome
5. **Scale**: If results are inconclusive, increase to 30 runs per condition

## Contact

For questions about the benchmark methodology, see README.md.
For implementation questions, see FRAMEWORK_OVERVIEW.md.
For quick start, see QUICKSTART.md.

---

**Version**: 1.0.0
**Last updated**: 2026-04-10
**License**: MIT (same as LOGIC.md)
