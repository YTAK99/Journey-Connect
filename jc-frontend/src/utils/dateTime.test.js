import { describe, expect, it } from "vitest";
import { parseApiDate } from "./dateTime";

describe("parseApiDate", () => {
  it("treats a timezone-less backend timestamp as UTC", () => {
    expect(parseApiDate("2026-08-19T06:00:00").toISOString())
      .toBe("2026-08-19T06:00:00.000Z");
  });

  it("preserves timestamps that already contain an offset", () => {
    expect(parseApiDate("2026-08-19T15:00:00+09:00").toISOString())
      .toBe("2026-08-19T06:00:00.000Z");
  });
});
