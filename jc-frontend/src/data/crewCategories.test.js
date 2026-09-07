import { describe, expect, it } from "vitest";
import { CREW_CATEGORIES, crewCategoryLabel, getStableCrewColor } from "./crewCategories";

describe("crew categories", () => {
  it("uses stable unique API values", () => {
    expect(new Set(CREW_CATEGORIES.map((category) => category.value)).size).toBe(CREW_CATEGORIES.length);
    expect(CREW_CATEGORIES).toHaveLength(15);
  });

  it("falls back to other for unknown values", () => {
    expect(crewCategoryLabel("UNKNOWN", "ko")).toBe("기타");
    expect(crewCategoryLabel("CAFE", "en")).toBe("Cafe");
  });

  it("uses a deterministic fallback color for crews without images", () => {
    expect(getStableCrewColor(42)).toBe(getStableCrewColor(42));
    expect(getStableCrewColor(42)).not.toBe(getStableCrewColor(43));
  });
});
