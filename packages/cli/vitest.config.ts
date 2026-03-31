import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["**/*.test.ts"],
	},
	resolve: {
		alias: {
			"@logic-md/core": resolve(__dirname, "../core/index.ts"),
		},
	},
});
