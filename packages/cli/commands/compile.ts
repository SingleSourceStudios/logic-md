// =============================================================================
// LOGIC.md CLI - Compile Command
// =============================================================================
// Full pipeline: parse -> validate -> resolveImports -> DAG resolve.
// Outputs the fully resolved LogicSpec as JSON to stdout.
// Returns exit code: 0 = success, 1 = errors, 2 = file not found.
// =============================================================================

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
	CompilerError,
	compileStep,
	resolve as dagResolve,
	parse,
	resolveImports,
	validate,
} from "@logic-md/core";
import type { ExecutionContext } from "@logic-md/core";
import { formatError, formatInfo } from "../format.js";

interface CommandOptions {
	json?: boolean;
	step?: string;
}

export function runCompile(filePath: string | undefined, options: CommandOptions): number {
	if (!filePath) {
		console.error(formatError("No file specified. Usage: logic-md compile <file>"));
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

	// Step 1: Parse
	const parseResult = parse(content);
	if (!parseResult.ok) {
		for (const error of parseResult.errors) {
			console.error(formatError(error.message));
		}
		return 1;
	}

	// Step 2: Validate
	const validationResult = validate(content);
	if (!validationResult.ok) {
		for (const error of validationResult.errors) {
			const location =
				error.line != null
					? `${filePath}:${String(error.line)}${error.column != null ? `:${String(error.column)}` : ""}`
					: filePath;
			console.error(formatError(`${location}: ${error.message}`));
		}
		return 1;
	}

	// Step 3: Resolve imports
	const basedir = dirname(absPath);
	const importResult = resolveImports(parseResult.data, basedir);
	if (!importResult.ok) {
		for (const error of importResult.errors) {
			console.error(formatError(error.message));
		}
		return 1;
	}

	const spec = importResult.data;

	// Step 4a: Single-step compilation (--step flag)
	if (options.step) {
		const ctx: ExecutionContext = {
			currentStep: options.step,
			previousOutputs: {},
			input: null,
			attemptNumber: 1,
			branchReason: null,
			previousFailureReason: null,
		};

		let compiled;
		try {
			compiled = compileStep(spec, options.step, ctx);
		} catch (err: unknown) {
			if (err instanceof CompilerError) {
				console.error(formatError(err.message));
				return 1;
			}
			throw err;
		}

		const outputObj = {
			systemPromptSegment: compiled.systemPromptSegment,
			outputSchema: compiled.outputSchema,
			qualityGateCount: compiled.qualityGates.length,
			selfReflection: compiled.selfReflection,
			retryPolicy: compiled.retryPolicy,
			metadata: compiled.metadata,
			tokenWarning: compiled.tokenWarning,
		};

		console.log(JSON.stringify(outputObj, null, 2));
		return 0;
	}

	// Step 4b: DAG resolve (if steps exist)
	if (spec.steps && Object.keys(spec.steps).length > 0) {
		const dagResult = dagResolve(spec.steps);
		if (!dagResult.ok) {
			for (const error of dagResult.errors) {
				console.error(formatError(error.message));
			}
			return 1;
		}

		// Include DAG execution levels in output
		const output = {
			...spec,
			_dagLevels: dagResult.levels,
		};
		console.log(JSON.stringify(output, null, 2));
		console.error(
			formatInfo(`Compiled successfully (${String(dagResult.levels.length)} execution levels)`),
		);
	} else {
		console.log(JSON.stringify(spec, null, 2));
		console.error(formatInfo("Compiled successfully (no steps)"));
	}

	return 0;
}
