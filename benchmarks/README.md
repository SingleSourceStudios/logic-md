# LOGIC.md Benchmark Framework

## Overview

This framework benchmarks the core claim of LOGIC.md: **pipelines with LOGIC.md produce structured outputs more reliably than without.**

We measure this by running identical multi-step agent tasks under two conditions:

1. **Control**: Bare system prompts, no LOGIC.md contracts or quality gates
2. **Treatment**: LOGIC.md specs with output contracts, quality gates, and structured reasoning

## Methodology

### Task Design

Five representative multi-step agent tasks covering different domains:

| Task | Domain | Steps | Key Metric |
|------|--------|-------|-----------|
| **Code Review** | Software Engineering | 4 | Issue detection accuracy + verdict clarity |
| **Research Synthesis** | Information Processing | 4 | Source coverage + citation compliance |
| **Security Audit** | Security | 5 | Vulnerability identification + severity accuracy |
| **Data Analysis** | Data Science | 4 | Insight extraction + data integrity |
| **Content Generation** | Creative Writing | 3 | Structure compliance + quality consistency |

### Metrics

For each task run, we measure:

#### 1. **Structured Output Compliance** (primary)
- Does the output match the expected JSON schema?
- Measured as: `(valid_fields / required_fields) * 100`
- Scoring: `scoreStructuredCompliance(output, schema)`

#### 2. **Describing-vs-Doing Rate** (failure detection)
- How often does the agent describe what it *would* do instead of doing it?
- Regex patterns detect: "I would", "As a..., I would", "I would then", etc.
- Measured as: `(describing_patterns / total_sentences) * 100`
- Lower is better. Control should show 30-60% rates; treatment should be <10%
- Scoring: `scoreDescribingVsDoing(output)`

#### 3. **Pipeline Completion Rate** (robustness)
- Did all multi-step reasoning steps produce non-empty outputs?
- Measured as: `(completed_steps / total_steps) * 100`
- Scoring: `scorePipelineCompletion(stepOutputs)`

#### 4. **Quality Gate Compliance** (LOGIC.md only)
- For treatment condition: what % of post-output quality gates pass?
- Measured as: `(passed_gates / total_gates) * 100`
- This metric is only applicable to treatment condition

### Models

Initial benchmarks run on:

- **Claude Sonnet 3.5** (current production model, highest reasoning capacity)
- **GPT-4o** (OpenAI reference, for cross-vendor validation)

Future: Haiku, Mini models for cost/speed tradeoffs.

### Statistical Design

- **Runs per task per condition**: 10 runs
- **Total runs**: 5 tasks × 2 conditions × 2 models × 10 runs = 200 runs
- **Blocking factors**: task, model, condition (fixed)
- **Random factors**: temperature seed, token sampling variance

Each run is independent. No caching. Results are published regardless of outcome.

## Design Principle: Honest Results

**We commit to publishing results regardless of outcome.** If LOGIC.md barely moves the needle, or if it makes things worse, we publish that too.

This framework is designed to answer the question: *"Does LOGIC.md actually help?"* not *"How can we make LOGIC.md look good?"*

- No cherry-picking runs
- No post-hoc p-hacking
- No tuning thresholds to favor the treatment
- All variance reported openly

## Running the Benchmarks

### Dry Run (with mock LLM responses)

```bash
node benchmarks/run.mjs --dry-run
```

This runs the full framework with mock LLM responses. Useful for:
- Testing the framework logic
- Validating scoring functions
- Checking output formats
- No API keys required

### Real Runs (requires API keys)

```bash
ANTHROPIC_API_KEY=... OPENAI_API_KEY=... node benchmarks/run.mjs
```

Runs against real Claude Sonnet and GPT-4o models. Takes 30-60 minutes to complete.

### Specific Task

```bash
node benchmarks/run.mjs --task code-review --dry-run
```

### Verbose Output

```bash
node benchmarks/run.mjs --verbose
```

## Results

Benchmark results are saved to:

- `benchmarks/results/results.json` — raw data, all runs
- `benchmarks/results/results.md` — human-readable summary with statistics

### Results Format

Raw results include per-run data:

```json
{
  "task": "code-review",
  "model": "claude-sonnet-3-5",
  "condition": "control",
  "run": 1,
  "timestamp": "2026-04-10T12:34:56Z",
  "metrics": {
    "structuredCompliance": 45,
    "describingVsDoing": 52,
    "pipelineCompletion": 100,
    "qualityGateCompliance": null
  },
  "output": "...",
  "executionTime": 2345
}
```

Summary statistics include per-task, per-model aggregates with mean, stddev, min, max.

## Architecture

### Directory Structure

