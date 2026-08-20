import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { bookmarkPost, getExplore, getFeed, getFeedItems, getPostAnalysis, likePost, unbookmarkPost, unlikePost } from "../services/postApi";
import { richTextToPlainText } from "../utils/richText";
import { getLocalizedRegionName, matchesSelectedRegion } from "../utils/region";
import { parseApiDate } from "../utils/dateTime";
import useLangStore from "../store/useLangStore";
import TagChips from "./TagChips";

const fallbackImage = "/ex_1.jpg";
const fallbackAvatar = "/user_1.jpg";

const getRelativeDate = (createdAt) => {
  if (!createdAt) return "방금 전";
  const date = parseApiDate(createdAt);
  if (Number.isNaN(date.getTime())) return String(createdAt).slice(0, 10);

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;

  return `${Math.floor(months / 12)}년 전`;
};

function FeedItem({ post }) {
  // 게시물 한 건의 작성자·본문·반응 정보를 카드로 표현하고 좋아요·북마크 상태를 관리합니다.
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [showSummary, setShowSummary] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const location = getLocalizedRegionName(post, currentLang);
  const summary =
    analysis?.status === "succeeded"
      ? analysis.result?.summary?.trim() || ""
      : "";
  const summaryMessage = analysisLoading
    ? (currentLang === "ko" ? "AI 요약을 불러오는 중입니다." : "Loading AI summary.")
    : analysisError
      ? analysisError
      : summary
        ? summary
        : analysis?.status === "queued" || analysis?.status === "running"
          ? (currentLang === "ko" ? "AI 요약을 준비 중입니다." : "AI summary is being prepared.")
          : analysis?.status === "failed" || analysis?.status === "quarantined"
            ? (currentLang === "ko" ? "AI 요약을 현재 제공할 수 없습니다." : "AI summary is currently unavailable.")
            : (currentLang === "ko" ? "AI 요약이 아직 생성되지 않았습니다." : "AI summary has not been generated yet.");

  const toggleLike = async (event) => {
    event.stopPropagation();
    // 반응을 먼저 화면에 반영하고 API가 실패하면 이전 상태로 되돌리는 낙관적 업데이트입니다.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((count) => Math.max(0, count + (nextLiked ? 1 : -1)));

    try {
      if (nextLiked) await likePost(post.id);
      else await unlikePost(post.id);
    } catch (error) {
      setLiked(!nextLiked);
      setLikeCount((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
      alert(getApiErrorMessage(error, "좋아요 처리에 실패했습니다."));
    }
  };

  const toggleBookmark = async (event) => {
    event.stopPropagation();
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);

    try {
      if (nextBookmarked) await bookmarkPost(post.id);
      else await unbookmarkPost(post.id);
    } catch (error) {
      setBookmarked(!nextBookmarked);
      alert(getApiErrorMessage(error, "북마크 처리에 실패했습니다."));
    }
  };

  const toggleSummary = async () => {
    const nextOpen = !showSummary;
    setShowSummary(nextOpen);
    if (!nextOpen || analysisLoading || analysis?.status === "succeeded") return;

    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      setAnalysis(await getPostAnalysis(post.id));
    } catch (error) {
      setAnalysisError(getApiErrorMessage(
        error,
        currentLang === "ko" ? "AI 요약을 불러오지 못했습니다." : "Could not load AI summary.",
      ));
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <article className="mx-auto w-full max-w-lg overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={post.author?.profileImageUrl || fallbackAvatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <h3 className="text-base font-semibold leading-5 text-gray-900 dark:text-slate-100">
                {post.author?.nickname || "여행자"}
              </h3>
              <p className="text-sm leading-5 text-gray-500 dark:text-slate-400">
                {location} · {getRelativeDate(post.createdAt)}
              </p>
            </div>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100" aria-label="더보기">
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div className="h-64 w-full overflow-hidden px-5">
        <img
          src={post.coverImageUrl || post.image || fallbackImage}
          alt={post.title}
          className="h-full w-full cursor-pointer rounded-lg object-cover"
          onClick={() => navigate(`/post/${post.id}`)}
        />
      </div>

      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLike}
            className={`flex items-center gap-1 text-gray-700 transition-colors hover:text-red-500 dark:text-slate-300 ${
              liked ? "text-red-500" : ""
            }`}
          >
            <Heart size={24} fill={liked ? "currentColor" : "none"} strokeWidth={1.5} />
          </button>
          <button type="button" className="flex items-center gap-1 text-gray-700 transition-colors hover:text-blue-500 dark:text-slate-300">
            <MessageCircle size={24} strokeWidth={1.5} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleBookmark}
          className={`text-gray-700 transition-colors hover:text-yellow-500 dark:text-slate-300 ${bookmarked ? "text-yellow-500" : ""}`}
          aria-label="북마크"
        >
          <Bookmark size={24} fill={bookmarked ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-5 pt-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">좋아요 {likeCount}개</p>
        <TagChips tags={post.tags || []} className="mt-2" />
      </div>

      <div className="p-7">
        <h4 className="text-lg font-bold leading-6 text-gray-900 dark:text-slate-100">{post.title}</h4>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
          {richTextToPlainText(post.content) || "내용 미리보기가 없습니다."}
        </p>

        <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 p-3 dark:border-teal-900/60 dark:bg-teal-950/30">
          <button type="button" onClick={toggleSummary} className="flex w-full items-center gap-2 text-left">
            <Sparkles size={14} className="text-teal-600" />
            <span className="text-xs font-semibold text-teal-700">AI Summary</span>
            <span className="ml-auto text-xs text-gray-500 dark:text-slate-400">
              {showSummary
                ? (currentLang === "ko" ? "접기" : "Hide")
                : (currentLang === "ko" ? "보기" : "View")}
            </span>
          </button>
          {showSummary && (
            <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-slate-300">
              {summaryMessage}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default function FeedCard({ selectedRegion, keyword = "", onEmptyResult }) {
  // 커서 피드를 가져온 뒤 현재 지역과 헤더 검색어에 맞는 카드만 보여줍니다.
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const request = keyword.trim()
      ? getExplore({ keyword: keyword.trim(), size: 100 })
      : getFeed({ size: 100 });
    request
      .then((feed) => setPosts(getFeedItems(feed)))
      .catch((requestError) => {
        setError(getApiErrorMessage(requestError, "피드를 불러오지 못했습니다."));
      })
      .finally(() => setLoading(false));
  }, [keyword]);

  const regionName = selectedRegion?.label?.[currentLang] || selectedRegion?.label?.en || selectedRegion?.label?.ko;
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visiblePosts = posts.filter((post) => {
    const name = post.regionName || post.region?.name || "";
    if (!matchesSelectedRegion(post, selectedRegion)) return false;
    if (!normalizedKeyword) return true;
    const searchable = `${post.title || ""} ${richTextToPlainText(post.content || "")} ${name} ${post.category || ""} ${(post.tags || []).join(" ")} ${post.author?.nickname || ""}`.toLowerCase();
    return searchable.includes(normalizedKeyword);
  });
  const displayPosts = visiblePosts;

  useEffect(() => {
    // 정상 조회가 끝난 빈 피드만 탐색 화면으로 넘기고, 로딩·오류 상태에서는 이동하지 않습니다.
    if (!loading && !error && displayPosts.length === 0) {
      onEmptyResult?.();
    }
  }, [displayPosts.length, error, loading, onEmptyResult]);

  if (loading) return <div className="py-10 text-center text-gray-500 dark:text-slate-400">피드를 불러오는 중입니다.</div>;
  if (error) return <div className="py-10 text-center text-red-500">{error}</div>;
  if (displayPosts.length === 0) return null;

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-100 bg-white py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-gray-500 dark:text-slate-400">아직 등록된 글이 없습니다.</p>
        <button
          type="button"
          onClick={() => navigate("/write")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-white hover:bg-primaryHover"
        >
          <Plus size={18} />
          글쓰기
        </button>
      </div>
    );
  }

  if (displayPosts.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-100 bg-white py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
        <p className="text-gray-500 dark:text-slate-400">
          {normalizedKeyword ? "검색어가 포함된 게시물이 없습니다." : `${regionName || "선택한 지역"}의 게시물이 없습니다.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayPosts.map((post) => (
        <FeedItem key={post.id} post={post} />
      ))}
      <div className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">모든 게시물을 불러왔습니다.</div>
    </div>
  );
}
