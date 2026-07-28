import { create } from "zustand";
import { REGIONS } from "../data/regions";
import { toRegionPreference } from "../utils/region";

const STORAGE_KEY = "selectedRegion";
const LEGACY_STORAGE_KEY = "selectedRegionId";

// 새 객체 형식 저장값을 우선 사용하고, 예전 id 형식도 읽어 기존 사용자의 선택을 유지합니다.
const getInitialRegion = () => {
  try {
    const savedRegion = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (savedRegion?.id && savedRegion?.label) return toRegionPreference(savedRegion);
  } catch {
    // Ignore an old or malformed value and fall back to the legacy id/default.
  }

  const savedId = localStorage.getItem(LEGACY_STORAGE_KEY);
  return REGIONS.find((region) => region.id === savedId) || REGIONS[0];
};

// 여러 페이지가 같은 선택 지역을 공유하도록 Zustand 상태와 localStorage를 동기화합니다.
const useRegionStore = create((set) => ({
  selectedRegion: getInitialRegion(),
  setSelectedRegion: (region) => {
    const normalizedRegion = toRegionPreference(region);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedRegion));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    set({ selectedRegion: normalizedRegion });
  },
}));

export default useRegionStore;
