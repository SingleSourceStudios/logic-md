export const VERSION = "0.0.0";
export {
	type ParseError,
	type ParseFailure,
	type ParseResult,
	type ParseSuccess,
	parse,
} from "./parser.js";
export { createValidator, getSchema } from "./schema.js";
export * from "./types.js";
export { validate } from "./validator.js";
