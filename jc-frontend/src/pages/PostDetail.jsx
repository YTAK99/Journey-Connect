import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser } from "../services/auth";
import { deletePost, getPost } from "../services/postApi";

function PostDetail() {
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

  return (
    <main className="min-h-screen bg-background p-8 pt-28">
      <article className="mx-auto max-w-3xl rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-4 text-3xl font-bold text-title">{post.title}</h1>
        <p className="mb-3 text-blue-600">{location}</p>
        <p className="mb-6 text-gray-500">
          작성자 {post.author?.nickname || "알 수 없음"} · {post.createdAt?.slice(0, 10) || "-"}
        </p>

        {post.coverImageUrl && (
          <img src={post.coverImageUrl} alt={post.title} className="mb-6 h-80 w-full rounded-lg object-cover" />
        )}

        <div className="mb-6 whitespace-pre-wrap leading-7">{post.content}</div>
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
