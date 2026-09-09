import { useEffect, useRef, useState } from "react";
import { Heart, Loader2, X } from "lucide-react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { getUser } from "../services/auth";
import { getPostLikers } from "../services/postApi";
import useTranslation from "../i18n/useTranslation";
import UserAvatar from "./UserAvatar";

export default function PostLikersModal({ postId, onClose }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPostLikers(postId)
      .then((result) => { if (active) setUsers(Array.isArray(result) ? result : []); })
      .catch((requestError) => { if (active) setError(getApiErrorMessage(requestError, t("likers.loadFailed"))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [postId, t]);

  const openProfile = (user) => {
    const currentUser = getUser();
    onClose();
    navigate(currentUser?.id != null && String(currentUser.id) === String(user.id)
      ? "/mypage"
      : `/users/${user.id}`);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4" onClick={onClose}>
      <section ref={panelRef} className="flex max-h-[32rem] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="flex items-center gap-2 font-bold text-title"><Heart size={17} className="text-rose-500" /> {t("likers.title")}</h2>
          <button type="button" onClick={onClose} aria-label={t("likers.close")} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={17} /></button>
        </header>
        <div className="min-h-40 flex-1 overflow-y-auto p-3">
          {loading && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>}
          {!loading && error && <p className="px-4 py-10 text-center text-sm text-rose-500">{error}</p>}
          {!loading && !error && users.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">{t("likers.empty")}</p>}
          {!loading && !error && users.map((user) => (
            <button key={user.id} type="button" onClick={() => openProfile(user)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-teal-50 dark:hover:bg-teal-950/30">
              <UserAvatar src={user.profileImageUrl} alt={user.nickname} className="h-10 w-10 rounded-full object-cover" iconClassName="h-5 w-5" />
              <span className="truncate text-sm font-bold text-title">{user.nickname || t("post.traveler")}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
