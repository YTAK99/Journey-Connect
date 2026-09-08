import { describe, expect, it } from "vitest";
import { getStablePostFallbackColor } from "./postVisuals";

describe("post visual utilities", () => {
  it("returns the same fallback color for the same post identifier", () => {
    expect(getStablePostFallbackColor(42)).toBe(getStablePostFallbackColor(42));
  });

  it("returns an HSL color for a missing identifier", () => {
    expect(getStablePostFallbackColor()).toMatch(/^hsl\(\d+ 62% 72%\)$/);
  });
});
