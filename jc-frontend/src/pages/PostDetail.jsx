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
      navigate("/myposts");
    } catch (error) {
      alert(getApiErrorMessage(error, "게시글 삭제에 실패했습니다."));
    }
  };

  if (loading) return <div className="p-8">게시글을 불러오는 중입니다.</div>;
  if (!post) return <div className="p-8">게시글을 찾을 수 없습니다.</div>;

  const currentUser = getUser();
  const isAuthor = String(currentUser?.id) === String(post.author?.id);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
        <p className="text-blue-600 mb-3">📍 {post.regionName || post.region?.name || "지역 미정"}</p>
        <p className="text-gray-500 mb-6">
          작성자 {post.author?.nickname || "알 수 없음"} · {post.createdAt?.slice(0, 10) || "-"}
        </p>

        {post.coverImageUrl && (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full h-80 object-cover rounded-xl mb-6"
          />
        )}

        <div className="mb-6 whitespace-pre-wrap">{post.content}</div>
        <div className="mb-6 text-gray-500">
          조회 {post.viewCount ?? 0} · 좋아요 {post.likeCount ?? 0} · 저장 {post.bookmarkCount ?? 0}
        </div>

        {isAuthor && (
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/write/${post.id}`)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
            >
              수정
            </button>
            <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg">
              삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDetail;
