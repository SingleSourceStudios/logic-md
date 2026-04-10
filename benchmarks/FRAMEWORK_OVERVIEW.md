# LOGIC.md Benchmark Framework - File Structure

## Overview

The benchmark framework consists of 16 files organized into 4 main categories:

1. **Core Framework** (4 files)
2. **Task Definitions** (8 files)
3. **Documentation** (3 files)
4. **Configuration** (1 file)

## File Structure

```
benchmarks/
├── README.md                          # Full methodology documentation
├── QUICKSTART.md                      # Quick start guide for running benchmarks
├── FRAMEWORK_OVERVIEW.md              # This file
├── package.json                       # Dependencies and npm scripts
├── .gitignore                         # Git ignore rules
│
├── run.mjs                            # Main benchmark runner
├── scoring.mjs                        # Scoring functions (5 functions)
├── llm-adapter.mjs                    # LLM adapter interface + implementations
│
├── tasks/
│   ├── code-review.json               # Code review task definition
│   ├── research-synthesis.json        # Research synthesis task definition
│   ├── security-audit.json            # Security audit task definition
│   │
│   ├── inputs/
│   │   ├── code-review-sample.js      # Sample code for code-review task
│   │   ├── research-synthesis-sample.txt
│   │   └── security-audit-sample.js   # Sample code for security-audit task
│   │
│   └── specs/
│       ├── code-review.logic.md       # LOGIC.md spec for code-review
│       ├── research-synthesis.logic.md
│       └── security-audit.logic.md    # LOGIC.md spec for security-audit
│
└── results/                           # Generated after running benchmarks
    ├── results.json                   # Raw benchmark results
    └── results.md                     # Human-readable summary
```

## Core Components

### 1. run.mjs (Main Runner)
- **Lines**: ~400
- **Purpose**: Orchestrates benchmark execution
- **Key Functions**:
  - `loadTask(taskName)` — Load task JSON definition
  - `buildSystemPrompt(condition, task)` — Generate system prompt
  - `buildUserPrompt(task, inputData, condition)` — Generate user prompt
  - `runBenchmark(task, model, condition, adapter, run)` — Execute single run
  - `generateSummary(results)` — Calculate statistics
  - `writeResults(results, stats)` — Save results to JSON/MD
  - `main()` — Entry point

**Features**:
- Command-line arguments: `--dry-run`, `--verbose`, `--task=<name>`
- Progress tracking and timing
- Error handling and recovery
- Statistical aggregation

### 2. scoring.mjs (Scoring Functions)
- **Lines**: ~300
- **Purpose**: Measures output quality across 4 dimensions

**Functions** (5 total):
1. `scoreStructuredCompliance(output, schema)` → 0-100
   - Uses AJV for JSON schema validation
   - Partial credit for required fields
   - Returns: `{score, valid, errors}`

2. `scoreDescribingVsDoing(output)` → 0-100
   - Regex patterns for "I would", "As a..., I would", etc.
   - Inverse scoring: lower is better
   - Returns: `{score, describingCount, sentenceCount, patterns}`

3. `scorePipelineCompletion(stepOutputs)` → 0-100
   - Checks if all steps produced non-empty outputs
   - Returns: `{score, completedSteps, totalSteps, emptySteps}`

4. `scoreQualityGateCompliance(gates)` → 0-100
   - Measures pass rate of validation gates
   - Treatment condition only
   - Returns: `{score, passedGates, totalGates, failedGates}`

5. `aggregateMetrics(metrics)` → 0-100
   - Weighted combination of all metrics:
     - Structured compliance: 40%
     - Describing vs doing: 30% (inverted)
     - Pipeline completion: 20%
     - Quality gates: 10%

### 3. llm-adapter.mjs (LLM Implementations)
- **Lines**: ~350
- **Purpose**: Pluggable LLM interface

**Classes** (4 total):
1. `LLMAdapter` — Base class (interface)
   - Abstract method: `call(model, systemPrompt, userPrompt, options)`
   - Returns: `{content, stopReason, inputTokens, outputTokens}`

2. `ClaudeAdapter extends LLMAdapter`
   - Uses `@anthropic-ai/sdk`
   - Supports Claude Sonnet 3.5
   - Handles timeouts with AbortController

3. `OpenAIAdapter extends LLMAdapter`
   - Uses `openai` SDK
   - Supports GPT-4o
   - Async timeout handling

4. `MockLLMAdapter extends LLMAdapter`
   - Returns deterministic responses
   - Used for dry-run (no API keys needed)
   - Generates task-specific mock responses

**Factory Function**:
- `createAdapter(model, mockResponses)` — Returns appropriate adapter

## Task Definitions

### Structure (3 tasks defined, easily extensible to 5)

Each task has:
1. **JSON definition** (`tasks/code-review.json`)
   - Task metadata (name, description, complexity)
   - Input file reference
   - Expected output schema (JSON Schema format)
   - Control prompt
   - Treatment spec reference
   - Timeout configuration

2. **Sample input** (`tasks/inputs/code-review-sample.js`)
   - Realistic test data
   - Sized for 30-second execution

3. **LOGIC.md spec** (`tasks/specs/code-review.logic.md`)
   - Reasoning strategy (cot, react, plan-execute)
   - Step definitions with instructions
   - Output contracts
   - Quality gates (post_output checks)

### Tasks Provided

