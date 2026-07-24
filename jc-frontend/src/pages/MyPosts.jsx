import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import apiClient, { getApiErrorMessage, unwrapApiResponse } from "../services/apiClient";
import { isLogin } from "../services/auth";
import { getFeedItems } from "../services/postApi";

function MyPosts() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLogin()) {
      alert("로그인이 필요합니다.");
      navigate("/login", { replace: true });
      return;
    }

    apiClient
      .get("/users/me/posts", { params: { size: 100 } })
      .then((response) => setPosts(getFeedItems(unwrapApiResponse(response))))
      .catch((error) => {
        alert(getApiErrorMessage(error, "내 글 목록을 불러오지 못했습니다."));
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="p-8 pt-28">게시글을 불러오는 중입니다.</div>;
  }

  return (
    <main className="min-h-screen bg-background p-8 pt-28">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-title">내가 작성한 글</h1>
            <p className="text-gray-500">총 {posts.length}개의 게시글</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/write")}
            className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
          >
            글쓰기
          </button>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-lg border border-gray-100 bg-white p-8 text-center text-gray-500">
            작성한 글이 없습니다.
          </p>
        ) : (
          <div className="space-y-5">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} setPosts={setPosts} editable />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default MyPosts;
