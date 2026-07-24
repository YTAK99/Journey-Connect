import { useState } from "react";
import { Bookmark, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../services/apiClient";
import { bookmarkPost, deletePost, unbookmarkPost } from "../services/postApi";

const fallbackImage = "/ex_2.jpg";

function PostCard({ post, setPosts, editable = false }) {
  const navigate = useNavigate();
  const [bookmarked, setBookmarked] = useState(Boolean(post.bookmarked));
  const image = post.coverImageUrl || post.image || fallbackImage;
  const location = post.regionName || post.region?.name || post.location || "지역 미정";

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

  const handleDelete = async (event) => {
    event.stopPropagation();
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deletePost(post.id);
      setPosts((posts) => posts.filter((item) => item.id !== post.id));
    } catch (error) {
      alert(getApiErrorMessage(error, "게시글 삭제에 실패했습니다."));
    }
  };

  return (
    <article
      onClick={() => navigate(`/post/${post.id}`)}
      className="cursor-pointer overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
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
          aria-label="북마크"
        >
          <Bookmark size={15} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="p-4">
        <h3 className="mb-2 line-clamp-2 text-lg font-semibold text-gray-900">{post.title}</h3>
        <p className="mb-3 line-clamp-2 text-sm leading-6 text-gray-600">{post.content}</p>

        <div className="flex gap-2 text-xs font-medium text-blue-600">
          {[location, post.category || "여행"].slice(0, 2).map((tag) => (
            <span key={tag}>#{String(tag).replace(/\s/g, "")}</span>
          ))}
        </div>

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
              수정
            </button>
            <button type="button" onClick={handleDelete} className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600">
              삭제
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

export default PostCard;
