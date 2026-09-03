import { Bell, Heart, MessageCircle, UserPlus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { getNotifications, markAllNotificationsRead } from "../services/notificationApi";
import useTranslation from "../i18n/useTranslation";
import UserAvatar from "./UserAvatar";

const getItems = (response) => response?.items || response?.content || response?.data || [];

const notificationPresentation = {
  post_like: { key: "notifications.postLiked", icon: Heart },
  post_comment: { key: "notifications.postCommented", icon: MessageCircle },
  comment_reply: { key: "notifications.commentReplied", icon: MessageCircle },
  crew_application: { key: "notifications.crewApplication", icon: UserPlus },
  crew_approved: { key: "notifications.crewApproved", icon: Users },
  crew_rejected: { key: "notifications.crewRejected", icon: Users },
  report_resolved: { key: "notifications.reportResolved", icon: Bell },
  report_rejected: { key: "notifications.reportRejected", icon: Bell },
};

const relativeTime = (createdAt, language) => {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const formatter = new Intl.RelativeTimeFormat(language === "ko" ? "ko-KR" : "en-US", { numeric: "auto" });
  if (elapsedSeconds < 60) return formatter.format(-elapsedSeconds, "second");
  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return formatter.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return formatter.format(-hours, "hour");
  return formatter.format(-Math.floor(hours / 24), "day");
};

export default function NotificationSidebar({ isOpen, onClose, authenticated, onAllRead }) {
  const navigate = useNavigate();
  const { currentLang, t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return undefined;
    if (!authenticated) return undefined;

    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError("");
        }
        return Promise.all([getNotifications({ size: 50 }), markAllNotificationsRead()]);
      })
      .then(([response]) => {
        if (!active) return;
        setNotifications(getItems(response).map((item) => ({ ...item, read: true })));
        onAllRead();
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, t("notifications.loadFailed")));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authenticated, isOpen, onAllRead, t]);

  if (!isOpen) return null;
  const visibleNotifications = authenticated ? notifications : [];

  const openNotification = (item) => {
    onClose();
    if (item.targetType === "post") navigate(`/post/${item.targetId}`);
    else if (item.targetType === "crew") navigate("/crew");
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("notifications.close")}
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-slate-950/10 backdrop-blur-[1px] dark:bg-slate-950/35"
      />
      <section className="fixed right-4 top-16 z-50 flex max-h-[min(34rem,calc(100vh-5rem))] w-[calc(100%-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-2xl shadow-teal-950/15 dark:border-slate-700 dark:bg-slate-900 sm:right-6">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("notifications.title")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("notifications.close")} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white">
            <X size={18} />
          </button>
        </header>

        <div className="min-h-48 flex-1 space-y-2 overflow-y-auto p-3">
          {loading && <p className="px-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{t("notifications.loading")}</p>}
          {!loading && error && <p className="rounded-xl bg-rose-50 px-4 py-8 text-center text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
          {!loading && !error && visibleNotifications.length === 0 && (
            <div className="flex min-h-40 flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-500 dark:bg-teal-950/40 dark:text-teal-300"><Bell size={20} /></span>
              <p className="text-sm">{authenticated ? t("notifications.empty") : t("notifications.loginRequired")}</p>
            </div>
          )}
          {!loading && !error && visibleNotifications.map((item) => {
            const presentation = notificationPresentation[item.type] || { key: "notifications.generic", icon: Bell };
            const Icon = presentation.icon;
            const actorName = item.actor?.nickname || t("notifications.someone");
            return (
              <button key={item.id} type="button" onClick={() => openNotification(item)} className="flex w-full items-start gap-3 rounded-xl border border-transparent px-3 py-3 text-left transition hover:border-teal-100 hover:bg-teal-50/70 dark:hover:border-teal-900/60 dark:hover:bg-teal-950/25">
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <UserAvatar src={item.actor?.profileImageUrl} alt={actorName} className="h-full w-full object-cover" iconClassName="h-5 w-5" />
                  <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-white ring-2 ring-white dark:ring-slate-900"><Icon size={9} /></span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">{t(presentation.key, { actor: actorName })}</span>
                  <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{relativeTime(item.createdAt, currentLang)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-500">
          <span>{t("notifications.allRead")}</span>
          <span>{t("notifications.count", { count: visibleNotifications.length })}</span>
        </footer>
      </section>
    </>
  );
}
