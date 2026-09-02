import { create } from "zustand";
import { REGIONS } from "../data/regions";
import { toRegionPreference } from "../utils/region";

// 현재 선택한 지역을 저장하는 localStorage 키
const STORAGE_KEY = "selectedRegion";

// 예전 버전에서 사용하던 지역 ID 저장 키
const LEGACY_STORAGE_KEY = "selectedRegionId";

// 기본 지역은 REGIONS의 첫 번째 값 사용
const getDefaultRegion = () =>
    toRegionPreference(REGIONS[0]);

// 앱 시작할 때 어떤 지역을 사용할지 결정
const getInitialRegion = () => {
  try {
    // 현재 저장 방식: 지역 객체 전체를 JSON으로 저장
    const savedRegion = JSON.parse(
        localStorage.getItem(STORAGE_KEY),
    );

    // 정상적인 저장값이면 그대로 복구
    if (
        savedRegion?.id &&
        savedRegion?.label
    ) {
      return toRegionPreference(
          savedRegion,
      );
    }
  } catch {
    // 저장값이 깨졌으면 무시하고 아래 복구 로직으로 진행
  }

  // 예전 방식으로 저장된 selectedRegionId가 있는지 확인
  const savedId =
      localStorage.getItem(
          LEGACY_STORAGE_KEY,
      );

  const legacyRegion =
      REGIONS.find(
          (region) =>
              region.id === savedId,
      );

  // 예전 저장값이 있으면 현재 지역 객체 형식으로 변환해서 사용
  if (legacyRegion) {
    return toRegionPreference(
        legacyRegion,
    );
  }

  // 저장된 지역이 없으면 기본 지역 사용
  return getDefaultRegion();
};

const useRegionStore = create(
    (set) => ({
      // 앱 시작 시 localStorage에서 지역 복구
      selectedRegion:
          getInitialRegion(),

      // 사용자가 지역을 변경했을 때 호출
      setSelectedRegion: (region) => {
        const normalizedRegion =
            toRegionPreference(region);

        // 새 지역을 localStorage에 저장
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
                normalizedRegion,
            ),
        );

        // 예전 저장 방식은 제거
        localStorage.removeItem(
            LEGACY_STORAGE_KEY,
        );

        // Zustand 상태도 즉시 변경
        set({
          selectedRegion:
          normalizedRegion,
        });
      },

      // 검색 초기화 시 지역도 기본값으로 되돌리기 위해 추가
      resetSelectedRegion: () => {
        const defaultRegion =
            getDefaultRegion();

        // 저장된 지역 정보 삭제
        localStorage.removeItem(
            STORAGE_KEY,
        );

        localStorage.removeItem(
            LEGACY_STORAGE_KEY,
        );

        // 현재 화면의 지역 상태도 기본 지역으로 변경
        set({
          selectedRegion:
          defaultRegion,
        });
      },
    }),
);

export default useRegionStore;