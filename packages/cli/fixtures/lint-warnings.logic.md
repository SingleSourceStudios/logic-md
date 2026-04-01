---
spec_version: "1.0"
name: "lint-warnings-test"
steps:
  step_one:
    execution: sequential
  step_two:
    needs: [step_one]
    branches:
      - if: "{{ x > 1 }}"
        then: step_one
---

# Lint Warnings Test

This file triggers lint warnings: steps without descriptions, no fallback, branches without default.
