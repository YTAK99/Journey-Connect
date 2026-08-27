import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { bookmarkPost, getExplore, getFeed, getFeedItems, getPost, getPostAnalysis, likePost, unbookmarkPost, unlikePost } from "../services/postApi";
import { richTextToPlainText } from "../utils/richText";
import { getLocalizedRegionName, matchesSelectedRegion } from "../utils/region";
import { parseApiDate } from "../utils/dateTime";
import TagChips from "./TagChips";
import { translate } from "../i18n";
import useTranslation from "../i18n/useTranslation";
import CommentSection from "./CommentSection";
import PostRouteMap from "./PostRouteMap";

const fallbackImage = "/ex_1.jpg";
const fallbackAvatar = "/user_1.jpg";

const getRelativeDate = (createdAt, language) => {
  const t = (key, variables) => translate(language, key, variables);
  if (!createdAt) return t("feed.justNow");
  const date = parseApiDate(createdAt);
  if (Number.isNaN(date.getTime())) return String(createdAt).slice(0, 10);

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return t("feed.minutesAgo", { count: minutes });

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("feed.hoursAgo", { count: hours });

  const days = Math.floor(hours / 24);
  if (days < 30) return t("feed.daysAgo", { count: days });

  const months = Math.floor(days / 30);
  if (months < 12) return t("feed.monthsAgo", { count: months });

  return t("feed.yearsAgo", { count: Math.floor(months / 12) });
};

