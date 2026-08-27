import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import PostCard from "../components/PostCard";
import apiClient, { getApiErrorMessage, unwrapApiResponse } from "../services/apiClient";
import { isLogin } from "../services/auth";
import { getFeedItems } from "../services/postApi";
import useTranslation from "../i18n/useTranslation";

function MyPosts() {
  // 현재 사용자 id로 공개 게시물을 조회하고, 카드에 작성자용 편집 기능을 활성화합니다.
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLogin()) {
      alert(t("myPosts.loginRequired"));
      navigate("/login", { replace: true });
      return;
    }

    apiClient
      .get("/users/me/posts", { params: { size: 100 } })
      .then((response) => setPosts(getFeedItems(unwrapApiResponse(response))))
      .catch((error) => {
        alert(getApiErrorMessage(error, t("myPosts.loadFailed")));
      })
      .finally(() => setLoading(false));
  }, [navigate, t]);

  if (loading) {
    return <div className="p-8 pt-28">{t("myPosts.loading")}</div>;
  }

  return (
    <main className="min-h-screen bg-background p-8 pt-28">
      <section className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-title">{t("myPosts.title")}</h1>
            <p className="text-gray-500">{t("myPosts.count", { count: posts.length })}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/write")}
            className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700"
          >
            {t("post.write")}
          </button>
        </div>

        {posts.length === 0 ? (
          <p className="rounded-lg border border-gray-100 bg-white p-8 text-center text-gray-500">
            {t("myPosts.empty")}
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
