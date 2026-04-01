import { describe, expect, it } from "vitest";
import { validate } from "./validator.js";

describe("validate()", () => {
	it("returns success for a valid minimal spec", () => {
		const input = ["---", 'spec_version: "1.0"', "name: test", "---", ""].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.data.name).toBe("test");
			expect(result.data.spec_version).toBe("1.0");
		}
	});

	it("returns error when required field 'name' is missing", () => {
		const input = ["---", 'spec_version: "1.0"', "---", ""].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			const messages = result.errors.map((e) => e.message).join(" ");
			expect(messages).toMatch(/name/i);
		}
	});

	it("collects multiple errors in a single pass (PARS-05)", () => {
		const input = ["---", "foo: bar", "---", ""].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			// Must report at least 2 errors: missing spec_version AND missing name
			expect(result.errors.length).toBeGreaterThanOrEqual(2);
		}
	});

	it("returns error for invalid type (string instead of object)", () => {
		const input = [
			"---",
			'spec_version: "1.0"',
			"name: test",
			"reasoning: not-an-object",
			"---",
			"",
		].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			const messages = result.errors.map((e) => e.message).join(" ");
			expect(messages).toMatch(/type|object/i);
		}
	});

	it("returns error for non-frontmatter input", () => {
		const input = "This is just plain text without any frontmatter delimiters.";

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
		}
	});

	it("returns error for empty input", () => {
		const result = validate("");

		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.errors.length).toBeGreaterThanOrEqual(1);
			expect(result.errors[0].message).toMatch(/empty/i);
		}
	});
});

describe("line numbers", () => {
	it("reports correct line for invalid nested property", () => {
		const input = [
			"---",
			'spec_version: "1.0"',
			"name: test",
			"reasoning:",
			'  strategy: "invalid-strategy"',
			"---",
			"",
		].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			const strategyError = result.errors.find((e) => e.path.includes("strategy"));
			expect(strategyError).toBeDefined();
			expect(strategyError?.line).toBeTypeOf("number");
			// strategy is on line 5 of the file (after --- on line 1)
			expect(strategyError?.line).toBe(5);
		}
	});

	it("accounts for frontmatter delimiter offset", () => {
		const input = ["---", 'spec_version: "1.0"', "foo: bar", "---", ""].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			const fooError = result.errors.find((e) => e.path.includes("foo"));
			expect(fooError).toBeDefined();
			// foo is on line 3 of the file (after --- on line 1)
			expect(fooError?.line).toBe(3);
		}
	});

	it("reports distinct line numbers for multiple errors", () => {
		const input = [
			"---",
			'spec_version: "1.0"',
			"unknown_a: one",
			"unknown_b: two",
			"---",
			"",
		].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			const lineErrors = result.errors.filter((e) => e.line != null);
			expect(lineErrors.length).toBeGreaterThanOrEqual(2);
			const lines = lineErrors.map((e) => e.line);
			// At least two distinct line values
			expect(new Set(lines).size).toBeGreaterThanOrEqual(2);
		}
	});

	it("reports line numbers pointing into deep paths (steps section)", () => {
		const input = [
			"---",
			'spec_version: "1.0"',
			"name: test",
			"steps:",
			"  analyze:",
			"    description: do analysis",
			"    unknown_step_prop: bad",
			"---",
			"",
		].join("\n");

		const result = validate(input);

		expect(result.ok).toBe(false);
		if (!result.ok) {
			const deepError = result.errors.find((e) => e.path.includes("unknown_step_prop"));
			expect(deepError).toBeDefined();
			expect(deepError?.line).toBeTypeOf("number");
			// unknown_step_prop is on line 7 of the file
			expect(deepError?.line).toBe(7);
		}
	});
});
