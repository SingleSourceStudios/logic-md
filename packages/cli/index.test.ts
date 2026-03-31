import { VERSION } from "@logic-md/core";
import { describe, expect, it } from "vitest";

describe("cli", () => {
	it("should import from core", () => {
		expect(VERSION).toBe("0.0.0");
	});
});
