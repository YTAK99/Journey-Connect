import { describe, expect, it } from "vitest";
import { getHeaderSearchTargetPath } from "./headerSearch";

describe("header search target", () => {
  it.each(["/feed", "/explore", "/crew"])("keeps searchable page %s", (pathname) => {
    expect(getHeaderSearchTargetPath(pathname)).toBe(pathname);
  });

  it("falls back to explore outside searchable list pages", () => {
    expect(getHeaderSearchTargetPath("/mypage")).toBe("/explore");
  });
});
