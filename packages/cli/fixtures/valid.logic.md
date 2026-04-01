---
spec_version: "1.0"
name: "test-strategy"
description: "A valid test fixture for CLI integration tests"
reasoning:
  strategy: cot
  temperature: 0.7
steps:
  analyze:
    description: "Analyze the input data for patterns"
    execution: sequential
  evaluate:
    description: "Evaluate findings and produce output"
    needs: [analyze]
    branches:
      - if: "{{ confidence > 0.8 }}"
        then: analyze
      - default: true
        then: analyze
fallback:
  strategy: graceful_degrade
---

# Test Strategy

This is a valid LOGIC.md file used for CLI integration testing.
