import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, PenLine, RotateCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import PostCard from "../components/PostCard";
import { getApiErrorMessage } from "../services/apiClient";
import { getExplore, getExploreDiscovery, getFeedItems } from "../services/postApi";
import useLangStore from "../store/useLangStore";
import { getMessages, translate } from "../i18n";

const isExploreCursorError = (error) => String(
  error?.response?.data?.code || "",
).startsWith("EXPLORE_CURSOR_");

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const t = getMessages(currentLang, "explore");
  const [posts, setPosts] = useState([]);
  const [recommendationResult, setRecommendationResult] = useState({ key: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState(null);
  const [hasNext, setHasNext] = useState(false);
  const requestKeyRef = useRef("");
  const rawKeyword = (searchParams.get("q") || "").trim();
  const keyword = rawKeyword.toLowerCase();
  const requestKey = keyword;

  useEffect(() => {
    // 검색어가 바뀌면 이전 cursor를 폐기하고 전체 지역의 첫 페이지부터 다시 조회합니다.
    let active = true;
    requestKeyRef.current = requestKey;

    const fetchExplore = async () => {
      setLoading(true);
      setLoadingMore(false);
      setError("");
      setNextCursor(null);
      setHasNext(false);

      try {
        const result = keyword
          ? await getExplore({ keyword, size: 100 })
          : await getExploreDiscovery({ size: 20 });
        if (!active || requestKeyRef.current !== requestKey) return;

        setPosts(getFeedItems(result));
        if (!keyword) {
          setNextCursor(result?.nextCursor || null);
          setHasNext(Boolean(result?.hasNext && result?.nextCursor));
        }
      } catch (requestError) {
        if (!active || requestKeyRef.current !== requestKey) return;
        setError(getApiErrorMessage(requestError, t.loadFailed));
        setPosts([]);
      } finally {
        if (active && requestKeyRef.current === requestKey) setLoading(false);
      }
    };

    fetchExplore();

    return () => {
      active = false;
    };
  }, [keyword, requestKey, t.loadFailed]);

  const loadMoreDiscovery = async () => {
    if (keyword || loadingMore || !hasNext || !nextCursor) return;

    const activeRequestKey = requestKeyRef.current;
    setLoadingMore(true);
    setError("");

    try {
      const result = await getExploreDiscovery({
        cursor: nextCursor,
        size: 20,
      });
      if (requestKeyRef.current !== activeRequestKey) return;

      const incoming = getFeedItems(result);
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...incoming.filter((post) => !seen.has(post.id))];
      });
      setNextCursor(result?.nextCursor || null);
      setHasNext(Boolean(result?.hasNext && result?.nextCursor));
    } catch (requestError) {
      if (requestKeyRef.current !== activeRequestKey) return;
      if (isExploreCursorError(requestError)) {
        try {
          const restarted = await getExploreDiscovery({
            size: 20,
          });
          if (requestKeyRef.current !== activeRequestKey) return;
          setPosts(getFeedItems(restarted));
          setNextCursor(restarted?.nextCursor || null);
          setHasNext(Boolean(restarted?.hasNext && restarted?.nextCursor));
          return;
        } catch (restartError) {
          if (requestKeyRef.current !== activeRequestKey) return;
          setNextCursor(null);
          setHasNext(false);
          setError(getApiErrorMessage(
            restartError,
            t.restartFailed,
          ));
          return;
        }
      }
      setError(getApiErrorMessage(requestError, t.loadMoreFailed));
    } finally {
      if (requestKeyRef.current === activeRequestKey) setLoadingMore(false);
    }
  };

  // 검색 eligibility는 서버가 authoritative하게 적용하므로 클라이언트에서 다시 거르지 않습니다.
  const filteredPosts = posts;

  const showEmptyState = !loading && !error && filteredPosts.length === 0;
  const recommendationKey = keyword;
  const recommendations = useMemo(
    () => (recommendationResult.key === recommendationKey ? recommendationResult.items : []),
    [recommendationKey, recommendationResult],
  );
  const recommendationsLoading = showEmptyState && recommendationResult.key !== recommendationKey;

  useEffect(() => {
    if (!showEmptyState) return undefined;

    // 검색 결과가 없을 때 전체 지역의 최신 탐색 글을 대안으로 가져옵니다.
    let active = true;
    getExploreDiscovery({ size: 12 })
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

  const recentPosts = useMemo(
    () => recommendations.slice(0, 6),
    [recommendations],
  );
  const queryLabel = rawKeyword || t.allJourneys;

  return (
    <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
      {/* 축소된 헤더 아래에도 기존과 같은 시각적 분리 여백을 확보합니다. */}
      <div className="pb-4 pt-20">
        <section className="mx-auto max-w-screen-xl px-4 py-3">
          <div className="mb-4 flex flex-col gap-1">
            {keyword && (
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {t.headerQuery}: <span className="font-medium text-teal-700">{searchParams.get("q")}</span>
              </p>
            )}
          </div>

          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          {loading && <p className="py-10 text-center text-gray-500 dark:text-slate-400">{t.cardsLoading}</p>}

          {!loading && filteredPosts.length > 0 && (
            <>
              <div className="grid grid-cols-1 gap-4 border-b border-gray-100 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} setPosts={setPosts} titleOnly colorFallback />
                ))}
              </div>

              {!keyword && hasNext && (
                <div className="flex justify-center py-6">
                  <button
                    type="button"
                    onClick={loadMoreDiscovery}
                    disabled={loadingMore}
                    className="rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-900 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800"
                  >
                    {loadingMore ? t.loadingMore : t.loadMore}
                  </button>
                </div>
              )}
            </>
          )}

          {showEmptyState && (
            <div className="space-y-8">
              <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm dark:border-teal-900/60 dark:bg-slate-900">
                <div className="bg-gradient-to-r from-teal-50 via-white to-sky-50 px-6 py-8 text-center dark:from-teal-950/40 dark:via-slate-900 dark:to-sky-950/30 sm:px-10">
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200">
                    <Compass size={23} />
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{translate(currentLang, "explore.noResults", { query: queryLabel })}</h2>
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
                      onClick={() => navigate("/explore")}
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
                          titleOnly
                          colorFallback
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
