import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, detectCommercialSignals, sha256Text } from "../src/index";

describe("evidence utilities", () => {
  it("blocks private network URLs", () => {
    expect(() => assertPublicHttpUrl("http://127.0.0.1/admin")).toThrow();
  });

  it("detects commercial signals without assigning a verdict", () => {
    expect(detectCommercialSignals("https://shop.example/item?aff=12", "Use code SAVE20")).toHaveLength(2);
  });

  it("creates stable hashes", async () => {
    expect(await sha256Text("guardian")).toHaveLength(64);
  });
});
