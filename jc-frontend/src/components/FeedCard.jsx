import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Plus, Send, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../services/apiClient";
import { bookmarkPost, getFeed, getFeedItems, likePost, unbookmarkPost, unlikePost } from "../services/postApi";

const fallbackImage = "/ex_1.jpg";
const fallbackAvatar = "/user_1.jpg";

const inferCategory = (post) => {
  const text = `${post.title || ""} ${post.content || ""}`.toLowerCase();
  if (text.includes("카페") || text.includes("coffee")) return "카페";
  if (text.includes("맛집") || text.includes("식당")) return "맛집";
  if (text.includes("숙소") || text.includes("호텔")) return "숙소";
  if (text.includes("액티비티")) return "액티비티";
  return "여행";
};

const getRelativeDate = (createdAt) => {
  if (!createdAt) return "방금 전";
  const date = new Date(createdAt);
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
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [showSummary, setShowSummary] = useState(false);
  const location = post.regionName || post.region?.name || post.location || "지역 미정";
  const category = post.category || inferCategory(post);
  const summary =
    post.aiSummary ||
    post.summary ||
    `${location} 여행 글입니다. 주요 분위기와 방문 포인트를 본문에서 확인해보세요.`;

  const toggleLike = async (event) => {
    event.stopPropagation();
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
          <button type="button" className="text-gray-700 transition-colors hover:text-teal-600 dark:text-slate-300">
            <Send size={23} strokeWidth={1.5} />
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
        <div className="mt-2 flex gap-2 text-xs font-medium text-blue-600">
          {[location, category].map((tag) => (
            <span key={tag}>#{String(tag).replace(/\s/g, "")}</span>
          ))}
        </div>
      </div>

      <div className="p-7">
        <h4 className="text-lg font-bold leading-6 text-gray-900 dark:text-slate-100">{post.title}</h4>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
          {post.content || "내용 미리보기가 없습니다."}
        </p>

        <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 p-3 dark:border-teal-900/60 dark:bg-teal-950/30">
          <button type="button" onClick={() => setShowSummary((open) => !open)} className="flex w-full items-center gap-2 text-left">
            <Sparkles size={14} className="text-teal-600" />
            <span className="text-xs font-semibold text-teal-700">AI Summary</span>
            <span className="ml-auto text-xs text-gray-500 dark:text-slate-400">{showSummary ? "접기" : "보기"}</span>
          </button>
          {showSummary && <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-slate-300">{summary}</p>}
        </div>
      </div>
    </article>
  );
}

export default function FeedCard({ selectedRegion }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getFeed({ size: 20 })
      .then((feed) => setPosts(getFeedItems(feed)))
      .catch((requestError) => {
        setError(getApiErrorMessage(requestError, "피드를 불러오지 못했습니다."));
      })
      .finally(() => setLoading(false));
  }, []);

  const regionName = selectedRegion?.label?.ko;
  const visiblePosts = posts.filter((post) => {
    if (!regionName) return true;
    const name = post.regionName || post.region?.name || "";
    return !name || name.includes(regionName);
  });
  const displayPosts = visiblePosts.length > 0 ? visiblePosts : posts;

  if (loading) return <div className="py-10 text-center text-gray-500 dark:text-slate-400">피드를 불러오는 중입니다.</div>;
  if (error) return <div className="py-10 text-center text-red-500">{error}</div>;

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

  return (
    <div className="space-y-6">
      {displayPosts.map((post) => (
        <FeedItem key={post.id} post={post} />
      ))}
      <div className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">모든 게시물을 불러왔습니다.</div>
    </div>
  );
}
