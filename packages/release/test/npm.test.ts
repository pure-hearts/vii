import { describe, it, expect } from "vitest";
import { npmVersionExists } from "../src/npm";

describe("npm.ts", () => {
  describe("npmVersionExists", () => {
    it("不存在的包返回 false", async () => {
      const result = npmVersionExists("@vyron/non-existent-package-xyz", "1.0.0");
      expect(result).toBe(false);
    });
  });
});
