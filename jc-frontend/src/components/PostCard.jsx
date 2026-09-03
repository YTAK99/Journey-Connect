import { useEffect, useState } from "react";
import { Bookmark, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { bookmarkPost, deletePost, unbookmarkPost } from "../services/postApi";
import { richTextToPlainText } from "../utils/richText";
import { getLocalizedRegionName } from "../utils/region";
import useLangStore from "../store/useLangStore";
import TagChips from "./TagChips";
import { translate } from "../i18n";
import { getUser } from "../services/auth";
import UserAvatar from "./UserAvatar";

const fallbackImage = "/ex_2.jpg";

const getStableFallbackColor = (value) => {
  const hash = String(value ?? "journey").split("").reduce(
    (result, character) => ((result * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  const hue = Math.round((hash * 137.508) % 360);
  return `hsl(${hue} 62% 72%)`;
};

function PostCard({ post, setPosts, editable = false, titleOnly = false, colorFallback = false }) {
  // 탐색 화면은 이미지와 제목만, 내 글 화면은 본문·태그와 편집 기능까지 표시합니다.
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const t = (key) => translate(currentLang, key);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [imageFailed, setImageFailed] = useState(false);
  const sourceImage = post.coverImageUrl || post.image;
  const image = sourceImage || fallbackImage;
  const showColorFallback = colorFallback && (!sourceImage || imageFailed);
  const fallbackColor = getStableFallbackColor(post.id ?? post.title);
  const location = getLocalizedRegionName(post, currentLang);

  useEffect(() => {
    const handleProfileUpdate = () => setCurrentUser(getUser());
    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
  }, []);

  const isMyPost =
    editable ||
    (post.userId != null && currentUser?.id != null && String(post.userId) === String(currentUser.id)) ||
    (post.author?.id != null && currentUser?.id != null && String(post.author.id) === String(currentUser.id)) ||
    (post.authorEmail && currentUser?.email && post.authorEmail === currentUser.email);
  const displayNickname = isMyPost
    ? currentUser?.nickname || currentUser?.name || post.author?.nickname || post.authorName
    : post.author?.nickname || post.authorName || post.nickname || t("post.traveler");
  const displayAvatar = isMyPost
    ? currentUser?.profileImageUrl || currentUser?.image || post.author?.profileImageUrl || post.authorImage
    : post.author?.profileImageUrl || post.authorImage || post.profileImageUrl;

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

  const handleDelete = async (event) => {
    event.stopPropagation();
    if (!window.confirm(t("post.deleteConfirm"))) return;

    try {
      await deletePost(post.id);
      setPosts((posts) => posts.filter((item) => item.id !== post.id));
    } catch (error) {
      alert(getApiErrorMessage(error, t("post.deleteFailed")));
    }
  };

  return (
    <article
      onClick={() => navigate(`/post/${post.id}`)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative">
        {showColorFallback
          ? <div className="h-60 w-full" style={{ backgroundColor: fallbackColor }} aria-hidden="true" />
          : <img src={image} alt={post.title} onError={() => setImageFailed(true)} className="h-60 w-full object-cover" />}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs text-white">
          <MapPin size={12} />
          {location}
        </span>
        <button
          type="button"
          onClick={toggleBookmark}
          className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 ${
            bookmarked ? "text-yellow-500" : "text-gray-700"
          }`}
          aria-label={t("post.bookmark")}
        >
          <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4">
        {!titleOnly && (
          <div className="mb-3 flex items-center gap-2">
            <UserAvatar
              src={displayAvatar}
              className="h-7 w-7 rounded-full border border-gray-100 object-cover dark:border-slate-700"
              iconClassName="h-3.5 w-3.5"
            />
            <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{displayNickname}</span>
          </div>
        )}
        <h3 className={`${titleOnly ? "truncate" : "mb-2 line-clamp-2"} text-lg font-semibold text-gray-900 dark:text-slate-100`}>{post.title}</h3>
        {!titleOnly && <p className="mb-3 line-clamp-2 text-sm leading-6 text-gray-600 dark:text-slate-300">{richTextToPlainText(post.content)}</p>}
        {!titleOnly && <TagChips tags={post.tags || []} />}

        {editable && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(`/write/${post.id}`);
              }}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm text-white hover:bg-primaryHover"
            >
              {t("post.edit")}
            </button>
            <button type="button" onClick={handleDelete} className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600">
              {t("post.delete")}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default PostCard;
