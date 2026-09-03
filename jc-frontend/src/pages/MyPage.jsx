import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Camera,
  Edit3,
  FileText,
  Heart,
  MessageCircle,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import apiClient, { getApiErrorMessage, unwrapApiResponse } from "../services/apiClient";
import { getUser, isLogin } from "../services/auth";
import { getFeedItems, uploadPostImages } from "../services/postApi";
import useLangStore from "../store/useLangStore";
import { getMessages } from "../i18n";
import UserAvatar from "../components/UserAvatar";

const fallbackPostImage = "/ex_1.jpg";
const profileImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxProfileImageSize = 5 * 1024 * 1024;

function PostTile({ post }) {
  const navigate = useNavigate();
  const image = post.coverImageUrl || post.image || fallbackPostImage;

  return (
    <button
      type="button"
      onClick={() => navigate(`/post/${post.id}`)}
      className="group overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      <div className="aspect-[16/10] overflow-hidden bg-secondary">
        <img
          src={image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={(event) => {
            event.currentTarget.src = fallbackPostImage;
          }}
        />
      </div>
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground">{post.title}</h3>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Heart size={13} /> {post.likeCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle size={13} /> {post.commentCount ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyState({ icon: Icon, message, actionLabel, onAction }) {
  return (
    <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon size={22} />
      </span>
      <p className="text-sm text-muted">{message}</p>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover"
        >
          <Plus size={15} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

function ProfileEditor({ user, labels, onClose, onSave }) {
  const [name, setName] = useState(user.nickname || "");
  const [imagePreview, setImagePreview] = useState(user.profileImageUrl || "");
  const [imageFile, setImageFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => () => {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!profileImageTypes.has(file.type) || file.size > maxProfileImageSize) {
      alert(labels.imageInvalid);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 id="profile-editor-title" className="text-xl font-bold text-foreground">{labels.editProfile}</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-secondary" aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center">
          <label htmlFor="profile-image" className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border-4 border-secondary bg-secondary">
            <UserAvatar src={imagePreview} className="h-full w-full object-cover" iconClassName="h-14 w-14" />
            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/40 group-hover:opacity-100">
              <Camera size={25} />
            </span>
          </label>
          <input id="profile-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleImage} />
          <p className="mt-3 text-center text-xs text-muted">{labels.editHint}</p>
        </div>

        <label htmlFor="profile-name" className="text-sm font-semibold text-foreground">{labels.nickname}</label>
        <input
          id="profile-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mb-4 mt-2 w-full rounded-xl border border-border bg-inputBg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <label htmlFor="profile-email" className="text-sm font-semibold text-foreground">{labels.email}</label>
        <input id="profile-email" value={user.email} readOnly className="mt-2 w-full cursor-not-allowed rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted" />

        <label htmlFor="profile-current-password" className="mt-4 block text-sm font-semibold text-foreground">{labels.currentPassword}</label>
        <input
          id="profile-current-password"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder={labels.currentPasswordPlaceholder}
          className="mt-2 w-full rounded-xl border border-border bg-inputBg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <label htmlFor="profile-new-password" className="mt-4 block text-sm font-semibold text-foreground">{labels.newPassword}</label>
        <input
          id="profile-new-password"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder={labels.newPasswordPlaceholder}
          className="mt-2 w-full rounded-xl border border-border bg-inputBg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <p className="mt-2 text-xs text-muted">{labels.passwordOptional}</p>

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted hover:bg-secondary">
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={() => onSave({
              nickname: name.trim(),
              imageFile,
              currentPassword,
              newPassword,
            })}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            {labels.save}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const labels = getMessages(currentLang, "myPage");
  const loginUser = getUser();
  const [activeTab, setActiveTab] = useState(0);
  const [posts, setPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [user, setUser] = useState({
    ...loginUser,
    nickname: loginUser?.nickname || loginUser?.email || labels.traveler,
    email: loginUser?.email || "",
  });

  useEffect(() => {
    if (!isLogin()) {
      navigate("/login", { replace: true });
      return undefined;
    }

    let active = true;
    const loadProfileContent = () => {
      Promise.all([
        apiClient.get("/users/me/posts", { params: { size: 100 } }),
        apiClient.get("/users/me/bookmarks", { params: { size: 100 } }),
        apiClient.get("/users/me/likes", { params: { size: 100 } }),
      ])
        .then(([postResponse, bookmarkResponse, likeResponse]) => {
          if (!active) return;
          setPosts(getFeedItems(unwrapApiResponse(postResponse)));
          setBookmarks(getFeedItems(unwrapApiResponse(bookmarkResponse)));
          setLikedPosts(getFeedItems(unwrapApiResponse(likeResponse)));
        })
        .catch((requestError) => {
          if (active) setError(getApiErrorMessage(requestError, labels.loadError));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };

    loadProfileContent();
    window.addEventListener("likeChanged", loadProfileContent);

    return () => {
      active = false;
      window.removeEventListener("likeChanged", loadProfileContent);
    };
  }, [labels.loadError, navigate]);

  const stats = useMemo(
    () => ({
      posts: posts.length,
      likes: posts.reduce((total, post) => total + (post.likeCount ?? 0), 0),
      comments: posts.reduce((total, post) => total + (post.commentCount ?? 0), 0),
    }),
    [posts],
  );

  const renderContent = () => {
    if (loading) return <div className="col-span-full py-24 text-center text-sm text-muted">{labels.loading}</div>;
    if (error) return <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30">{error}</div>;

    if (activeTab === 0) {
      if (!posts.length) return <EmptyState icon={FileText} message={labels.emptyPosts} actionLabel={labels.write} onAction={() => navigate("/write")} />;
      return posts.map((post) => <PostTile key={post.id} post={post} />);
    }
    if (activeTab === 1) {
      if (!likedPosts.length) return <EmptyState icon={Heart} message={labels.unavailableLikes} />;
      return likedPosts.map((post) => <PostTile key={post.id} post={post} />);
    }
    if (activeTab === 2) {
      if (!bookmarks.length) return <EmptyState icon={Bookmark} message={labels.emptyBookmarks} />;
      return bookmarks.map((post) => <PostTile key={post.id} post={post} />);
    }
    return <EmptyState icon={Users} message={labels.unavailableCrew} />;
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-14 pt-24 text-foreground sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary">
          <ArrowLeft size={16} /> {labels.back}
        </button>

        <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <UserAvatar
                  src={user.profileImageUrl}
                  className="h-20 w-20 rounded-full border-4 border-secondary object-cover sm:h-24 sm:w-24"
                  iconClassName="h-10 w-10 sm:h-12 sm:w-12"
                />
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow ring-2 ring-card"
                  aria-label={labels.editProfile}
                >
                  <Edit3 size={12} />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-bold sm:text-xl">{user.nickname}</h1>
                <p className="truncate text-sm text-muted">{user.email}</p>
                <dl className="mt-4 flex gap-5 sm:gap-7">
                  {[
                    [stats.posts, labels.posts],
                    [stats.likes, labels.likes],
                    [stats.comments, labels.comments],
                  ].map(([value, label]) => (
                    <div key={label} className="text-center">
                      <dt className="text-xs text-muted">{label}</dt>
                      <dd className="text-sm font-bold text-foreground sm:text-base">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="self-start rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:bg-secondary hover:text-primary"
            >
              {labels.editProfile}
            </button>
          </div>
        </section>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1 sm:grid-cols-4" role="tablist" aria-label="Profile content">
          {labels.tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === index}
              onClick={() => setActiveTab(index)}
              className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                activeTab === index ? "bg-card text-primary shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">{renderContent()}</section>
      </div>

      {editOpen && (
        <ProfileEditor
          user={user}
          labels={labels}
          onClose={() => setEditOpen(false)}
          onSave={async (nextUser) => {
            if (nextUser.newPassword && (!nextUser.currentPassword || nextUser.newPassword.length < 8)) {
              alert(labels.passwordInvalid);
              return;
            }

            try {
              if (nextUser.newPassword) {
                await apiClient.patch("/users/me/password", {
                  currentPassword: nextUser.currentPassword,
                  newPassword: nextUser.newPassword,
                });
              }

              let profileImageUrl = user.profileImageUrl || null;
              if (nextUser.imageFile) {
                const uploadedImages = await uploadPostImages([nextUser.imageFile]);
                profileImageUrl = uploadedImages?.[0]?.imageUrl || null;
                if (!profileImageUrl) throw new Error(labels.saveFailed);
              }
              const response = await apiClient.patch("/users/me", {
                nickname: nextUser.nickname,
                bio: loginUser?.bio || null,
                profileImageUrl,
              });
              const savedUser = unwrapApiResponse(response);

              const updatedAuthUser = {
                ...loginUser,
                ...savedUser,
              };
              setUser(updatedAuthUser);
              localStorage.removeItem("myProfile");
              localStorage.setItem("loginUser", JSON.stringify(updatedAuthUser));
              window.dispatchEvent(new CustomEvent("userProfileUpdated", { detail: updatedAuthUser }));
              setEditOpen(false);
            } catch (saveError) {
              const errorCode = saveError.response?.data?.code;
              alert(errorCode === "NICKNAME_ALREADY_USED"
                ? labels.nicknameAlreadyUsed
                : getApiErrorMessage(saveError, labels.saveFailed));
            }
          }}
        />
      )}
    </main>
  );
}
