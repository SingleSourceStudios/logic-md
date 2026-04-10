---
spec_version: "1.0"
name: code-review
description: Structured PR code review with contracts for verdict and issues list
reasoning:
  strategy: cot
  max_iterations: 3
steps:
  understand:
    description: Read and understand the code change
    instructions: |
      Read the provided code change carefully.
      Understand the stated intent of the change.
      Identify all files modified and the scope of changes.
      Note the types of changes: new feature, bug fix, refactor, or maintenance.
  analyze:
    description: Analyze correctness, edge cases, and security
    needs:
      - understand
    instructions: |
      For each changed file, evaluate correctness: does the code achieve its intent?
      Check edge cases: null/undefined inputs, empty collections, boundary values.
      Evaluate error handling: are errors caught, logged, and surfaced appropriately?
      Review security: look for injection risks, unvalidated inputs, exposed secrets.
      Identify each issue with file, line number, severity, and description.
  assess_style:
    description: Evaluate naming, structure, and readability
    needs:
      - analyze
    instructions: |
      Check naming conventions: are variables and functions clearly named?
      Evaluate code structure: does it follow established patterns?
      Assess readability: are complex sections commented or well-structured?
      Check for duplication: does this re-implement existing functionality?
  summarize:
    description: Produce a structured review report with verdict
    needs:
      - assess_style
    instructions: |
      Group all findings by severity: critical, major, minor.
      Choose a verdict: "approve" (no blockers), "request-changes" (critical/major issues), or "comment" (minor only).
      Write a one-paragraph summary of the overall change.
contracts:
  outputs:
    - name: review_result
      type: object
      required: true
      description: Review result with verdict and issues list
      properties:
        verdict:
          type: string
          enum: ["approve", "request-changes", "comment"]
        critical_issues:
          type: array
          items:
            type: object
            properties:
              file: { type: string }
              line: { type: number }
              issue: { type: string }
              fix: { type: string }
        major_issues:
          type: array
          items:
            type: object
            properties:
              file: { type: string }
              line: { type: number }
              issue: { type: string }
              fix: { type: string }
        minor_issues:
          type: array
          items:
            type: object
            properties:
              file: { type: string }
              line: { type: number }
              issue: { type: string }
        summary:
          type: string
          minLength: 50
quality_gates:
  post_output:
    - name: verdict-present
      check: "{{ output.review_result.verdict != null }}"
      message: Verdict must be one of: approve, request-changes, comment
      severity: error
      on_fail: retry
    - name: issues-structure
      check: "{{ output.review_result.critical_issues != null && output.review_result.major_issues != null }}"
      message: Issues lists (critical and major) must be present and non-null
      severity: error
      on_fail: retry
    - name: summary-present
      check: "{{ output.review_result.summary != null && output.review_result.summary.length > 50 }}"
      message: Summary must be present and at least 50 characters
      severity: error
      on_fail: retry
---

# Code Review Specification

A four-step code review pipeline that produces a structured verdict and issues report.

This specification ensures:
1. The review process is systematic (understand → analyze → assess → summarize)
2. Output is always structured (verdict + categorized issues)
3. Every output is validated against the schema
4. The agent produces artifacts, not descriptions of what it would do
