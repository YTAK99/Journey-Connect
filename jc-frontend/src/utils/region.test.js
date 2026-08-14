import { describe, expect, it } from "vitest";
import {
  getLocalizedRegionName,
  getRegionSearchText,
  matchesSelectedRegion,
  toRegionPreference,
} from "./region";

describe("region utilities", () => {
  it("uses the requested localized name before fallback languages", () => {
    expect(getLocalizedRegionName({
      regionNames: {
        ko: "서울",
        en: "Seoul",
      },
    }, "en")).toBe("Seoul");
  });

  it("builds searchable text from translated names, hierarchy and country", () => {
    const text = getRegionSearchText({
      regionNames: {
        ko: "서울",
        en: "Seoul",
      },
      regionName: "서울특별시",
      regionCode: "SEOUL",
      regionSearchText: "South Korea Republic of Korea",
      countryCode: "KR",
    });

    expect(text).toContain("서울");
    expect(text).toContain("Seoul");
    expect(text).toContain("SEOUL");
    expect(text).toContain("South Korea Republic of Korea");
    expect(text).toContain("KR");
  });

  it("prefers stable region code matching over localized labels", () => {
    const selectedRegion = {
      code: "SEOUL",
      label: {
        ko: "완전히 다른 이름",
      },
    };

    expect(matchesSelectedRegion({ regionCode: "seoul" }, selectedRegion)).toBe(true);
  });

  it("creates a stable custom preference from a Google place identifier", () => {
    expect(toRegionPreference({
      googlePlaceId: "place-123",
      localizedNames: {
        ko: "테스트 도시",
        en: "Test City",
      },
      countryCode: "KR",
      timezone: "Asia/Seoul",
    })).toMatchObject({
      id: "google:place-123",
      placeId: "place-123",
      label: {
        ko: "테스트 도시",
        en: "Test City",
      },
      country: "KR",
      timezone: "Asia/Seoul",
      custom: true,
    });
  });
});
