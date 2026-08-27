import { useCallback } from "react";
import FeedCard from "../components/FeedCard";
import LocationWeather from "../components/LocationWeather";
import useRegionStore from "../store/useRegionStore";
import { useNavigate, useSearchParams } from "react-router";


// Feed 페이지
// 선택한 지역을 기준으로 날씨 / 스토리 / 게시물 피드를 한 화면에 보여줌
export default function FeedPage() {
  // URL의 ?q= 검색어 읽기
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // 현재 선택 지역과 지역 변경 함수
  const {
    selectedRegion,
    setSelectedRegion,
  } = useRegionStore();

  // 검색어가 있으면 피드에도 같이 전달
  const keyword = (
      searchParams.get("q") || ""
  ).trim();
  const search = searchParams.toString();
  const handleEmptyResult = useCallback(() => {
    navigate({ pathname: "/explore", search: search ? `?${search}` : "" }, { replace: true });
  }, [navigate, search]);

  return (
      <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
        <div className="pb-4 pt-20">

          {/* 현재 선택 지역 기준 날씨. 연수 브랜치 요구사항에 따라 스토리 바는 제거했습니다. */}
          <section className="mx-auto max-w-screen-xl space-y-1 bg-white px-6 py-2 dark:bg-slate-900">
            <LocationWeather
                selectedRegion={selectedRegion}

                // 여기서 지역을 바꾸면 Zustand의 전역 지역도 같이 변경됨
                onRegionChange={setSelectedRegion}
            />

          </section>


          {/* 현재 지역과 검색어에 맞는 게시물 피드 */}
          <section className="mx-auto max-w-screen-xl px-4 pt-3">
            <FeedCard
                selectedRegion={selectedRegion}
                keyword={keyword}
                onEmptyResult={handleEmptyResult}
            />
          </section>
        </div>
      </main>
  );
}