function FeedItem({ post }) {
  // 피드 카드에 목록 응답과 상세 응답을 합쳐 다중 이미지와 여행 루트까지 함께 표시합니다.
  const navigate = useNavigate();
  const { currentLang, t } = useTranslation();
  const [detailedPost, setDetailedPost] = useState(post);
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [showSummary, setShowSummary] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  useEffect(() => {
    let active = true;
    getPost(post.id)
      .then((detail) => {
        if (!active || !detail) return;
        // 목록 응답의 반응 상태를 보존하면서 상세 장소·이미지 데이터를 보강합니다.
        setDetailedPost((current) => ({ ...current, ...detail }));
      })
      .catch(() => {
        // 상세 보강에 실패해도 목록 카드 자체는 계속 사용할 수 있게 유지합니다.
      });
    return () => { active = false; };
  }, [post.id]);

  const location = getLocalizedRegionName(detailedPost, currentLang);
  const rawImages = detailedPost.images?.length
    ? detailedPost.images
    : detailedPost.coverImageUrl
      ? [detailedPost.coverImageUrl]
      : detailedPost.image
        ? [detailedPost.image]
        : [];
  const images = rawImages
    .map((image) => typeof image === "string" ? image : image?.imageUrl || image?.url)
    .filter(Boolean);
  const summary =
    analysis?.status === "succeeded"
      ? analysis.result?.summary?.trim() || ""
      : "";
  const summaryMessage = analysisLoading
    ? t("analysis.loading")
    : analysisError
      ? analysisError
      : summary
        ? summary
        : analysis?.status === "queued" || analysis?.status === "running"
          ? t("analysis.preparing")
          : analysis?.status === "failed" || analysis?.status === "quarantined"
            ? t("analysis.unavailable")
            : t("analysis.notGenerated");

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
      alert(getApiErrorMessage(error, t("post.likeFailed")));
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
      alert(getApiErrorMessage(error, t("post.bookmarkFailed")));
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
        t("analysis.loadFailed"),
      ));
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <article className="mx-auto w-full max-w-4xl overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={detailedPost.author?.profileImageUrl || fallbackAvatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <h3 className="text-base font-semibold leading-5 text-gray-900 dark:text-slate-100">
                {detailedPost.author?.nickname || t("post.traveler")}
              </h3>
              <p className="text-sm leading-5 text-gray-500 dark:text-slate-400">
                {location} · {getRelativeDate(detailedPost.createdAt, currentLang)}
              </p>
            </div>
          </div>
          <button type="button" className="text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100" aria-label={t("post.more")}>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* 최대 네 장을 같은 비율로 보여주고, 나머지는 마지막 이미지 위에 개수로 표시합니다. */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 px-6 pt-5 sm:grid-cols-4">
          {images.slice(0, 4).map((imageUrl, index) => (
            <button key={`${imageUrl}-${index}`} type="button" className="relative h-40 overflow-hidden rounded-lg" onClick={() => navigate(`/post/${detailedPost.id}`)}>
              <img src={imageUrl || fallbackImage} alt={t("feed.imageAlt", { index: index + 1 })} className="h-full w-full object-cover transition hover:scale-105" />
              {index === 3 && images.length > 4 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">+{images.length - 4}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 상세 응답의 방문 장소를 기존 루트 지도 카드로 재사용합니다. */}
      <div className="px-7"><PostRouteMap places={detailedPost.places || []} lang={currentLang} /></div>

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
          <button type="button" onClick={() => setIsCommentOpen((open) => !open)} className="flex items-center gap-1 text-gray-700 transition-colors hover:text-blue-500 dark:text-slate-300" aria-label={t("comments.toggle")}>
            <MessageCircle size={24} strokeWidth={1.5} />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleBookmark}
          className={`text-gray-700 transition-colors hover:text-yellow-500 dark:text-slate-300 ${bookmarked ? "text-yellow-500" : ""}`}
          aria-label={t("post.bookmark")}
        >
          <Bookmark size={24} fill={bookmarked ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-5 pt-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t("post.likes", { count: likeCount })}</p>
        <TagChips tags={detailedPost.tags || []} className="mt-2" />
      </div>

      <div className="p-7">
        <h4 className="text-lg font-bold leading-6 text-gray-900 dark:text-slate-100">{detailedPost.title}</h4>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
          {richTextToPlainText(detailedPost.content) || t("post.noPreview")}
        </p>

        <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 p-3 dark:border-teal-900/60 dark:bg-teal-950/30">
          <button type="button" onClick={toggleSummary} className="flex w-full items-center gap-2 text-left">
            <Sparkles size={14} className="text-teal-600" />
            <span className="text-xs font-semibold text-teal-700">AI Summary</span>
            <span className="ml-auto text-xs text-gray-500 dark:text-slate-400">
              {showSummary ? t("analysis.hide") : t("analysis.show")}
            </span>
          </button>
          {showSummary && (
            <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-slate-300">
              {summaryMessage}
            </p>
          )}
        </div>
      </div>
      {/* 댓글 UI는 연수 브랜치의 컴포넌트를 유지하고 게시글 식별자를 함께 전달합니다. */}
      {isCommentOpen && <div className="px-5 pb-5"><CommentSection postId={detailedPost.id} /></div>}
    </article>
  );
}

export default function FeedCard({ selectedRegion, keyword = "", onEmptyResult }) {
  // 커서 피드를 가져온 뒤 현재 지역과 헤더 검색어에 맞는 카드만 보여줍니다.
  const navigate = useNavigate();
  const { currentLang, t } = useTranslation();
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
        setError(getApiErrorMessage(requestError, t("feed.loadFailed")));
      })
      .finally(() => setLoading(false));
  }, [keyword, t]);

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

  if (loading) return <div className="py-10 text-center text-gray-500 dark:text-slate-400">{t("feed.loading")}</div>;
  if (error) return <div className="py-10 text-center text-red-500">{error}</div>;
  if (displayPosts.length === 0) return null;

  if (posts.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-100 bg-white py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-4 text-gray-500 dark:text-slate-400">{t("feed.empty")}</p>
        <button
          type="button"
          onClick={() => navigate("/write")}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-white hover:bg-primaryHover"
        >
          <Plus size={18} />
          {t("post.write")}
        </button>
      </div>
    );
  }

  if (displayPosts.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-gray-100 bg-white py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
        <p className="text-gray-500 dark:text-slate-400">
          {normalizedKeyword
            ? t("feed.noSearchResults")
            : t("feed.noRegionResults", { region: regionName || t("feed.selectedRegion") })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {displayPosts.map((post) => (
        <FeedItem key={post.id} post={post} />
      ))}
      <div className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">{t("feed.end")}</div>
    </div>
  );
}
