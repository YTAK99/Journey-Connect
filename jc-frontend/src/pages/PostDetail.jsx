import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Eye,
  Heart,
  MapPin,
  PenLine,
  Trash2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import TagChips from "../components/TagChips";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser } from "../services/auth";
import { deletePost, getPost } from "../services/postApi";
import useLangStore from "../store/useLangStore";
import { getLocalizedRegionName } from "../utils/region";
import { normalizeEditorContent } from "../utils/richText";

const fallbackAvatar = "/user_1.jpg";

const formatDate = (value, language) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  const isKorean = currentLang === "ko";

  // 언어가 바뀌면 오류 문구도 현재 언어를 사용하도록 상세 요청을 다시 구성합니다.
  useEffect(() => {
    getPost(id)
      .then(setPost)
      .catch((error) => {
        alert(getApiErrorMessage(error, isKorean ? "게시글을 불러오지 못했습니다." : "Could not load this post."));
      })
      .finally(() => setLoading(false));
  }, [id, isKorean]);

  const handleDelete = async () => {
    if (!window.confirm(isKorean ? "정말 삭제하시겠습니까?" : "Delete this post?")) return;

    try {
      await deletePost(id);
      alert(isKorean ? "삭제되었습니다." : "Post deleted.");
      navigate("/my-posts");
    } catch (error) {
      alert(getApiErrorMessage(error, isKorean ? "게시글 삭제에 실패했습니다." : "Could not delete this post."));
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 pb-16 pt-28">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="mb-6 h-5 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm dark:bg-slate-900">
            <div className="h-72 bg-slate-200 dark:bg-slate-800 sm:h-[28rem]" />
            <div className="space-y-5 p-7 sm:p-12">
              <div className="h-5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-12 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 pt-20">
        <div className="rounded-3xl bg-white px-10 py-14 text-center shadow-sm dark:bg-slate-900">
          <p className="text-lg font-semibold text-title">
            {isKorean ? "게시글을 찾을 수 없습니다." : "Post not found."}
          </p>
          <button type="button" onClick={() => navigate(-1)} className="mt-5 text-sm font-semibold text-primary hover:text-primaryHover">
            {isKorean ? "이전 페이지로" : "Go back"}
          </button>
        </div>
      </main>
    );
  }

  const currentUser = getUser();
  const isAuthor = String(currentUser?.id) === String(post.author?.id);
  const location = getLocalizedRegionName(post, currentLang);
  // 대표 이미지는 상단 히어로에서 이미 사용하므로 본문 갤러리에서는 중복 노출하지 않습니다.
  const galleryImages = (post.images || []).filter((image) => image.imageUrl !== post.coverImageUrl);
  const hasTravelDates = post.travelStartDate || post.travelEndDate;

  return (
    <main className="min-h-screen bg-background px-4 pb-20 pt-24 sm:px-8 sm:pt-28">
      <article className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 rounded-full px-1 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-primary dark:text-slate-300"
        >
          <ArrowLeft size={18} />
          {isKorean ? "여행 이야기로 돌아가기" : "Back to travel stories"}
        </button>

        <div className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white shadow-[0_24px_70px_-32px_rgba(15,118,110,0.35)] dark:border-slate-800 dark:bg-slate-900 sm:rounded-[2.25rem]">
          {post.coverImageUrl && (
            <div className="relative h-72 overflow-hidden sm:h-[30rem]">
              <img src={post.coverImageUrl} alt={post.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 sm:bottom-8 sm:left-9">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-slate-950/30 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md">
                  <MapPin size={16} />
                  {location}
                </span>
              </div>
            </div>
          )}

          <div className="px-6 py-8 sm:px-12 sm:py-12 lg:px-16">
            {!post.coverImageUrl && (
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 dark:bg-teal-950/40 dark:text-teal-200">
                <MapPin size={16} />
                {location}
              </div>
            )}

            <header className="border-b border-slate-100 pb-8 dark:border-slate-800 sm:pb-10">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-primary">
                {isKorean ? "Journey Story" : "Travel Journal"}
              </p>
              <h1 className="max-w-4xl break-keep text-3xl font-extrabold leading-tight tracking-tight text-title sm:text-5xl sm:leading-[1.15]">
                {post.title}
              </h1>

              <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={post.author?.profileImageUrl || fallbackAvatar}
                    alt=""
                    className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-md dark:border-slate-800"
                  />
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100">
                      {post.author?.nickname || (isKorean ? "여행자" : "Traveler")}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(post.createdAt, currentLang)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5"><Eye size={17} /> {post.viewCount ?? 0}</span>
                  <span className="inline-flex items-center gap-1.5"><Heart size={17} /> {post.likeCount ?? 0}</span>
                  <span className="inline-flex items-center gap-1.5"><Bookmark size={17} /> {post.bookmarkCount ?? 0}</span>
                </div>
              </div>
            </header>

            {(hasTravelDates || (post.tags || []).length > 0) && (
              <div className="flex flex-col gap-4 border-b border-slate-100 py-6 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                {hasTravelDates && (
                  <div className="inline-flex w-fit items-center gap-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary shadow-sm dark:bg-slate-900">
                      <CalendarDays size={17} />
                    </span>
                    <span>
                      <span className="mr-2 text-xs font-medium text-teal-600 dark:text-teal-400">{isKorean ? "여행 기간" : "Travel dates"}</span>
                      {post.travelStartDate || (isKorean ? "미정" : "TBD")} — {post.travelEndDate || (isKorean ? "미정" : "TBD")}
                    </span>
                  </div>
                )}
                <TagChips tags={post.tags || []} className="sm:justify-end" />
              </div>
            )}

            {/* 저장 시 백엔드에서 허용된 HTML만 남기므로 정제된 리치 텍스트를 그대로 렌더링합니다. */}
            <div
              className="rich-text-content mx-auto max-w-3xl py-10 text-[1.05rem] leading-8 text-slate-700 dark:text-slate-200 sm:py-14 sm:text-lg sm:leading-9"
              dangerouslySetInnerHTML={{ __html: normalizeEditorContent(post.content || "") }}
            />

            {galleryImages.length > 0 && (
              <section className="border-t border-slate-100 pt-9 dark:border-slate-800">
                <div className="mb-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Photo notes</p>
                    <h2 className="mt-1 text-xl font-bold text-title">{isKorean ? "여행의 장면들" : "Scenes from the journey"}</h2>
                  </div>
                  <span className="text-sm text-slate-400">{galleryImages.length} photos</span>
                </div>
                <div className="grid auto-rows-[11rem] grid-cols-2 gap-3 sm:auto-rows-[15rem] sm:grid-cols-3">
                  {galleryImages.map((image, index) => (
                    <img
                      key={image.id || image.imageUrl}
                      src={image.imageUrl}
                      alt={image.altText || `${post.title} ${index + 1}`}
                      className={`h-full w-full rounded-2xl object-cover transition-transform duration-300 hover:scale-[1.01] ${
                        index === 0 && galleryImages.length > 2 ? "col-span-2 sm:row-span-2" : ""
                      }`}
                    />
                  ))}
                </div>
              </section>
            )}

            {isAuthor && (
              <footer className="mt-10 flex justify-end gap-2 border-t border-slate-100 pt-6 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => navigate(`/write/${post.id}`)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-teal-950/30"
                >
                  <PenLine size={16} />
                  {isKorean ? "수정" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 size={16} />
                  {isKorean ? "삭제" : "Delete"}
                </button>
              </footer>
            )}
          </div>
        </div>
      </article>
    </main>
  );
}

export default PostDetail;