```
benchmarks/
├── README.md (this file)
├── run.mjs (main benchmark runner)
├── scoring.mjs (scoring functions)
├── llm-adapter.mjs (pluggable LLM interface)
├── tasks/
│   ├── code-review.json
│   ├── research-synthesis.json
│   ├── security-audit.json
│   ├── data-analysis.json
│   └── content-generation.json
├── tasks/specs/
│   ├── code-review.logic.md
│   ├── research-synthesis.logic.md
│   ├── security-audit.logic.md
│   ├── data-analysis.logic.md
│   └── content-generation.logic.md
├── tasks/inputs/
│   ├── code-review-sample.js
│   ├── research-synthesis-sample.txt
│   ├── security-audit-sample.js
│   ├── data-analysis-sample.csv
│   └── content-generation-sample.txt
├── results/
│   ├── results.json
│   └── results.md
└── mock-data/
    ├── control-responses.json
    └── treatment-responses.json
```

### Task Definition Format

Each task is defined in JSON with:

```json
{
  "name": "code-review",
  "description": "...",
  "input": "...",
  "expected_output_schema": { /* JSON Schema */ },
  "control_prompt": "...",
  "treatment_spec": "code-review.logic.md",
  "timeout_ms": 30000
}
```

### Scoring Functions

Located in `scoring.mjs`:

- `scoreStructuredCompliance(output, schema)` → 0-100
- `scoreDescribingVsDoing(output)` → 0-100
- `scorePipelineCompletion(stepOutputs)` → 0-100
- `scoreQualityGateCompliance(gates, outputs)` → 0-100

### LLM Adapter

`llm-adapter.mjs` defines a pluggable interface:

```javascript
class LLMAdapter {
  async call(model, systemPrompt, userPrompt) {
    // Implemented per-model
    // Returns { content: string, stopReason: string, inputTokens: number, outputTokens: number }
  }
}
```

Adapters provided for:
- Claude Sonnet 3.5 (via `@anthropic-ai/sdk`)
- GPT-4o (via `openai`)

Dry-run uses `MockLLMAdapter` that returns deterministic responses.

## Key Insight: The "Describing vs Doing" Metric

This is the core finding from the Modular9 case study. Without LOGIC.md contracts:

> "As a Security Auditor, I would perform an OWASP Top 10 review and map findings to CWE IDs. I would then scan for injection vulnerabilities..."

The agent describes the reasoning flow but never produces artifacts. With LOGIC.md:

> `{ "findings": [...], "severity_scores": {...}, "verdict": "critical" }`

The agent produces structured data. The "describing-vs-doing" rate is a proxy for this failure mode. Control should be high (30-60%), treatment should be low (<10%).

## Extending the Framework

### Adding a New Task

1. Create `benchmarks/tasks/my-task.json` with task definition
2. Create `benchmarks/tasks/specs/my-task.logic.md` with LOGIC.md spec
3. Create `benchmarks/tasks/inputs/my-task-sample.*` with sample input
4. Define `expected_output_schema` in the task JSON
5. Update `run.mjs` to load the new task
6. Run: `node benchmarks/run.mjs --task my-task --dry-run`

### Adding a New Model

1. Create adapter class in `llm-adapter.mjs` extending `LLMAdapter`
2. Implement `call(model, systemPrompt, userPrompt)` method
3. Register in `run.mjs` under supported models
4. Add API key to environment
5. Run: `node benchmarks/run.mjs`

### Adding a New Metric

1. Add scoring function to `scoring.mjs`
2. Export from module
3. Call from `run.mjs` in the scoring section
4. Add results field to output JSON
5. Update results.md template to display

## Caveats and Limitations

1. **Sample size**: 10 runs per condition is statistically modest. Future work should aim for 30+ runs for tighter confidence intervals.

2. **Model drift**: Model behavior changes over time. Results are timestamped and should be re-run quarterly.

3. **Prompt engineering gap**: The control condition is *bare system prompts*. A well-engineered control with careful prompt engineering might be closer to treatment. We measure the *unaided* control baseline.

4. **Task representativeness**: Five tasks are representative but not exhaustive. Multi-step reasoning tasks are the key use case; single-call classification tasks are not tested.

5. **Timeout effects**: Tasks have 30-second timeouts. Some longer model calls might be truncated. Increase `timeout_ms` in task definitions if needed.

6. **Temperature and sampling**: We use fixed temperature (0.7 for sampling) to reduce variance. This favors some models over others.

## References

- **LOGIC.md Specification**: `docs/SPEC.md`
- **Core Parser**: `packages/core/src/parser.ts`
- **Compiler**: `packages/core/src/compiler.ts`
- **CLI Validate**: `packages/cli/src/commands/validate.ts`
- **Case Study**: Modular9 integration analysis in project planning notes

## Next Steps

1. **Run dry-run baseline** to validate framework logic
2. **Collect 10 runs per condition** on Claude Sonnet (20 runs total per task)
3. **Analyze results** — publish findings honestly
4. **Extend to GPT-4o** if results are conclusive
5. **Scale to 30 runs** if statistical power is insufficient
6. **Publish findings** as a public benchmark report

---

*Last updated: 2026-04-10*
