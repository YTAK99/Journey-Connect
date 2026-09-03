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

import apiClient, {
  getApiErrorMessage,
  unwrapApiResponse,
} from "../services/apiClient";

import { getUser, isLogin } from "../services/auth";

import {
  getFeedItems,
  uploadPostImages,
} from "../services/postApi";

import useLangStore from "../store/useLangStore";

import { getMessages } from "../i18n";

import UserAvatar from "../components/UserAvatar";


const fallbackPostImage = "/ex_1.jpg";

const profileImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const maxProfileImageSize = 5 * 1024 * 1024;


/* =========================================================
   크루 첫 번째 이미지 가져오기
   ========================================================= */
const getFirstCrewImage = (crew) => {
  // 여러 장의 이미지가 images 배열에 있는 경우
  if (Array.isArray(crew?.images) && crew.images.length > 0) {
    return crew.images[0];
  }

  // 여러 장의 이미지가 imageUrls 배열에 있는 경우
  if (Array.isArray(crew?.imageUrls) && crew.imageUrls.length > 0) {
    return crew.imageUrls[0];
  }

  // 이미지 한 장만 저장되어 있는 경우
  return (
    crew?.image ||
    crew?.coverImageUrl ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=200&h=200&fit=crop"
  );
};


/* =========================================================
   게시글 카드
   ========================================================= */
function PostTile({ post }) {
  const navigate = useNavigate();
  const postPath = `/post/${post.id}`;

  const image =
    post.coverImageUrl ||
    post.image ||
    fallbackPostImage;

  return (
    <button
      type="button"
      onClick={() => navigate(postPath)}
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
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-foreground">
          {post.title}
        </h3>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Heart size={13} />
            {post.likeCount ?? 0}
          </span>

          <span className="flex items-center gap-1">
            <MessageCircle size={13} />
            {post.commentCount ?? 0}
          </span>
        </div>
      </div>
    </button>
  );
}


/* =========================================================
   빈 화면
   ========================================================= */
function EmptyState({
  icon: Icon,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <div className="col-span-full flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 px-6 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
        <Icon size={22} />
      </span>

      <p className="text-sm text-muted">
        {message}
      </p>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primaryHover"
        >
          <Plus size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}


/* =========================================================
   프로필 수정
   ========================================================= */
function ProfileEditor({
  user,
  labels,
  onClose,
  onSave,
}) {
  const [name, setName] = useState(
    user.nickname || ""
  );

  const [imagePreview, setImagePreview] = useState(
    user.profileImageUrl || ""
  );

  const [imageFile, setImageFile] = useState(null);

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");


  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);


  const handleImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !profileImageTypes.has(file.type) ||
      file.size > maxProfileImageSize
    ) {
      alert(labels.imageInvalid);
      return;
    }

    setImageFile(file);
    setImagePreview(
      URL.createObjectURL(file)
    );
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            id="profile-editor-title"
            className="text-xl font-bold text-foreground"
          >
            {labels.editProfile}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted hover:bg-secondary"
            aria-label={labels.close}
          >
            <X size={18} />
          </button>
        </div>


        {/* 프로필 이미지 */}
        <div className="mb-6 flex flex-col items-center">
          <label
            htmlFor="profile-image"
            className="group relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border-4 border-secondary bg-secondary"
          >
            <UserAvatar
              src={imagePreview}
              className="h-full w-full object-cover"
              iconClassName="h-14 w-14"
            />

            <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/40 group-hover:opacity-100">
              <Camera size={25} />
            </span>
          </label>

          <input
            id="profile-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImage}
          />

          <p className="mt-3 text-center text-xs text-muted">
            {labels.editHint}
          </p>
        </div>


        {/* 닉네임 */}
        <label
          htmlFor="profile-name"
          className="text-sm font-semibold text-foreground"
        >
          {labels.nickname}
        </label>

        <input
          id="profile-name"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          className="mb-4 mt-2 w-full rounded-xl border border-border bg-inputBg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />


        {/* 이메일 */}
        <label
          htmlFor="profile-email"
          className="text-sm font-semibold text-foreground"
        >
          {labels.email}
        </label>

        <input
          id="profile-email"
          value={user.email}
          readOnly
          className="mt-2 w-full cursor-not-allowed rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted"
        />


        {/* 현재 비밀번호 */}
        <label
          htmlFor="profile-current-password"
          className="mt-4 block text-sm font-semibold text-foreground"
        >
          {labels.currentPassword}
        </label>

        <input
          id="profile-current-password"
          type="password"
          value={currentPassword}
          onChange={(event) =>
            setCurrentPassword(event.target.value)
          }
          placeholder={
            labels.currentPasswordPlaceholder
          }
          className="mt-2 w-full rounded-xl border border-border bg-inputBg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />


        {/* 새 비밀번호 */}
        <label
          htmlFor="profile-new-password"
          className="mt-4 block text-sm font-semibold text-foreground"
        >
          {labels.newPassword}
        </label>

        <input
          id="profile-new-password"
          type="password"
          value={newPassword}
          onChange={(event) =>
            setNewPassword(event.target.value)
          }
          placeholder={
            labels.newPasswordPlaceholder
          }
          className="mt-2 w-full rounded-xl border border-border bg-inputBg px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />

        <p className="mt-2 text-xs text-muted">
          {labels.passwordOptional}
        </p>


        {/* 버튼 */}
        <div className="mt-7 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted hover:bg-secondary"
          >
            {labels.cancel}
          </button>

          <button
            type="button"
            onClick={() =>
              onSave({
                nickname: name.trim(),
                imageFile,
                currentPassword,
                newPassword,
              })
            }
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            {labels.save}
          </button>
        </div>
      </section>
    </div>
  );
}


