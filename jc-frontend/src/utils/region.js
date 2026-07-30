export const getLocalizedRegionName = (item, lang = "ko", fallback = "지역 미정") => {
  const names = item?.regionNames || item?.region?.localizedNames || {};
  return names[lang] || names.en || names.ko || item?.regionName || item?.region?.displayName || item?.region?.name || item?.location || fallback;
};

export const getRegionSearchText = (item) => {
  // 도시명뿐 아니라 번역명·상위 행정구역·국가 코드를 한 문자열로 합쳐 지역 계층 검색에 사용합니다.
  const names = item?.regionNames || item?.region?.localizedNames || {};
  const hierarchy = item?.regionSearchText || item?.region?.searchText || "";
  const country = item?.region?.countryCode || item?.countryCode || "";
  return `${Object.values(names).join(" ")} ${item?.regionName || ""} ${item?.regionCode || ""} ${hierarchy} ${country}`.trim();
};

export const toRegionPreference = (region, lang = "ko") => {
  // API 지역 응답과 프론트 고정 지역을 전역 저장소가 사용하는 하나의 객체 형식으로 맞춥니다.
  if (!region) return REGIONS[0];
  const code = region.code || region.regionCode || null;
  const preset = code ? REGIONS.find((item) => item.code === code) : null;
  if (preset) return preset;

  const placeId = region.googlePlaceId || region.regionPlaceId || region.placeId || null;
  const names = region.localizedNames || region.regionNames || region.label || {};
  const fallbackName = region.displayName || region.regionName || names[lang] || names.en || names.ko || "Selected region";
  return {
    id: placeId ? `google:${placeId}` : code || region.id || `custom:${fallbackName}`,
    code,
    placeId,
    label: { ko: names.ko || fallbackName, en: names.en || fallbackName },
    country: region.countryCode || region.country || "",
    timezone: region.timezone || "UTC",
    weather: region.weather || { temp: 0, conditionKo: "날씨 확인 중", conditionEn: "Checking weather" },
    flightTime: region.flightTime || { ko: "이동 시간 확인 중", en: "Checking travel time" },
    custom: true,
  };
};

export const matchesSelectedRegion = (item, selectedRegion) => {
  // 안정적인 코드·Place ID를 우선 비교하고, 이전 데이터만 다국어 이름과 계층 검색어로 보완합니다.
  if (!selectedRegion) return true;
  const itemCode = item?.regionCode || item?.region?.code;
  if (itemCode && selectedRegion.code && itemCode.toLowerCase() === selectedRegion.code.toLowerCase()) return true;

  const itemPlaceId = item?.regionPlaceId || item?.region?.googlePlaceId;
  if (itemPlaceId && selectedRegion.placeId && itemPlaceId === selectedRegion.placeId) return true;

  const selectedNames = Object.values(selectedRegion.label || {})
    .filter(Boolean)
    .map((name) => String(name).toLowerCase().replace(/\s/g, ""));
  const searchable = getRegionSearchText(item).toLowerCase().replace(/\s/g, "");
  if (!searchable) return false;
  return selectedNames.some((name) => searchable.includes(name) || name.includes(searchable));
};
import { REGIONS } from "../data/regions";
