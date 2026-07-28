export const getLocalizedRegionName = (item, lang = "ko", fallback = "지역 미정") => {
  const names = item?.regionNames || item?.region?.localizedNames || {};
  return names[lang] || names.en || names.ko || item?.regionName || item?.region?.displayName || item?.region?.name || item?.location || fallback;
};

export const getRegionSearchText = (item) => {
  const names = item?.regionNames || item?.region?.localizedNames || {};
  return `${Object.values(names).join(" ")} ${item?.regionName || ""} ${item?.regionCode || ""}`.trim();
};

export const toRegionPreference = (region, lang = "ko") => {
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
