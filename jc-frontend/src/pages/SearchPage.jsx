import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import LocationWeather from "../components/LocationWeather";
import PostCard from "../components/PostCard";
import { getApiErrorMessage } from "../services/apiClient";
import { getFeed, getFeedItems } from "../services/postApi";
import useRegionStore from "../store/useRegionStore";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const keyword = (searchParams.get("q") || "").trim().toLowerCase();

  useEffect(() => {
    let active = true;

    const fetchFeed = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getFeed({ size: 40 });
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
  }, []);

  const filteredPosts = useMemo(() => {
    const regionTerms = [selectedRegion.label.ko, selectedRegion.label.en, selectedRegion.id]
      .filter(Boolean)
      .map((term) => String(term).toLowerCase());

    return posts.filter((post) => {
      const searchableRegion = `${post.regionName || ""} ${post.region?.name || ""} ${post.regionCode || ""}`.toLowerCase();
      const regionMatched = regionTerms.some((term) => searchableRegion.includes(term));
      if (!regionMatched) return false;

      if (!keyword) return true;
      const searchable = `${post.title || ""} ${post.content || ""} ${searchableRegion}`.toLowerCase();
      return searchable.includes(keyword);
    });
  }, [keyword, posts, selectedRegion]);

  return (
    <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
      <div className="pt-20 pb-4">
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
