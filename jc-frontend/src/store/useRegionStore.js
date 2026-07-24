import { create } from "zustand";
import { REGIONS } from "../data/regions";

const STORAGE_KEY = "selectedRegionId";

const getInitialRegion = () => {
  const savedId = localStorage.getItem(STORAGE_KEY);
  return REGIONS.find((region) => region.id === savedId) || REGIONS[0];
};

const useRegionStore = create((set) => ({
  selectedRegion: getInitialRegion(),
  setSelectedRegion: (region) => {
    localStorage.setItem(STORAGE_KEY, region.id);
    set({ selectedRegion: region });
  },
}));

export default useRegionStore;
