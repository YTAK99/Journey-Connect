import { create } from "zustand";
import { REGIONS } from "../data/regions";

const STORAGE_KEY = "selectedRegion";
const LEGACY_STORAGE_KEY = "selectedRegionId";

const getInitialRegion = () => {
  try {
    const savedRegion = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (savedRegion?.id && savedRegion?.label?.ko && savedRegion?.label?.en) return savedRegion;
  } catch {
    // Ignore an old or malformed value and fall back to the legacy id/default.
  }

  const savedId = localStorage.getItem(LEGACY_STORAGE_KEY);
  return REGIONS.find((region) => region.id === savedId) || REGIONS[0];
};

const useRegionStore = create((set) => ({
  selectedRegion: getInitialRegion(),
  setSelectedRegion: (region) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    set({ selectedRegion: region });
  },
}));

export default useRegionStore;
