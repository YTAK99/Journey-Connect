import FeedCard from "../components/FeedCard";
import LocationWeather from "../components/LocationWeather";
import StoryList from "../components/StoryList";
import useRegionStore from "../store/useRegionStore";
import { useSearchParams } from "react-router";

export default function FeedPage() {
  // 헤더 검색어와 전역 선택 지역을 날씨·스토리·피드 영역에 내려주는 조합 페이지입니다.
  const [searchParams] = useSearchParams();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const keyword = (searchParams.get("q") || "").trim();

  return (
    <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
      <div className="pb-4 pt-20">
        {/* 고정 헤더와 지역 영역 사이의 여백은 유지하고, 카드 내부의 세로 간격만 줄입니다. */}
        <section className="mx-auto max-w-screen-xl space-y-1 bg-white px-6 py-2 dark:bg-slate-900">
          <LocationWeather selectedRegion={selectedRegion} onRegionChange={setSelectedRegion} />
          <StoryList selectedRegion={selectedRegion} />
        </section>

        <section className="mx-auto max-w-screen-xl px-4 pt-3">
          <FeedCard selectedRegion={selectedRegion} keyword={keyword} />
        </section>
      </div>
    </main>
  );
}