/* =========================================================
   MyPage
   ========================================================= */
export default function MyPage() {
  const navigate = useNavigate();

  const { currentLang } = useLangStore();

  const labels = getMessages(
    currentLang,
    "myPage"
  );

  const loginUser = getUser();


  const [activeTab, setActiveTab] =
    useState(0);

  const [posts, setPosts] =
    useState([]);

  const [likedPosts, setLikedPosts] =
    useState([]);

  const [bookmarks, setBookmarks] =
    useState([]);

  const [myCrews, setMyCrews] =
    useState([]);

  const [createdCrews, setCreatedCrews] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [editOpen, setEditOpen] =
    useState(false);


  const [user, setUser] = useState({
    ...loginUser,

    nickname:
      loginUser?.nickname ||
      loginUser?.email ||
      labels.traveler,

    email:
      loginUser?.email || "",
  });


  /* =========================================================
     프로필 / 게시글 / 크루 불러오기
     ========================================================= */
  useEffect(() => {
    if (!isLogin()) {
      navigate("/login", {
        replace: true,
      });

      return undefined;
    }

    let active = true;


    const loadProfileContent = async () => {
      try {
        const [
          postResponse,
          bookmarkResponse,
          likeResponse,
        ] = await Promise.all([
          apiClient.get(
            "/users/me/posts",
            {
              params: {
                size: 100,
              },
            }
          ),

          apiClient.get(
            "/users/me/bookmarks",
            {
              params: {
                size: 100,
              },
            }
          ),

          apiClient.get(
            "/users/me/likes",
            {
              params: {
                size: 100,
              },
            }
          ),
        ]);


        if (!active) return;


        setPosts(
          getFeedItems(
            unwrapApiResponse(postResponse)
          )
        );


        setBookmarks(
          getFeedItems(
            unwrapApiResponse(
              bookmarkResponse
            )
          )
        );


        setLikedPosts(
          getFeedItems(
            unwrapApiResponse(
              likeResponse
            )
          )
        );


        /* =====================================================
           크루 불러오기
           ===================================================== */

        const storedCrews = JSON.parse(
          localStorage.getItem("crews") ||
            "[]"
        );


        const joinedCrewIds = JSON.parse(
          localStorage.getItem(
            "joinedCrews"
          ) || "[]"
        );


        /*
         * 내가 만든 크루
         *
         * 현재 프로젝트에서 crews에 저장된
         * 크루는 내가 만든 크루이므로 그대로 사용
         */
        const myCreatedCrews = storedCrews;

// joinedCrews가 ID 배열인 경우
const myJoinedCrews = storedCrews.filter((crew) =>
  joinedCrewIds.some(
    (id) => String(id) === String(crew.id)
  )
);

// 내가 만든 크루 + 참여한 크루 합치기
const crewMap = new Map();

myCreatedCrews.forEach((crew) => {
  crewMap.set(String(crew.id), crew);
});

myJoinedCrews.forEach((crew) => {
  crewMap.set(String(crew.id), crew);
});

setCreatedCrews(myCreatedCrews);
setMyCrews(Array.from(crewMap.values()));
      } catch (requestError) {
        if (active) {
          setError(
            getApiErrorMessage(
              requestError,
              labels.loadError
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };


    loadProfileContent();


    /*
     * 게시글에서 좋아요를 누르면
     * 마이페이지도 다시 불러오기
     */
    window.addEventListener(
      "likeChanged",
      loadProfileContent
    );


    return () => {
      active = false;

      window.removeEventListener(
        "likeChanged",
        loadProfileContent
      );
    };
  }, [
    labels.loadError,
    navigate,
  ]);


  /* =========================================================
     통계
     ========================================================= */
  const stats = useMemo(
    () => ({
      posts: posts.length,

      likes: posts.reduce(
        (total, post) =>
          total +
          (post.likeCount ?? 0),
        0
      ),

      comments: posts.reduce(
        (total, post) =>
          total +
          (post.commentCount ?? 0),
        0
      ),
    }),
    [posts]
  );


  /* =========================================================
     크루 수정
     ========================================================= */
 
     const handleEditCrew = (crew) => {
      if (!crew?.id) {
        alert("수정할 크루 정보를 찾을 수 없습니다.");
        return;
      }
    
      navigate(`/crew/create?edit=${encodeURIComponent(crew.id)}`);
    };
  /* =========================================================
     크루 삭제
     ========================================================= */
  const handleDeleteCrew = (crewId) => {
    const confirmed = window.confirm(
      "정말 이 크루를 삭제하시겠습니까?"
    );

    if (!confirmed) return;


    const storedCrews = JSON.parse(
      localStorage.getItem("crews") ||
        "[]"
    );


    const updatedCrews =
      storedCrews.filter(
        (crew) =>
          String(crew.id) !==
          String(crewId)
      );


    localStorage.setItem(
      "crews",
      JSON.stringify(updatedCrews)
    );


    /*
     * 참여 목록에서도 제거
     */
    const joinedCrewIds = JSON.parse(
      localStorage.getItem(
        "joinedCrews"
      ) || "[]"
    );


    const updatedJoinedCrewIds =
      joinedCrewIds.filter(
        (id) =>
          String(id) !==
          String(crewId)
      );


    localStorage.setItem(
      "joinedCrews",
      JSON.stringify(
        updatedJoinedCrewIds
      )
    );


    /*
     * 화면 즉시 갱신
     */
    setCreatedCrews(
      updatedCrews
    );

    setMyCrews(
      updatedCrews
    );
  };


  /* =========================================================
     화면 내용
     ========================================================= */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="col-span-full py-24 text-center text-sm text-muted">
          {labels.loading}
        </div>
      );
    }


    if (error) {
      return (
        <div className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center text-sm text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/30">
          {error}
        </div>
      );
    }


    /* =====================================================
       내가 작성한 게시글
       ===================================================== */
    if (activeTab === 0) {
      if (!posts.length) {
        return (
          <EmptyState
            icon={FileText}
            message={labels.emptyPosts}
            actionLabel={labels.write}
            onAction={() =>
              navigate("/writepost")
            }
          />
        );
      }


      return posts.map((post) => (
        <PostTile
          key={post.id}
          post={post}
        />
      ));
    }


    /* =====================================================
       내가 좋아요한 글
       ===================================================== */
    if (activeTab === 1) {
      if (!likedPosts.length) {
        return (
          <EmptyState
            icon={Heart}
            message={
              labels.unavailableLikes
            }
          />
        );
      }


      return likedPosts.map((post) => (
        <PostTile
          key={post.id}
          post={post}
        />
      ));
    }


    /* =====================================================
       내가 북마크한 글
       ===================================================== */
    if (activeTab === 2) {
      if (!bookmarks.length) {
        return (
          <EmptyState
            icon={Bookmark}
            message={
              labels.emptyBookmarks
            }
          />
        );
      }


      return bookmarks.map((post) => (
        <PostTile
          key={post.id}
          post={post}
        />
      ));
    }


    /* =====================================================
       내 크루 활동
       ===================================================== */
    return (
      <div className="col-span-full">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-foreground">
            내 크루
          </h2>

          <p className="mt-1 text-sm text-muted">
            내가 작성했거나 참여한 크루입니다.
          </p>
        </div>


        {myCrews.length === 0 ? (
          <EmptyState
            icon={Users}
            message="내가 참여한 크루가 아직 없습니다."
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-4">

            {myCrews.map((crew) => {

              /*
               * 내가 만든 크루인지 확인
               */
              const isMine =
                createdCrews.some(
                  (createdCrew) =>
                    String(
                      createdCrew.id
                    ) ===
                    String(crew.id)
                );


              return (
                <article
                  key={crew.id}
                  className="relative rounded-2xl border border-border bg-white p-4 shadow-sm"
                >

                  {/* =========================================
                      수정 / 삭제 버튼
                      오른쪽 위 작게 표시
                     ========================================= */}
                  {isMine && (
                    <div className="absolute right-4 top-4 flex items-center gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          handleEditCrew(
                            crew
                          )
                        }
                        className="text-xs font-medium text-gray-500 transition hover:text-primary"
                      >
                        수정
                      </button>


                      <span className="text-xs text-gray-300">
                        |
                      </span>


                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCrew(
                            crew.id
                          )
                        }
                        className="text-xs font-medium text-gray-400 transition hover:text-red-500"
                      >
                        삭제
                      </button>

                    </div>
                  )}


                  {/* =========================================
                      크루 내용
                     ========================================= */}
                  <div className="flex items-start gap-4 pr-20">

                    {/* 첫 번째 사진 */}
                    <img
                      src={getFirstCrewImage(
                        crew
                      )}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-full border border-gray-100 object-cover"
                      onError={(event) => {
                        event.currentTarget.src =
                          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=200&h=200&fit=crop";
                      }}
                    />


                    {/* 제목 / 지역 */}
                    <div className="min-w-0 flex-1 pt-1">

                      <h3 className="text-base font-bold text-foreground">
                        {crew.title}
                      </h3>


                      <p className="mt-2 text-sm leading-6 text-muted">
                        {crew.region ||
                          crew.regionName ||
                          ""}
                      </p>

                    </div>
                  </div>


                  {/* =========================================
                      오픈채팅방 입장
                     ========================================= */}
                <button
  type="button"
  onClick={() =>
    navigate("/crew", {
      state: {
        openChatCrew: crew,
      },
    })
  }
  className="ml-auto mt-3 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primaryHover"
>
  오픈채팅방 입장
</button>
                </article>
              );
            })}

          </div>
        )}
      </div>
    );
  };


  /* =========================================================
     화면
     ========================================================= */
  return (
    <main className="min-h-screen bg-background px-4 pb-14 pt-24 text-foreground sm:px-6 sm:pt-28">

      <div className="mx-auto max-w-3xl">

        {/* 뒤로가기 */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-primary"
        >
          <ArrowLeft size={16} />
          {labels.back}
        </button>


        {/* ===================================================
            프로필
           =================================================== */}
        <section className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">

              {/* 프로필 이미지 */}
              <div className="relative shrink-0">

                <UserAvatar
                  src={
                    user.profileImageUrl
                  }
                  className="h-20 w-20 rounded-full border-4 border-secondary object-cover sm:h-24 sm:w-24"
                  iconClassName="h-10 w-10 sm:h-12 sm:w-12"
                />


                <button
                  type="button"
                  onClick={() =>
                    setEditOpen(true)
                  }
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow ring-2 ring-card"
                  aria-label={
                    labels.editProfile
                  }
                >
                  <Edit3 size={12} />
                </button>

              </div>


              {/* 사용자 정보 */}
              <div className="min-w-0 flex-1">

                <h1 className="truncate text-lg font-bold sm:text-xl">
                  {user.nickname}
                </h1>

                <p className="truncate text-sm text-muted">
                  {user.email}
                </p>


                {/* 통계 */}
                <dl className="mt-4 flex gap-5 sm:gap-7">

                  {[
                    [
                      stats.posts,
                      labels.posts,
                    ],
                    [
                      stats.likes,
                      labels.likes,
                    ],
                    [
                      stats.comments,
                      labels.comments,
                    ],
                  ].map(
                    ([value, label]) => (
                      <div
                        key={label}
                        className="text-center"
                      >
                        <dt className="text-xs text-muted">
                          {label}
                        </dt>

                        <dd className="text-sm font-bold text-foreground sm:text-base">
                          {value}
                        </dd>
                      </div>
                    )
                  )}

                </dl>
              </div>

            </div>


            {/* 프로필 수정 버튼 */}
            <button
              type="button"
              onClick={() =>
                setEditOpen(true)
              }
              className="self-start rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted transition hover:border-primary/40 hover:bg-secondary hover:text-primary"
            >
              {labels.editProfile}
            </button>

          </div>
        </section>


        {/* ===================================================
            탭
           =================================================== */}
        <div
          className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1 sm:grid-cols-4"
          role="tablist"
          aria-label="Profile content"
        >

          {labels.tabs.map(
            (tab, index) => {

              const tabName =
                index === 3
                  ? "내 크루 활동"
                  : tab;

              const isActiveTab = activeTab === index;
              const tabClassName =
                "rounded-xl px-2 py-2.5 text-xs font-semibold transition " +
                (isActiveTab
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted hover:text-foreground");

              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={isActiveTab}
                  onClick={() =>
                    setActiveTab(index)
                  }
                  className={tabClassName}
                >
                  {tabName}
                </button>
              );
            }
          )}

        </div>


        {/* ===================================================
            컨텐츠
           =================================================== */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {renderContent()}
        </section>

      </div>


      {/* =====================================================
          프로필 수정 모달
         ===================================================== */}
      {editOpen && (
        <ProfileEditor
          user={user}
          labels={labels}
          onClose={() =>
            setEditOpen(false)
          }

          onSave={async (nextUser) => {

            /*
             * 비밀번호 입력 검증
             */
            if (
              nextUser.newPassword &&
              (
                !nextUser.currentPassword ||
                nextUser.newPassword.length < 8
              )
            ) {
              alert(
                labels.passwordInvalid
              );
              return;
            }


            try {

              /*
               * 비밀번호 변경
               */
              if (
                nextUser.newPassword
              ) {
                await apiClient.patch(
                  "/users/me/password",
                  {
                    currentPassword:
                      nextUser.currentPassword,

                    newPassword:
                      nextUser.newPassword,
                  }
                );
              }


              /*
               * 기존 프로필 이미지
               */
              let profileImageUrl =
                user.profileImageUrl ||
                null;


              /*
               * 새 프로필 이미지 업로드
               */
              if (
                nextUser.imageFile
              ) {

                const uploadedImages =
                  await uploadPostImages([
                    nextUser.imageFile,
                  ]);


                profileImageUrl =
                  uploadedImages?.[0]
                    ?.imageUrl || null;


                if (!profileImageUrl) {
                  throw new Error(
                    labels.saveFailed
                  );
                }
              }


              /*
               * 사용자 정보 수정
               */
              const response =
                await apiClient.patch(
                  "/users/me",
                  {
                    nickname:
                      nextUser.nickname,

                    bio:
                      loginUser?.bio ||
                      null,

                    profileImageUrl,
                  }
                );


              const savedUser =
                unwrapApiResponse(
                  response
                );


              const updatedAuthUser = {
                ...loginUser,
                ...savedUser,
              };


              setUser(
                updatedAuthUser
              );


              /*
               * 기존 프로필 정보 삭제
               */
              localStorage.removeItem(
                "myProfile"
              );


              /*
               * 로그인 사용자 정보 갱신
               */
              localStorage.setItem(
                "loginUser",
                JSON.stringify(
                  updatedAuthUser
                )
              );


              /*
               * 다른 컴포넌트에
               * 프로필 변경 알림
               */
              window.dispatchEvent(
                new CustomEvent(
                  "userProfileUpdated",
                  {
                    detail:
                      updatedAuthUser,
                  }
                )
              );


              setEditOpen(false);

            } catch (saveError) {

              const errorCode =
                saveError.response?.data
                  ?.code;


              alert(
                errorCode ===
                "NICKNAME_ALREADY_USED"
                  ? labels.nicknameAlreadyUsed
                  : getApiErrorMessage(
                      saveError,
                      labels.saveFailed
                    )
              );
            }
          }}
        />
      )}

    </main>
  );
}
