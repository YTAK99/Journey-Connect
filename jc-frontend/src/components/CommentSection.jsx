import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/apiClient";
import { isLogin } from "../services/auth";
import { addPostComment, getPostComments } from "../services/postApi";
import useTranslation from "../i18n/useTranslation";

const getItems = (response) => response?.items || response?.content || response?.data || (Array.isArray(response) ? response : []);

export default function CommentSection({ postId }) {
  const { t } = useTranslation();
  // 1. 서버에서 조회한 현재 게시글의 댓글 목록과 요청 상태를 관리합니다.
  const [comments, setComments] = useState([]);
  // 2. 사용자가 입력 중인 댓글과 중복 제출 방지 상태를 관리합니다.
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 댓글 영역을 열었을 때 해당 게시글의 댓글을 서버에서 조회합니다.
  useEffect(() => {
    let active = true;
    getPostComments(postId)
      .then((response) => { if (active) setComments(getItems(response)); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, t("comments.loadFailed"))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId, t]);

  // 3. 빈 댓글은 전송하지 않고, 성공한 댓글은 목록 끝에 즉시 추가합니다.
  const handleAddComment = async (event) => {
    event.preventDefault();
    const content = inputText.trim();
    if (!content || submitting) return;
    if (!isLogin()) {
      setError(t("comments.loginRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const created = await addPostComment(postId, content);
      // 서버가 생성한 댓글을 기존 목록에 추가하고 입력창을 초기화합니다.
      setComments((current) => [...current, created]);
      setInputText("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("comments.addFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">{t("comments.count", { count: comments.length })}</h4>
      {loading && <p className="mb-3 text-xs text-slate-500">{t("comments.loading")}</p>}
      {error && <p className="mb-3 text-xs text-rose-500">{error}</p>}

      {/* 댓글 목록은 작성 순서대로 표시합니다. */}
      <div className="mb-4 max-h-48 space-y-3 overflow-y-auto">
        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800">
            <div><span className="mr-2 font-bold text-slate-900 dark:text-white">{comment.author?.nickname || t("post.traveler")}</span><span className="text-slate-700 dark:text-slate-200">{comment.content}</span></div>
            <span className="ml-2 shrink-0 text-[10px] text-slate-400">{comment.createdAt ? String(comment.createdAt).slice(0, 16).replace("T", " ") : ""}</span>
          </div>
        ))}
      </div>

      {/* 댓글 입력 및 등록 영역 */}
      <form onSubmit={handleAddComment} className="flex gap-2">
        <input type="text" value={inputText} onChange={(event) => setInputText(event.target.value)} maxLength={1000} placeholder={t("comments.placeholder")} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900" />
        <button type="submit" disabled={submitting || !inputText.trim()} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50">{submitting ? t("comments.submitting") : t("comments.submit")}</button>
      </form>
    </div>
  );
}
