---
spec_version: "1.0"
name: "self-reflection-test"
reasoning:
  strategy: cot
steps:
  analyze:
    description: "Analyze the input data"
    instructions: "Break down the input into components and identify patterns"
  evaluate:
    description: "Evaluate the analysis results"
    needs: [analyze]
quality_gates:
  self_verification:
    enabled: true
    strategy: rubric
    rubric:
      criteria:
        - name: "accuracy"
          weight: 0.6
          description: "How accurate is the analysis"
        - name: "completeness"
          weight: 0.4
          description: "How complete is the coverage"
      minimum_score: 0.7
---

# Self-Reflection Test

A fixture with self-verification rubric for testing CLIU-02.
