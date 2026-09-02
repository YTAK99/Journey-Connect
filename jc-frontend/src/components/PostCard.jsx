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

const fallbackImage = "/ex_2.jpg";
const fallbackAvatar = "/user_1.jpg";

function PostCard({ post, setPosts, editable = false, titleOnly = false }) {
  // 탐색 화면은 이미지와 제목만, 내 글 화면은 본문·태그와 편집 기능까지 표시합니다.
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const t = (key) => translate(currentLang, key);
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const image = post.coverImageUrl || post.image || fallbackImage;
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
    : post.author?.profileImageUrl || post.authorImage || post.profileImageUrl || fallbackAvatar;

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
        <img src={image} alt={post.title} className="h-60 w-full object-cover" />
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
        <div className="mb-3 flex items-center gap-2">
          <img
            src={displayAvatar || fallbackAvatar}
            alt=""
            className="h-7 w-7 rounded-full border border-gray-100 object-cover dark:border-slate-700"
            onError={(event) => { event.currentTarget.src = fallbackAvatar; }}
          />
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">{displayNickname}</span>
        </div>
        <h3 className={`${titleOnly ? "" : "mb-2"} line-clamp-2 text-lg font-semibold text-gray-900 dark:text-slate-100`}>{post.title}</h3>
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
