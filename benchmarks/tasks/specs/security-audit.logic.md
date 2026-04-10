---
spec_version: "1.0"
name: security-audit
description: Systematic security audit with vulnerability identification and CWE mapping
reasoning:
  strategy: plan-execute
  max_iterations: 5
steps:
  scan_surface:
    description: Identify potential vulnerability surface areas
    instructions: |
      Scan the code for common vulnerability patterns and entry points.
      Identify input validation points, authentication/authorization logic, cryptography, and data handling.
      Note areas that handle sensitive data (secrets, credentials, PII).
      List all external API calls, file operations, and database operations.
  check_owasp:
    description: Check against OWASP Top 10 categories
    needs:
      - scan_surface
    instructions: |
      For each vulnerability surface area, check against OWASP Top 10:
      1. Broken Access Control
      2. Cryptographic Failures
      3. Injection
      4. Insecure Design
      5. Security Misconfiguration
      6. Vulnerable Components
      7. Authentication Failures
      8. Data Integrity Failures
      9. Logging Failures
      10. SSRF
      Document each relevant finding with category and severity.
  classify_cwe:
    description: Map vulnerabilities to CWE identifiers
    needs:
      - check_owasp
    instructions: |
      For each vulnerability found, identify the appropriate CWE (Common Weakness Enumeration) ID.
      Use CWE mappings: injection=CWE-89, XSS=CWE-79, auth bypass=CWE-287, etc.
      Assess severity: critical (CVSS 9-10), high (7-8), medium (4-6), low (0-3).
      Document each vulnerability with CWE ID and justification.
  remediate:
    description: Create remediation plan with prioritized actions
    needs:
      - classify_cwe
    instructions: |
      Group vulnerabilities by severity: critical, high, medium, low.
      For each vulnerability, provide specific remediation steps.
      Estimate effort required: low (<1 hour), medium (1-8 hours), high (8+ hours).
      Create a prioritized remediation plan with timeline recommendations.
      Calculate overall risk score (0-100) based on severity, count, and exploitability.
contracts:
  outputs:
    - name: audit_report
      type: object
      required: true
      description: Security audit report with vulnerabilities, severity, and remediation plan
      properties:
        vulnerabilities:
          type: array
          minItems: 1
          items:
            type: object
            required: ["id", "title", "severity", "cwe_id", "description", "location", "remediation"]
            properties:
              id: { type: string, pattern: "^[A-Z0-9]+$" }
              title: { type: string }
              severity: { type: string, enum: ["critical", "high", "medium", "low", "informational"] }
              cwe_id: { type: string, pattern: "^CWE-[0-9]+$" }
              description: { type: string }
              location:
                type: object
                properties:
                  file: { type: string }
                  line: { type: number }
              remediation: { type: string }
        severity_summary:
          type: object
          required: ["critical", "high", "medium", "low"]
          properties:
            critical: { type: integer, minimum: 0 }
            high: { type: integer, minimum: 0 }
            medium: { type: integer, minimum: 0 }
            low: { type: integer, minimum: 0 }
        remediation_plan:
          type: array
          items:
            type: object
            required: ["priority", "action", "effort"]
            properties:
              priority: { type: integer, minimum: 1, maximum: 5 }
              action: { type: string }
              effort: { type: string, enum: ["low", "medium", "high"] }
        risk_score:
          type: number
          minimum: 0
          maximum: 100
quality_gates:
  post_output:
    - name: vulnerabilities-identified
      check: "{{ output.audit_report.vulnerabilities.length > 0 }}"
      message: Must identify at least one vulnerability
      severity: error
      on_fail: retry
    - name: cwe-mapping
      check: "{{ output.audit_report.vulnerabilities.every(v => v.cwe_id != null && v.cwe_id.startsWith('CWE-')) }}"
      message: All vulnerabilities must be mapped to CWE IDs (format: CWE-XXXX)
      severity: error
      on_fail: retry
    - name: severity-summary
      check: "{{ output.audit_report.severity_summary != null && output.audit_report.severity_summary.critical != null }}"
      message: Severity summary must be present with critical, high, medium, low counts
      severity: error
      on_fail: retry
    - name: remediation-plan
      check: "{{ output.audit_report.remediation_plan.length > 0 }}"
      message: Remediation plan must contain at least one action item
      severity: error
      on_fail: retry
    - name: risk-score
      check: "{{ output.audit_report.risk_score != null && output.audit_report.risk_score >= 0 && output.audit_report.risk_score <= 100 }}"
      message: Risk score must be present and between 0-100
      severity: error
      on_fail: retry
---

# Security Audit Specification

A five-step security audit pipeline that systematically identifies vulnerabilities and produces a remediation plan.

This specification ensures:
1. Comprehensive surface area identification before assessment
2. OWASP Top 10 coverage in every audit
3. All vulnerabilities mapped to specific CWE IDs
4. Clear severity assessment and prioritization
5. Actionable remediation steps with effort estimates
6. The agent produces a real audit report, not a description of one
