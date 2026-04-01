// =============================================================================
// LOGIC.md CLI - Lint Command
// =============================================================================
// Parses a LOGIC.md file and checks for best practices beyond schema validity.
// Returns exit code: 0 = no warnings, 1 = warnings found, 2 = file not found.
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type DagFailure, resolve as dagResolve, type LogicSpec, parse } from "@logic-md/core";
import { formatError, formatInfo, formatWarning } from "../format.js";

interface CommandOptions {
	json?: boolean;
}

export interface LintDiagnostic {
	level: "warning" | "info";
	message: string;
	step?: string;
}

/**
 * Pure lint function: accepts a parsed LogicSpec and returns diagnostics.
 * Does not perform I/O -- suitable for unit testing.
 */
export function lintSpec(spec: LogicSpec): LintDiagnostic[] {
	const diagnostics: LintDiagnostic[] = [];

	// Check: missing fallback section
	if (!spec.fallback) {
		diagnostics.push({
			level: "info",
			message: "No fallback section defined. Consider adding error recovery strategy.",
		});
	}

	if (!spec.steps) return diagnostics;

	const stepEntries = Object.entries(spec.steps);

	// Check: steps without descriptions
	for (const [name, step] of stepEntries) {
		if (!step.description) {
			diagnostics.push({
				level: "info",
				message: `Step "${name}" has no description`,
				step: name,
			});
		}
	}

	// Check: branches without a default
	for (const [name, step] of stepEntries) {
		if (
			step.branches &&
			step.branches.length > 0 &&
			!step.branches.some((b) => b.default === true)
		) {
			diagnostics.push({
				level: "warning",
				message: `Step "${name}" has branches but no default branch`,
				step: name,
			});
		}
	}

	// Check: unreachable steps and missing dependencies via DAG resolver
	const dagResult = dagResolve(spec.steps);
	if (!dagResult.ok) {
		const failure = dagResult as DagFailure;
		for (const error of failure.errors) {
			if (error.type === "unreachable") {
				diagnostics.push({
					level: "warning",
					message: error.message,
				});
			} else if (error.type === "missing_dependency") {
				diagnostics.push({
					level: "warning",
					message: error.message,
				});
			}
		}
	}

	return diagnostics;
}

export function runLint(filePath: string | undefined, options: CommandOptions): number {
	if (!filePath) {
		console.error(formatError("No file specified. Usage: logic-md lint <file>"));
		return 1;
	}

	const absPath = resolve(filePath);

	let content: string;
	try {
		content = readFileSync(absPath, "utf-8");
	} catch (err: unknown) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === "ENOENT" || code === "EISDIR") {
			console.error(formatError(`File not found: ${filePath}`));
			return 2;
		}
		throw err;
	}

	const parseResult = parse(content);
	if (!parseResult.ok) {
		for (const error of parseResult.errors) {
			console.error(formatError(error.message));
		}
		return 1;
	}

	const diagnostics = lintSpec(parseResult.data);

	if (options.json) {
		console.log(JSON.stringify(diagnostics, null, 2));
	} else {
		if (diagnostics.length === 0) {
			console.log(formatInfo("No issues found"));
		}
		for (const diag of diagnostics) {
			const prefix = diag.step ? `[${diag.step}] ` : "";
			const msg = `${prefix}${diag.message}`;
			if (diag.level === "warning") {
				console.error(formatWarning(msg));
			} else {
				console.log(formatInfo(msg));
			}
		}
	}

	const hasWarnings = diagnostics.some((d) => d.level === "warning");
	return hasWarnings ? 1 : 0;
}
