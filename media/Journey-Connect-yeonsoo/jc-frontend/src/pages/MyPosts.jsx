import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PostCard from "../components/PostCard";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser, isLogin } from "../services/auth";
import { getFeed, getFeedItems } from "../services/postApi";

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

    const user = getUser();

    getFeed({ size: 100 })
      .then((feed) => {
        const myPosts = getFeedItems(feed).filter(
          (post) => String(post.author?.id) === String(user?.id),
        );
        setPosts(myPosts);
      })
      .catch((error) => {
        alert(getApiErrorMessage(error, "게시글 목록을 불러오지 못했습니다."));
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="p-8">게시글을 불러오는 중입니다.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold">내가 작성한 글</h1>
      <p className="text-gray-500 mb-8">총 {posts.length}개의 게시글</p>

      {posts.length === 0 ? (
        <p>작성한 글이 없습니다.</p>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} setPosts={setPosts} />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyPosts;
