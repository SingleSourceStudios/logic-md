// =============================================================================
// LOGIC.md CLI - Validate Command
// =============================================================================
// Reads a LOGIC.md file and validates it against the spec schema.
// Returns exit code: 0 = valid, 1 = validation errors, 2 = file not found.
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validate } from "@logic-md/core";
import { formatError, formatSuccess } from "../format.js";

interface CommandOptions {
	json?: boolean;
}

export function runValidate(filePath: string | undefined, _options: CommandOptions): number {
	if (!filePath) {
		console.error(formatError("No file specified. Usage: logic-md validate <file>"));
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

	const result = validate(content);

	if (result.ok) {
		console.log(formatSuccess("Valid LOGIC.md file"));
		return 0;
	}

	for (const error of result.errors) {
		const location =
			error.line != null
				? `${filePath}:${String(error.line)}${error.column != null ? `:${String(error.column)}` : ""}`
				: filePath;
		console.error(formatError(`${location}: ${error.message}`));
	}

	return 1;
}
