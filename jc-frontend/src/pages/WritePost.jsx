import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Camera } from "lucide-react";
import { getApiErrorMessage } from "../services/apiClient";
import { isLogin } from "../services/auth";
import { createPost, getPost, updatePost } from "../services/postApi";

function WritePost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin()) {
      alert("로그인이 필요합니다.");
      navigate("/login", { replace: true });
      return;
    }

    if (!id) return;

    getPost(id)
      .then((post) => {
        setTitle(post.title || "");
        setContent(post.content || "");
        setLocation(post.regionName || post.region?.name || "");
        setImageUrl(post.coverImageUrl || "");
      })
      .catch((error) => {
        alert(getApiErrorMessage(error, "게시글을 불러오지 못했습니다."));
        navigate("/my-posts");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert("일정 제목을 입력해주세요.");
      return;
    }

    if (!location.trim()) {
      alert("여행 지역을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      alert("여행 일정을 입력해주세요.");
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      alert("종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
      return;
    }

    const dateText =
      startDate || endDate ? `\n\n여행 기간: ${startDate || "미정"} ~ ${endDate || "미정"}` : "";

    const trimmedImageUrl = imageUrl.trim();
    const request = {
      title: title.trim(),
      content: `${content.trim()}${dateText}`,
      regionCode: null,
      regionName: location.trim(),
      coverImageUrl: trimmedImageUrl || null,
      images: trimmedImageUrl ? [{ imageUrl: trimmedImageUrl, altText: title.trim() }] : [],
    };

    try {
      setSubmitting(true);

      if (id) {
        await updatePost(id, request);
        alert("게시글이 수정되었습니다.");
      } else {
        await createPost(request);
        alert("여행 일정이 등록되었습니다.");
      }

      navigate("/feed");
    } catch (error) {
      alert(getApiErrorMessage(error, "게시글 저장에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 pt-28">게시글을 불러오는 중입니다.</div>;
  }

  return (
    <main className="min-h-screen bg-sky-50 pt-24 pb-10">
      <section className="mx-auto max-w-4xl rounded-xl bg-card p-8 shadow-md">
        <h1 className="mb-8 text-3xl font-bold text-title">
          {id ? "여행 일정 수정" : "여행 일정 작성"}
        </h1>

        <label className="font-semibold text-text">일정 제목</label>
        <input
          className="mb-5 mt-2 w-full rounded-lg border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="여행 일정 제목을 입력하세요"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
        />

        <label className="font-semibold text-text">여행 지역</label>
        <input
          className="mb-5 mt-2 w-full rounded-lg border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="예: 일본 오사카"
          value={location}
          maxLength={100}
          onChange={(event) => setLocation(event.target.value)}
        />

        <label className="font-semibold text-text">여행 시작 날짜</label>
        <input
          type="date"
          className="mb-5 mt-2 w-full rounded-lg border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label className="font-semibold text-text">여행 종료 날짜</label>
        <input
          type="date"
          className="mb-5 mt-2 w-full rounded-lg border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />

        <label className="font-semibold text-text">여행 일정</label>
        <textarea
          className="mt-2 h-72 w-full rounded-lg border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="여행 일정을 자유롭게 작성해주세요."
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        <label className="mt-5 block font-semibold text-text">대표 이미지 URL</label>
        <div className="relative mb-5 mt-2">
          <Camera className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="url"
            className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com/travel.jpg (선택 사항)"
            value={imageUrl}
            maxLength={500}
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </div>

        {imageUrl && (
          <img
            src={imageUrl}
            alt="미리보기"
            className="mb-5 h-40 w-64 rounded-xl object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-8 w-full rounded-lg bg-primary py-3 text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {submitting ? "저장 중..." : id ? "수정 완료" : "일정 등록하기"}
        </button>
      </section>
    </main>
  );
}

export default WritePost;
