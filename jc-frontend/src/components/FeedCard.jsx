import { useEffect, useState } from "react";
import { Bookmark, Globe2, Heart, MapPin, MessageCircle, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router";
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

// 작성 시간을 "3분 전", "2일 전" 같은 형태로 바꿔주는 함수
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

// 피드에 게시물 하나를 보여주는 컴포넌트
function FeedItem({ post }) {
  const navigate = useNavigate();
  const { currentLang, t } = useTranslation();
  // 기존 post 데이터를 유지하면서 상세 데이터를 덮어쓰도록 설정
  const [detailedPost, setDetailedPost] = useState(post);
  // 댓글 영역 열기/닫기 상태
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  // 좋아요 / 북마크 상태
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  // AI 요약 관련 상태
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

  // 현재 언어에 맞는 게시물 지역명
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
  // AI 분석이 완료된 경우 요약 내용 꺼내기
  const summary =
    analysis?.status === "succeeded"
      ? analysis.result?.summary?.trim() || ""
      : "";
  // AI 분석 상태에 따라 사용자에게 보여줄 문구 결정
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

  // 좋아요 버튼
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

  // 북마크 버튼
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

  // AI 요약 열기/닫기
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
      {/* 작성자 / 지역 / 작성 시간 */}
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

      {/* 게시물 이미지 안전 추출 및 표시 영역 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 px-6 pt-5 sm:grid-cols-4">
          {images.slice(0, 4).map((imageUrl, index) => (
            <button key={`${imageUrl}-${index}`} type="button" className="relative h-40 overflow-hidden rounded-lg" onClick={() => navigate(`/post/${detailedPost.id}`)}>
              <img src={imageUrl || fallbackImage} alt={t("feed.imageAlt", { index: index + 1 })} className="h-full w-full object-cover transition hover:scale-105" />
              {/* 사진이 4장보다 많으면 남은 개수 표시 */}
              {index === 3 && images.length > 4 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-bold text-white">+{images.length - 4}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 여행 루트 이미지 (좌우 여백 px-5 적용) */}
      <div className="px-7"><PostRouteMap places={detailedPost.places || []} lang={currentLang} /></div>

      {/* 좋아요 / 댓글 / 북마크 버튼 */}
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

      {/* 좋아요 개수 / 태그 */}
      <div className="px-5 pt-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{t("post.likes", { count: likeCount })}</p>
        <TagChips tags={detailedPost.tags || []} className="mt-2" />
      </div>

      {/* 제목 / 본문 미리보기 / AI 요약 */}
      <div className="p-7">
        <Link
          to={`/post/${detailedPost.id}`}
          className="group block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 dark:focus-visible:ring-offset-slate-900"
        >
          <h4 className="text-lg font-bold leading-6 text-gray-900 transition-colors group-hover:text-primary dark:text-slate-100">
            {detailedPost.title}
          </h4>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
            {richTextToPlainText(detailedPost.content) || t("post.noPreview")}
          </p>
        </Link>

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
      {/* 댓글 영역 */}
      {isCommentOpen && <div className="px-5 pb-5"><CommentSection postId={detailedPost.id} /></div>}
    </article>
  );
}

// 피드 전체를 불러오는 상위 컴포넌트
export default function FeedCard({ selectedRegion, keyword = "", onChangeRegion }) {
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

  if (loading) return <div className="py-10 text-center text-gray-500 dark:text-slate-400">{t("feed.loading")}</div>;
  if (error) return <div className="py-10 text-center text-red-500">{error}</div>;

  if (displayPosts.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          {normalizedKeyword
            ? t("feed.noSearchResults", { keyword })
            : t("feed.noRegionResults", { region: regionName || t("feed.selectedRegion") })}
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-slate-400">{t("feed.emptyHelp")}</p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={onChangeRegion} className="inline-flex items-center justify-center gap-2 rounded-full border border-primary bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/30">
            <MapPin size={17} /> {t("feed.changeRegion")}
          </button>
          <button type="button" onClick={() => navigate("/explore")} className="inline-flex items-center justify-center gap-2 rounded-full border border-primary bg-white px-5 py-3 text-sm font-semibold text-primary hover:bg-teal-50 dark:bg-slate-900 dark:hover:bg-teal-950/30">
            <Globe2 size={17} /> {t("feed.exploreWorld")}
          </button>
          <button type="button" onClick={() => navigate("/write")} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primaryHover">
            <Plus size={17} /> {t("feed.writeFirst")}
          </button>
        </div>
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
