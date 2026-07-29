import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import LocationWeather from "../components/LocationWeather";
import PostCard from "../components/PostCard";
import { getApiErrorMessage } from "../services/apiClient";
import { getExplore, getFeed, getFeedItems } from "../services/postApi";
import useRegionStore from "../store/useRegionStore";
import { richTextToPlainText } from "../utils/richText";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const keyword = (searchParams.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    // 화면을 벗어난 뒤 늦게 도착한 응답이 상태를 갱신하지 않도록 active 플래그를 사용합니다.
    let active = true;

    const fetchFeed = async () => {
      setLoading(true);
      setError("");

      try {
        const result = keyword
          ? await getExplore({ keyword, size: 100 })
          : await getFeed({ size: 40 });
        if (active) setPosts(getFeedItems(result));
      } catch (requestError) {
        if (!active) return;
        setError(getApiErrorMessage(requestError, "피드 데이터를 불러오지 못했습니다."));
        setPosts([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchFeed();

    return () => {
      active = false;
    };
  }, [keyword]);

  const filteredPosts = useMemo(() => {
    // 현재 API에는 통합 검색 조건이 제한적이므로 받아온 피드를 지역과 검색어로 한 번 더 거릅니다.
    const regionTerms = [selectedRegion.label.ko, selectedRegion.label.en, selectedRegion.id]
      .filter(Boolean)
      .map((term) => String(term).toLowerCase());

    return posts.filter((post) => {
      const searchableRegion = `${post.regionName || ""} ${post.region?.name || ""} ${post.regionCode || ""}`.toLowerCase();
      if (!keyword) return regionTerms.some((term) => searchableRegion.includes(term));
      const searchable = `${post.title || ""} ${richTextToPlainText(post.content || "")} ${searchableRegion} ${(post.tags || []).join(" ")}`.toLowerCase();
      return searchable.includes(keyword);
    });
  }, [keyword, posts, selectedRegion]);

  return (
    <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
      {/* 축소된 헤더 아래에도 기존과 같은 시각적 분리 여백을 확보합니다. */}
      <div className="pb-4 pt-20">
        <section className="mx-auto max-w-screen-xl space-y-2 bg-white px-6 py-3 dark:bg-slate-900">
          <LocationWeather selectedRegion={selectedRegion} onRegionChange={setSelectedRegion} />
        </section>

        <section className="mx-auto max-w-screen-xl px-4 py-3">
          <div className="mb-4 flex flex-col gap-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">탐색</h1>
            {keyword && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                헤더 검색어: <span className="font-medium text-teal-700">{searchParams.get("q")}</span>
              </p>
            )}
          </div>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          {loading && <p className="py-10 text-center text-gray-500 dark:text-slate-400">탐색 카드를 불러오는 중입니다.</p>}

          {!loading && (
            <div className="grid grid-cols-1 gap-4 border-b border-gray-100 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} setPosts={setPosts} />
              ))}
            </div>
          )}

          {!loading && filteredPosts.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              선택한 지역에 맞는 탐색 결과가 없습니다.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
