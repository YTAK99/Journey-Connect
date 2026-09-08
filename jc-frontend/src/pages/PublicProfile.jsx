import { ArrowLeft, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import PostCard from "../components/PostCard";
import UserAvatar from "../components/UserAvatar";
import useTranslation from "../i18n/useTranslation";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser } from "../services/auth";
import { getFeedItems } from "../services/postApi";
import { getPublicUserPosts, getPublicUserProfile } from "../services/userApi";

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const currentUser = getUser();
    if (currentUser?.id != null && String(currentUser.id) === String(userId)) {
      navigate("/mypage", { replace: true });
      return undefined;
    }

    let active = true;
    Promise.resolve()
      .then(() => Promise.all([
        getPublicUserProfile(userId),
        getPublicUserPosts(userId, { size: 100 }),
      ]))
      .then(([profileResponse, postsResponse]) => {
        if (!active) return;
        setProfile(profileResponse);
        setPosts(getFeedItems(postsResponse));
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, t("publicProfile.loadFailed")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate, t, userId]);

  if (loading) {
    return <main className="min-h-screen bg-background px-4 pb-16 pt-28 text-center text-sm text-muted">{t("publicProfile.loading")}</main>;
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background px-4 pb-16 pt-28">
        <section className="mx-auto max-w-5xl rounded-3xl border border-rose-200 bg-rose-50 px-6 py-14 text-center text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          <p>{error || t("publicProfile.notFound")}</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-5 rounded-full border border-rose-200 px-5 py-2 font-semibold transition hover:bg-rose-100 dark:border-rose-900 dark:hover:bg-rose-950">{t("common.back")}</button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 pb-16 pt-24 text-foreground sm:px-6 sm:pt-28">
      <section className="mx-auto max-w-5xl">
        <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-muted transition hover:text-primary">
          <ArrowLeft size={17} />
          {t("common.back")}
        </button>

        <header className="mb-8 flex flex-col items-center rounded-3xl border border-border bg-card px-6 py-9 text-center shadow-sm sm:py-11">
          <UserAvatar src={profile.profileImageUrl} alt={profile.nickname} className="h-24 w-24 rounded-full border-4 border-secondary object-cover shadow-md sm:h-28 sm:w-28" iconClassName="h-12 w-12" />
          <h1 className="mt-4 text-2xl font-extrabold text-foreground sm:text-3xl">{profile.nickname || t("post.traveler")}</h1>
        </header>

        <div className="mb-5 flex items-center gap-2">
          <FileText size={19} className="text-primary" />
          <h2 className="text-lg font-bold text-foreground">{t("publicProfile.posts")}</h2>
          <span className="text-sm text-muted">{t("publicProfile.postCount", { count: posts.length })}</span>
        </div>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 px-6 py-16 text-center text-sm text-muted">{t("publicProfile.empty")}</div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </main>
  );
}
