# Benchmark Quick Start

## Installation

```bash
cd benchmarks
npm install
```

This installs `ajv` for JSON schema validation. The LLM adapters (Anthropic, OpenAI) are optional dependencies and will be installed only if you need them for real runs.

## Dry Run (No API Keys Required)

Test the framework with mock LLM responses:

```bash
npm run benchmark:dry-run
```

This will:
1. Load 3 sample tasks (code-review, research-synthesis, security-audit)
2. Run 10 iterations per task per condition (control vs treatment)
3. Score outputs using the scoring functions
4. Generate `results/results.json` and `results/results.md`
5. Print progress and final statistics

**Expected runtime**: 30-60 seconds (depending on machine speed)

**Output**:
```
results/
├── results.json      # Raw benchmark data
└── results.md        # Human-readable summary
```

## Real Runs (Requires API Keys)

### 1. Install Optional Dependencies

For Claude Sonnet:
```bash
npm install @anthropic-ai/sdk
```

For GPT-4o:
```bash
npm install openai
```

### 2. Set Environment Variables

```bash
# For Claude
export ANTHROPIC_API_KEY="sk-ant-..."

# For OpenAI
export OPENAI_API_KEY="sk-..."
```

### 3. Run Benchmarks

Single task (code-review):
```bash
node run.mjs --task=code-review
```

All tasks (code-review, research-synthesis, security-audit):
```bash
npm run benchmark
```

Verbose output:
```bash
npm run benchmark:verbose
```

**Expected runtime**: 10-30 minutes for all tasks and conditions

## Understanding Results

### results.json

Raw data structure:

```json
{
  "results": [
    {
      "task": "code-review",
      "model": "claude-sonnet-3-5",
      "condition": "control",
      "run": 1,
      "timestamp": "2026-04-10T12:34:56Z",
      "metrics": {
        "structuredCompliance": 85,
        "describingVsDoing": 25,
        "pipelineCompletion": 100,
        "qualityGateCompliance": null
      },
      "aggregateScore": 78,
      "executionTime": 2345,
      "tokens": { "input": 245, "output": 523 },
      "errors": []
    }
  ],
  "stats": {
    "code-review:claude-sonnet-3-5:control": {
      "task": "code-review",
      "model": "claude-sonnet-3-5",
      "condition": "control",
      "runs": 10,
      "aggregateScore": {
        "mean": 72,
        "stddev": 12,
        "min": 55,
        "max": 88
      },
      ...
    }
  }
}
```

### results.md

Human-readable summary with:
- Summary statistics for each task/model/condition
- Aggregate scores with standard deviations
- Treatment vs control comparisons
- "Describing vs Doing" reduction (key metric)

## Key Metrics

### Structured Compliance (0-100)
- Does the output match the expected JSON schema?
- 100 = perfect match, 0 = no valid JSON

### Describing vs Doing (0-100)
- How often does the agent describe what it would do?
- Lower is better (target: <10% for treatment, 30-60% for control)
- Detects patterns: "I would...", "As a..., I would...", etc.

### Pipeline Completion (0-100)
- Did all multi-step reasoning steps produce outputs?
- 100 = all steps completed, 0 = no outputs

### Quality Gate Compliance (treatment only)
- What % of post-output validation gates pass?
- Only measured in treatment condition

## Extending the Framework

### Add a New Task

1. Create `tasks/my-task.json`:
```json
{
  "name": "my-task",
  "description": "...",
  "input_file": "my-task-sample.txt",
  "expected_output_schema": { /* JSON Schema */ },
  "control_prompt": "...",
  "treatment_spec": "my-task.logic.md"
}
```

2. Create `tasks/specs/my-task.logic.md` (LOGIC.md spec)

3. Create `tasks/inputs/my-task-sample.txt` (sample input)

4. Run: `node run.mjs --task=my-task --dry-run`

### Add a New Model

Edit `run.mjs` and update:
```javascript
const MODELS = ['claude-sonnet-3-5', 'gpt-4o', 'your-model-here'];
```

Update `llm-adapter.mjs` to add support for the new model.

## Troubleshooting

### "Anthropic SDK not installed"
```bash
npm install @anthropic-ai/sdk
```

### "Invalid API key"
Check environment variables:
```bash
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

### Timeout errors
Increase `timeout_ms` in task JSON file (default 30000ms).

### Out of memory
If running many tasks, run with `--task=code-review` to test one at a time.

## Interpreting Results

### Treatment Beats Control
If treatment aggregate score is significantly higher (10%+ improvement):
- LOGIC.md contracts are helping
- Structured output compliance is better
- Describing-vs-doing rate is lower

### No Significant Difference
If scores are similar (±5%):
- LOGIC.md has minimal impact on this task
- Results should be published honestly
- May need different tasks or more runs

### Control Beats Treatment
If control scores are higher:
- LOGIC.md constraints may be hurting performance
- Possible issues with LOGIC.md specs
- Publish findings regardless

## Next Steps

1. Run dry-run to validate framework
2. Run real benchmarks with Claude Sonnet (smallest scope)
3. Analyze results and publish findings
4. Extend to GPT-4o if needed
5. Scale to 30+ runs if statistical power is insufficient

---

**Documentation**: See `README.md` for full methodology and framework design.
