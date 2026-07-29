import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser } from "../services/auth";
import { deletePost, getPost } from "../services/postApi";
import { normalizeEditorContent } from "../utils/richText";
import TagChips from "../components/TagChips";

function PostDetail() {
  // 경로의 게시물 id로 상세를 조회하고 작성자에게만 수정·삭제 진입점을 제공합니다.
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPost(id)
      .then(setPost)
      .catch((error) => {
        alert(getApiErrorMessage(error, "게시글을 불러오지 못했습니다."));
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deletePost(id);
      alert("삭제되었습니다.");
      navigate("/my-posts");
    } catch (error) {
      alert(getApiErrorMessage(error, "게시글 삭제에 실패했습니다."));
    }
  };

  if (loading) return <div className="p-8 pt-28">게시글을 불러오는 중입니다.</div>;
  if (!post) return <div className="p-8 pt-28">게시글을 찾을 수 없습니다.</div>;

  const currentUser = getUser();
  const isAuthor = String(currentUser?.id) === String(post.author?.id);
  const location = post.regionName || post.region?.name || "지역 미정";
  const galleryImages = (post.images || []).filter((image) => image.imageUrl !== post.coverImageUrl);

  return (
    <main className="min-h-screen bg-background px-4 pb-12 pt-28 sm:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-9 dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-4 text-3xl font-bold text-title">{post.title}</h1>
        <p className="mb-3 text-blue-600">{location}</p>
        <p className="mb-6 text-gray-500">
          작성자 {post.author?.nickname || "알 수 없음"} · {post.createdAt?.slice(0, 10) || "-"}
        </p>

        {post.coverImageUrl && (
          <img src={post.coverImageUrl} alt={post.title} className="mb-4 h-80 w-full rounded-2xl object-cover" />
        )}

        {galleryImages.length > 0 && (
          <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {galleryImages.map((image) => (
              <img key={image.id || image.imageUrl} src={image.imageUrl} alt={image.altText || post.title} className="h-36 w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        {(post.travelStartDate || post.travelEndDate) && (
          <div className="mb-7 inline-flex rounded-full bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 dark:bg-teal-950/40 dark:text-teal-200">
            여행 기간&nbsp; {post.travelStartDate || "미정"} ~ {post.travelEndDate || "미정"}
          </div>
        )}

        <TagChips tags={post.tags || []} className="mb-7" />

        <div
          className="rich-text-content mb-8 leading-7 text-slate-700 dark:text-slate-200"
          dangerouslySetInnerHTML={{ __html: normalizeEditorContent(post.content || "") }}
        />
        <div className="mb-6 text-gray-500">
          조회 {post.viewCount ?? 0} · 좋아요 {post.likeCount ?? 0} · 북마크 {post.bookmarkCount ?? 0}
        </div>

        {isAuthor && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/write/${post.id}`)}
              className="rounded-lg bg-blue-500 px-4 py-2 text-white"
            >
              수정
            </button>
            <button type="button" onClick={handleDelete} className="rounded-lg bg-red-500 px-4 py-2 text-white">
              삭제
            </button>
          </div>
        )}
      </article>
    </main>
  );
}

export default PostDetail;
