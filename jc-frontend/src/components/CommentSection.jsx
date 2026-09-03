import { Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser, isLogin } from "../services/auth";
import { addPostComment, deletePostComment, getPostComments, updatePostComment } from "../services/postApi";
import useTranslation from "../i18n/useTranslation";

const getItems = (response) => response?.items || response?.content || response?.data || (Array.isArray(response) ? response : []);

export default function CommentSection({ postId }) {
  const { t } = useTranslation();
  const currentUser = getUser();
  const [comments, setComments] = useState([]);
  const [inputText, setInputText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError("");
        }
        return getPostComments(postId);
      })
      .then((response) => { if (active) setComments(getItems(response)); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, t("comments.loadFailed"))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId, t]);

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
      setComments((current) => [...current, created]);
      setInputText("");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("comments.addFailed")));
    } finally {
      setSubmitting(false);
    }
  };

  const startEditing = (comment) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
    setError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingText("");
  };

  const saveEditing = async (commentId) => {
    const content = editingText.trim();
    if (!content || actingId) return;
    setActingId(commentId);
    setError("");
    try {
      const updated = await updatePostComment(commentId, content);
      setComments((current) => current.map((comment) => comment.id === commentId ? updated : comment));
      cancelEditing();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("comments.updateFailed")));
    } finally {
      setActingId(null);
    }
  };

  const removeComment = async (commentId) => {
    if (actingId || !window.confirm(t("comments.deleteConfirm"))) return;
    setActingId(commentId);
    setError("");
    try {
      await deletePostComment(commentId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      if (editingId === commentId) cancelEditing();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, t("comments.deleteFailed")));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <h4 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">{t("comments.count", { count: comments.length })}</h4>
      {loading && <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t("comments.loading")}</p>}
      {error && <p className="mb-3 text-xs text-rose-500 dark:text-rose-400">{error}</p>}

      <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
        {!loading && comments.length === 0 && <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">{t("comments.empty")}</p>}
        {comments.map((comment) => {
          const isOwner = currentUser?.id != null && String(comment.author?.id) === String(currentUser.id);
          const isEditing = editingId === comment.id;
          const disabled = actingId === comment.id;
          return (
            <article key={comment.id} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{comment.author?.nickname || t("post.traveler")}</span>
                    <time className="text-[10px] text-slate-400">{comment.createdAt ? String(comment.createdAt).slice(0, 16).replace("T", " ") : ""}</time>
                  </div>
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingText}
                      maxLength={1000}
                      onChange={(event) => setEditingText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") saveEditing(comment.id);
                        if (event.key === "Escape") cancelEditing();
                      }}
                      className="w-full rounded-lg border border-teal-300 bg-white px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-teal-100 dark:border-teal-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-950"
                    />
                  ) : (
                    <p className="break-words leading-5 text-slate-700 dark:text-slate-200">{comment.content}</p>
                  )}
                </div>
                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    {isEditing ? (
                      <>
                        <button type="button" disabled={disabled || !editingText.trim()} onClick={() => saveEditing(comment.id)} aria-label={t("comments.saveEdit")} className="rounded-lg p-1.5 text-teal-600 hover:bg-teal-100 disabled:opacity-40 dark:text-teal-300 dark:hover:bg-teal-950"><Check size={14} /></button>
                        <button type="button" disabled={disabled} onClick={cancelEditing} aria-label={t("comments.cancelEdit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={Boolean(actingId)} onClick={() => startEditing(comment)} aria-label={t("comments.edit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-teal-600 dark:hover:bg-slate-700 dark:hover:text-teal-300"><Pencil size={13} /></button>
                        <button type="button" disabled={Boolean(actingId)} onClick={() => removeComment(comment.id)} aria-label={t("comments.delete")} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-500 dark:hover:bg-rose-950/40"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <form onSubmit={handleAddComment} className="flex gap-2">
        <input type="text" value={inputText} onChange={(event) => setInputText(event.target.value)} maxLength={1000} placeholder={t("comments.placeholder")} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500" />
        <button type="submit" disabled={submitting || !inputText.trim()} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-teal-800 disabled:opacity-50">{submitting ? t("comments.submitting") : t("comments.submit")}</button>
      </form>
    </div>
  );
}
