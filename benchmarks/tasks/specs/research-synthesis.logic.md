---
spec_version: "1.0"
name: research-synthesis
description: Multi-source research synthesis with source coverage and citation validation
reasoning:
  strategy: react
  max_iterations: 8
steps:
  define_scope:
    description: Clarify the research question and investigation boundaries
    instructions: |
      Identify the core research question and any sub-questions.
      Define the scope: what sources to consult, time range, and boundaries.
      List the key concepts and terms to investigate.
      Determine what questions remain in scope vs out of scope.
  investigate:
    description: Gather information from multiple perspectives
    needs:
      - define_scope
    instructions: |
      Search for and compile information relevant to each sub-question.
      Record source name, key claims, supporting evidence, and confidence.
      Identify any conflicting claims or information gaps.
      Ensure you have consulted at least 2-3 different sources.
  cross_reference:
    description: Validate findings across sources
    needs:
      - investigate
    instructions: |
      Compare findings across sources to identify agreements and contradictions.
      Assess the reliability and authority of each source.
      Weight evidence based on source credibility.
      Resolve conflicts by determining which sources are most authoritative.
  report:
    description: Compile validated findings into a structured research report
    needs:
      - cross_reference
    instructions: |
      Organize findings by research question.
      Present each finding with supporting evidence and source citations.
      Include confidence levels for each major claim.
      Provide a clear conclusion and summary.
      List any unresolved questions for future research.
contracts:
  outputs:
    - name: research_report
      type: object
      required: true
      description: Structured research report with findings, sources, and confidence levels
      properties:
        research_question:
          type: string
          minLength: 20
        key_findings:
          type: array
          minItems: 3
          items:
            type: object
            required: ["finding", "supporting_evidence", "source_refs"]
            properties:
              finding: { type: string }
              supporting_evidence: { type: array, items: { type: string } }
              source_refs: { type: array, items: { type: string } }
        sources:
          type: array
          minItems: 2
          items:
            type: object
            required: ["name", "type", "reliability"]
            properties:
              name: { type: string }
              type: { type: string }
              reliability: { type: string }
        confidence_levels:
          type: object
          properties:
            overall: { type: string }
        conclusion:
          type: string
          minLength: 100
quality_gates:
  post_output:
    - name: research-question-present
      check: "{{ output.research_report.research_question != null && output.research_report.research_question.length > 20 }}"
      message: Research question must be present and at least 20 characters
      severity: error
      on_fail: retry
    - name: source-coverage
      check: "{{ output.research_report.sources.length >= 2 }}"
      message: Must cite at least 2 distinct sources
      severity: error
      on_fail: retry
    - name: finding-count
      check: "{{ output.research_report.key_findings.length >= 3 }}"
      message: Must identify at least 3 key findings
      severity: error
      on_fail: retry
    - name: citation-density
      check: "{{ output.research_report.key_findings.every(f => f.source_refs.length > 0) }}"
      message: Each finding must have at least one source reference
      severity: error
      on_fail: retry
    - name: conclusion-present
      check: "{{ output.research_report.conclusion != null && output.research_report.conclusion.length > 100 }}"
      message: Conclusion must be present and at least 100 characters
      severity: error
      on_fail: retry
---

# Research Synthesis Specification

A four-step research pipeline that synthesizes multiple sources into a validated report.

This specification ensures:
1. Research is methodical and question-driven (define → investigate → cross-ref → report)
2. All findings are cited to specific sources
3. Source diversity is enforced (minimum 2 sources)
4. Confidence levels are explicit
5. The agent gathers research, not just describes the process