#### 1. Code Review
- **Complexity**: High
- **Steps**: 4 (understand → analyze → assess → summarize)
- **Reasoning**: COT (Chain of Thought)
- **Output Schema**: verdict + critical/major/minor issues + summary
- **Quality Gates**: 3 (verdict present, issues structure, summary present)

#### 2. Research Synthesis
- **Complexity**: High
- **Steps**: 4 (define_scope → investigate → cross_reference → report)
- **Reasoning**: ReAct (Reason + Act)
- **Output Schema**: research question + findings + sources + confidence + conclusion
- **Quality Gates**: 5 (question, source coverage, finding count, citation density, conclusion)

#### 3. Security Audit
- **Complexity**: Very High
- **Steps**: 5 (scan_surface → check_owasp → classify_cwe → remediate)
- **Reasoning**: Plan-Execute
- **Output Schema**: vulnerabilities + severity_summary + remediation_plan + risk_score
- **Quality Gates**: 5 (vulnerabilities identified, CWE mapping, severity summary, remediation plan, risk score)

## Documentation

### README.md
- **Purpose**: Full methodology documentation
- **Content**:
  - Benchmark methodology
  - Metrics explained (4 dimensions)
  - Models supported (Claude, GPT-4o)
  - Design principle (honest results)
  - Framework architecture
  - Directory structure
  - Caveats and limitations
  - References and next steps

### QUICKSTART.md
- **Purpose**: Get running in 5 minutes
- **Content**:
  - Installation steps
  - Dry run command (no API keys)
  - Real run commands
  - Results interpretation
  - Troubleshooting
  - How to extend

### package.json
- **Dependencies**: `ajv` for schema validation
- **Optional**: `@anthropic-ai/sdk`, `openai`
- **Scripts**: `benchmark`, `benchmark:dry-run`, `benchmark:verbose`, `benchmark:code-review`

## Running the Framework

### Dry Run (No API Keys)
```bash
npm install
npm run benchmark:dry-run
```
**Result**: `results/results.json` and `results/results.md`

### Real Run (With API Keys)
```bash
npm install @anthropic-ai/sdk openai
export ANTHROPIC_API_KEY=...
export OPENAI_API_KEY=...
npm run benchmark
```

## Design Principles

1. **Honesty**: Results published regardless of outcome
2. **Reproducibility**: All outputs deterministic, timestamped
3. **Extensibility**: Easy to add tasks, models, metrics
4. **Transparency**: Full source code, no magic
5. **Pragmatism**: Works with `--dry-run` for testing

## Statistics Generated

For each task/model/condition combination:
- **Mean aggregate score** (with standard deviation)
- **Mean structured compliance** (with standard deviation)
- **Mean describing-vs-doing rate** (lower is better)
- **Mean pipeline completion rate**
- **Treatment vs control comparison**

## Key Metrics Explained

### Structured Compliance (Primary)
Measures whether output matches expected JSON schema.
- Control baseline: 30-60% (agents often omit fields)
- Treatment goal: 85%+ (contracts enforce structure)

### Describing vs Doing (Failure Detection)
Detects "I would" patterns indicating description without execution.
- Control baseline: 30-60% (agents often describe)
- Treatment goal: <10% (contracts enforce execution)

### Pipeline Completion (Robustness)
Measures whether all multi-step reasoning completed.
- Control baseline: 70-90% (some steps may fail)
- Treatment goal: 95%+ (quality gates retry on failure)

### Quality Gate Compliance (Contract Validation)
Measures whether post-output validation gates pass.
- Control baseline: N/A (no gates in control)
- Treatment goal: 90%+ (gates should pass consistently)

## Extensibility

### Add a 4th Task
1. Create `tasks/my-task.json`
2. Create `tasks/specs/my-task.logic.md`
3. Create `tasks/inputs/my-task-sample.txt`
4. Update `run.mjs` DEFAULT_TASKS list
5. Run: `node run.mjs --task=my-task --dry-run`

### Add GPT-4o
1. `npm install openai`
2. Update `run.mjs` MODELS list
3. Export `OPENAI_API_KEY`
4. Run: `npm run benchmark`

### Add a 5th Metric
1. Add function to `scoring.mjs`
2. Call from `run.mjs` in scoring loop
3. Add to results JSON
4. Update `results.md` template

## Limitations and Future Work

**Current limitations**:
- 10 runs per condition (modest sample size)
- 3 tasks defined (5 planned)
- 2 models (Claude, GPT-4o)
- 30-second timeout per run
- Single temperature (0.7)

**Future work**:
- Scale to 30+ runs per condition
- Complete all 5 planned tasks
- Add Haiku and GPT-4 mini models
- Variable temperature analysis
- Longer timeout for complex tasks
- Per-step timing breakdown
- Confidence interval calculation

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| run.mjs | ~400 | Main runner, orchestration |
| scoring.mjs | ~300 | 5 scoring functions |
| llm-adapter.mjs | ~350 | LLM implementations |
| code-review.json | ~60 | Task definition |
| research-synthesis.json | ~60 | Task definition |
| security-audit.json | ~70 | Task definition |
| code-review.logic.md | ~80 | LOGIC.md spec |
| research-synthesis.logic.md | ~80 | LOGIC.md spec |
| security-audit.logic.md | ~120 | LOGIC.md spec |
| Sample inputs | ~50 each | Test data |
| Documentation | ~400 total | README, QUICKSTART |
| **Total** | **~2000** | **Complete framework** |

---

**Last updated**: 2026-04-10

For detailed methodology, see README.md. For quick start, see QUICKSTART.md.
