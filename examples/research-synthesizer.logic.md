---
spec_version: "1.0"
name: "research-synthesizer"
description: "Synthesizes multi-source research into structured reports with quality gates"

reasoning:
  strategy: react
  max_iterations: 12
  temperature: 0.3
  thinking_budget: 16000

steps:
  gather_sources:
    description: "Search for and collect relevant sources on the research topic"
    instructions: |
      Search for sources relevant to the query.
      Prioritize: peer-reviewed > official reports > news > blogs > forums.
      Minimum 3 independent sources required.
    output_schema:
      type: object
      required: [sources, quality_scores]
      properties:
        sources:
          type: array
          minItems: 3
          items:
            type: object
            required: [url, title, credibility_score]
        quality_scores:
          type: array
          items:
            type: number
            minimum: 0
            maximum: 1
    confidence:
      minimum: 0.7
      target: 0.85
      escalate_below: 0.5
    retry:
      max_attempts: 3
      initial_interval: "1s"
      backoff_coefficient: 2.0
      non_retryable_errors: [AuthenticationError, RateLimitError]
    allowed_tools: [web_search, document_reader]
    timeout: "120s"

  evaluate_credibility:
    needs: [gather_sources]
    description: "Score each source for recency, authority, and corroboration"
    instructions: |
      Evaluate each source for:
      - Recency (prefer last 12 months)
      - Authority (domain expertise of author/publication)
      - Corroboration (claims supported by other sources)
      Assign a credibility score 0.0-1.0 to each.
    verification:
      check: "{{ output.scores.length >= 3 && output.average_score >= 0.6 }}"
      on_fail: retry

  synthesize:
    needs: [evaluate_credibility]
    description: "Combine findings into a coherent analysis"
    instructions: |
      Cross-reference claims across minimum three independent sources.
      Lead with the most actionable insight.
      Flag any data gaps or low-confidence assessments.
    branches:
      - if: "{{ steps.evaluate_credibility.output.average_score < 0.6 }}"
        then: expand_search
      - default: true
        then: draft_report

  expand_search:
    needs: [synthesize]
    description: "Broaden search when initial sources are insufficient"
    instructions: |
      Search additional databases and sources.
      Try alternative keywords and related topics.

  draft_report:
    needs: [synthesize]
    description: "Produce the final structured research report"
    verification:
      check: "{{ output.word_count > 200 && output.citations.length >= 3 }}"
      on_fail: retry

contracts:
  inputs:
    - name: research_query
      type: string
      required: true
      description: "The research question to investigate"
      constraints:
        max_length: 2000
    - name: context_documents
      type: array
      required: false
  outputs:
    - name: report
      type: object
      required: [summary, findings, confidence_score]
      properties:
        summary:
          type: string
          maxLength: 500
        findings:
          type: array
          items:
            type: object
            required: [claim, evidence, confidence]
        confidence_score:
          type: number
          minimum: 0
          maximum: 1
  capabilities:
    name: "Research Synthesizer"
    version: "1.2.0"
    description: "Synthesizes multi-source research into structured reports"
    supported_domains: [technology, finance, healthcare]
    max_input_tokens: 100000
    avg_response_time: "15s"
    languages: [en, fr, de]

quality_gates:
  pre_output:
    - name: factual_grounding
      check: "{{ output.citations.length > 0 }}"
      message: "All claims must be grounded in citations"
      severity: error
    - name: confidence_floor
      check: "{{ output.confidence >= 0.5 }}"
      message: "Output confidence too low for delivery"
      severity: error
      on_fail: escalate
    - name: bias_check
      check: "{{ output.perspectives_considered >= 2 }}"
      message: "Consider multiple perspectives before concluding"
      severity: warning
  self_verification:
    enabled: true
    strategy: checklist
    checklist:
      - "Output includes at least 3 sources"
      - "No unsupported speculative claims"
      - "Confidence score is between 0 and 1"
      - "Summary is under 500 words"

fallback:
  strategy: graceful_degrade
  escalation:
    - level: 1
      trigger: "{{ confidence < 0.5 }}"
      action: retry_with_different_strategy
      new_strategy: tot
    - level: 2
      trigger: "{{ attempts >= 3 && confidence < 0.5 }}"
      action: request_human_review
      message: "Unable to reach sufficient confidence after 3 attempts"
      include_reasoning_trace: true
    - level: 3
      trigger: "{{ attempts >= 5 }}"
      action: abort
      message: "Maximum attempts exhausted"

metadata:
  author: "Single Source Studios"
  created: "2026-04-02"
  tags: [research, synthesis, multi-source]
---

# Research Synthesizer — Reasoning Documentation

## Strategy Rationale

ReAct is chosen because research synthesis requires interleaved search
(Action) and evaluation (Thought). Pure CoT would reason from stale
training data; pure tool-use would collect without evaluating.

## Source Prioritization

1. Company websites and official documentation (highest authority)
2. Crunchbase, PitchBook, LinkedIn (funding, headcount)
3. G2, Capterra reviews (user perspective)
4. Industry analyst reports (market context)
5. Blog posts, podcasts (supplementary only)

## Known Failure Modes

- **Stealth-mode startups**: May not appear in web search. Mitigated by
  also searching ProductHunt, HackerNews, and AngelList.
- **Outdated pricing**: SaaS pricing changes frequently. Always note
  the date of last verification.
