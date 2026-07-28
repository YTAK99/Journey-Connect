import { useEffect, useMemo, useState } from "react";
import { Compass, PenLine, RotateCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LocationWeather from "../components/LocationWeather";
import PostCard from "../components/PostCard";
import { getApiErrorMessage } from "../services/apiClient";
import { getExplore, getFeed, getFeedItems } from "../services/postApi";
import useLangStore from "../store/useLangStore";
import useRegionStore from "../store/useRegionStore";
import { richTextToPlainText } from "../utils/richText";
import { getRegionSearchText, matchesSelectedRegion } from "../utils/region";

const copy = {
  ko: {
    noResults: (query) => `‘${query}’ 검색 결과가 아직 없어요.`,
    invitation: "첫 번째 여행기를 남겨보세요.",
    write: "여행기 작성하기",
    reset: "검색 초기화",
    suggestions: "대신 이런 여행기는 어때요?",
    nearby: (region) => `${region}의 다른 여행기`,
    recent: "최근 올라온 여행기",
    loading: "추천 여행기를 불러오는 중입니다.",
    unavailable: "지금은 추천할 여행기가 없습니다.",
  },
  en: {
    noResults: (query) => `There are no results for “${query}” yet.`,
    invitation: "Be the first to share a travel story.",
    write: "Write a story",
    reset: "Clear search",
    suggestions: "How about one of these trips?",
    nearby: (region) => `More stories from ${region}`,
    recent: "Recently published",
    loading: "Loading travel suggestions...",
    unavailable: "There are no travel stories to recommend yet.",
  },
};

const normalizeSearchValue = (value) => String(value || "").toLowerCase().replace(/[\s,]/g, "");

const getParentRegionName = (region) => {
  const address = String(region?.country || "").trim();
  if (!address) return "";

  const labels = Object.values(region?.label || {}).filter(Boolean);
  const withoutCity = labels.reduce(
    (value, label) => value.replaceAll(String(label), " "),
    address,
  ).trim();
  const commaParts = withoutCity.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length > 1) return commaParts[0];

  const spaceParts = withoutCity.split(/\s+/).filter(Boolean);
  return spaceParts.at(-1) || "";
};

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const t = copy[currentLang] || copy.ko;
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const [posts, setPosts] = useState([]);
  const [recommendationResult, setRecommendationResult] = useState({ key: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const rawKeyword = (searchParams.get("q") || "").trim();
  const keyword = rawKeyword.toLowerCase();

  useEffect(() => {
    // 화면을 벗어난 뒤 늦게 도착한 응답이 상태를 갱신하지 않도록 active 플래그를 사용합니다.
    let active = true;

    const fetchFeed = async () => {
      setLoading(true);
      setError("");

      try {
        const result = keyword
          ? await getExplore({ keyword, size: 100 })
          : await getFeed({ size: 100 });
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
    return posts.filter((post) => {
      const searchableRegion = getRegionSearchText(post).toLowerCase();
      if (!keyword) return matchesSelectedRegion(post, selectedRegion);
      const searchable = `${post.title || ""} ${richTextToPlainText(post.content || "")} ${searchableRegion} ${(post.tags || []).join(" ")}`.toLowerCase();
      return searchable.includes(keyword);
    });
  }, [keyword, posts, selectedRegion]);

  const showEmptyState = !loading && !error && filteredPosts.length === 0;
  const recommendationKey = `${keyword}|${selectedRegion?.id || ""}`;
  const recommendations = useMemo(
    () => (recommendationResult.key === recommendationKey ? recommendationResult.items : []),
    [recommendationKey, recommendationResult],
  );
  const recommendationsLoading = showEmptyState && recommendationResult.key !== recommendationKey;

  useEffect(() => {
    if (!showEmptyState) return undefined;

    let active = true;
    getFeed({ size: 12 })
      .then((result) => {
        if (active) setRecommendationResult({ key: recommendationKey, items: getFeedItems(result) });
      })
      .catch(() => {
        if (active) setRecommendationResult({ key: recommendationKey, items: [] });
      });

    return () => {
      active = false;
    };
  }, [recommendationKey, showEmptyState]);

  const parentRegionName = useMemo(() => getParentRegionName(selectedRegion), [selectedRegion]);
  const parentPosts = useMemo(() => {
    const normalizedParent = normalizeSearchValue(parentRegionName);
    if (!normalizedParent) return [];
    return recommendations
      .filter((post) => normalizeSearchValue(getRegionSearchText(post)).includes(normalizedParent))
      .slice(0, 3);
  }, [parentRegionName, recommendations]);
  const parentPostIds = useMemo(() => new Set(parentPosts.map((post) => post.id)), [parentPosts]);
  const recentPosts = useMemo(
    () => recommendations.filter((post) => !parentPostIds.has(post.id)).slice(0, 6),
    [parentPostIds, recommendations],
  );
  const queryLabel = rawKeyword || selectedRegion?.label?.[currentLang] || selectedRegion?.label?.ko || "여행지";

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

          {!loading && filteredPosts.length > 0 && (
            <div className="grid grid-cols-1 gap-4 border-b border-gray-100 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <PostCard key={post.id} post={post} setPosts={setPosts} />
              ))}
            </div>
          )}

          {showEmptyState && (
            <div className="space-y-8">
              <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm dark:border-teal-900/60 dark:bg-slate-900">
                <div className="bg-gradient-to-r from-teal-50 via-white to-sky-50 px-6 py-8 text-center dark:from-teal-950/40 dark:via-slate-900 dark:to-sky-950/30 sm:px-10">
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200">
                    <Compass size={23} />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.noResults(queryLabel)}</h2>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t.invitation}</p>
                  <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => navigate("/write")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-600"
                    >
                      <PenLine size={16} /> {t.write}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/feed")}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <RotateCcw size={15} /> {t.reset}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">Journey Picks</p>
                  <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{t.suggestions}</h2>
                </div>

                {recommendationsLoading && (
                  <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {t.loading}
                  </p>
                )}

                {!recommendationsLoading && parentPosts.length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t.nearby(parentRegionName)}</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {parentPosts.map((post) => (
                        <PostCard
                          key={`parent-${post.id}`}
                          post={post}
                          setPosts={(updater) => setRecommendationResult((current) => ({
                            ...current,
                            items: typeof updater === "function" ? updater(current.items) : updater,
                          }))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!recommendationsLoading && recentPosts.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">{t.recent}</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {recentPosts.map((post) => (
                        <PostCard
                          key={`recent-${post.id}`}
                          post={post}
                          setPosts={(updater) => setRecommendationResult((current) => ({
                            ...current,
                            items: typeof updater === "function" ? updater(current.items) : updater,
                          }))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {!recommendationsLoading && recommendations.length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    {t.unavailable}
                  </p>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
