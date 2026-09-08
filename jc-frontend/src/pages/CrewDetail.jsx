import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, MapPin, MessageCircle, Route, ShieldCheck, Users, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import PostRouteMap from "../components/PostRouteMap";
import UserAvatar from "../components/UserAvatar";
import { DEFAULT_CREW_IMAGE, crewCategoryLabel, getStableCrewColor } from "../data/crewCategories";
import useTranslation from "../i18n/useTranslation";
import { isLogin } from "../services/auth";
import { getApiErrorMessage } from "../services/apiClient";
import { cancelCrewJoin, crewPageItems, endCrew, getCrew, getCrewApplications, getCrewMembers, joinCrew, reviewCrewApplication } from "../services/crewApi";
import { getPost } from "../services/postApi";

const formatDate = (value, lang) => value ? new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${value}T00:00:00`)) : (lang === "ko" ? "날짜 협의" : "Date TBD");

export default function CrewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useTranslation();
  const ko = currentLang === "ko";
  const [crew, setCrew] = useState(null);
  const [routePlaces, setRoutePlaces] = useState([]);
  const [routeDetails, setRouteDetails] = useState([]);
  const [members, setMembers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinOpen, setJoinOpen] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [working, setWorking] = useState(false);

  const load = async () => {
    const detail = await getCrew(id);
    setCrew(detail);
    const [memberPage, routeValues] = await Promise.all([
      getCrewMembers(id).catch(() => ({ items: [] })),
      detail.routePlaces?.length
        ? Promise.resolve([])
        : Promise.all((detail.routes || []).map((route) => getPost(route.id).catch(() => route))),
    ]);
    setMembers(crewPageItems(memberPage));
    setRoutePlaces(detail.routePlaces || []);
    setRouteDetails(routeValues);
    if (detail.viewer?.owner) {
      const page = await getCrewApplications(id).catch(() => ({ items: [] }));
      setApplications(crewPageItems(page));
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((error) => window.alert(getApiErrorMessage(error, ko ? "크루 정보를 불러오지 못했습니다." : "Could not load the crew."))).finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const membership = crew?.viewer?.membershipStatus;
  const canChat = crew?.viewer?.canAccessChat;
  const full = crew && crew.memberCount >= crew.capacity;
  const actionLabel = useMemo(() => {
    if (!crew?.recruiting) return ko ? "종료된 크루" : "Crew ended";
    if (membership === "PENDING") return ko ? "승인 대기 중" : "Pending approval";
    if (membership === "OWNER" || membership === "APPROVED") return ko ? "채팅방 들어가기" : "Open chat";
    if (membership === "KICKED") return ko ? "참여할 수 없는 크루" : "Unavailable";
    if (full) return ko ? "정원이 가득 찼어요" : "Crew is full";
    return crew?.approvalRequired ? (ko ? "가입 신청하기" : "Apply to join") : (ko ? "참여하기" : "Join crew");
  }, [crew, full, ko, membership]);

  const handlePrimaryAction = async () => {
    if (!isLogin()) { navigate("/login"); return; }
    if (canChat) { navigate(`/crew/${id}/chat`); return; }
    if (!crew?.viewer?.canJoin) return;
    if (crew.approvalRequired) { setJoinOpen(true); return; }
    setWorking(true);
    try {
      await joinCrew(id);
      navigate("/mypage?tab=crews", { replace: true });
    } catch (error) { window.alert(getApiErrorMessage(error, ko ? "크루에 참여하지 못했습니다." : "Could not join.")); }
    finally { setWorking(false); }
  };

  const submitApplication = async () => {
    if (!applicationMessage.trim()) return;
    setWorking(true);
    try {
      await joinCrew(id, applicationMessage.trim());
      navigate("/mypage?tab=crews", { replace: true });
    } catch (error) { window.alert(getApiErrorMessage(error, ko ? "가입 신청을 보내지 못했습니다." : "Could not send application.")); }
    finally { setWorking(false); }
  };

  const review = async (applicationId, status) => {
    try {
      await reviewCrewApplication(id, applicationId, status);
      await load();
    } catch (error) { window.alert(getApiErrorMessage(error)); }
  };

  const cancel = async () => {
    if (!window.confirm(ko ? "참여 또는 신청을 취소할까요?" : "Cancel your membership or application?")) return;
    try { await cancelCrewJoin(id); await load(); } catch (error) { window.alert(getApiErrorMessage(error)); }
  };

  const finish = async () => {
    if (!window.confirm(ko ? "크루를 종료하면 새 참여와 채팅 전송이 중단됩니다. 종료할까요?" : "Ending disables new joins and messages. Continue?")) return;
    try { setCrew(await endCrew(id)); } catch (error) { window.alert(getApiErrorMessage(error)); }
  };

  if (loading) return <main className="min-h-screen bg-background px-4 pt-28"><div className="mx-auto h-[34rem] max-w-5xl animate-pulse rounded-[2rem] bg-secondary" /></main>;
  if (!crew) return null;
  const heroColor = getStableCrewColor(crew.id ?? crew.title);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 pb-28 pt-24 dark:from-slate-950 dark:to-slate-950 sm:px-6 sm:pt-28">
      <div className="mx-auto max-w-5xl">
        <button type="button" onClick={() => navigate("/crew")} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft size={17} /> {ko ? "크루 목록" : "Crews"}</button>
        <article className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-teal-950/5">
          <div className="relative h-72 sm:h-[28rem]" style={{ backgroundColor: heroColor }}>{crew.coverImageUrl && <img src={crew.coverImageUrl} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}<div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/5 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-9"><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">{crewCategoryLabel(crew.category, currentLang)}</span><h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{crew.title}</h1><p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"><MapPin size={16} /> {crew.regionName}</p></div>{!crew.recruiting && <span className="absolute right-5 top-5 rounded-full bg-slate-950/75 px-4 py-2 text-sm font-bold text-white">{ko ? "종료됨" : "Ended"}</span>}</div>
          <div className="p-6 sm:p-10">
            <div className="grid gap-3 sm:grid-cols-3">{[[CalendarDays, formatDate(crew.travelDate, currentLang)], [Users, `${crew.memberCount} / ${crew.capacity}`], [ShieldCheck, crew.approvalRequired ? (ko ? "승인 후 참여" : "Approval") : (ko ? "바로 참여" : "Instant join")]].map(([Icon, label]) => <div key={label} className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary"><Icon size={18} /></span><span className="text-sm font-bold text-title">{label}</span></div>)}</div>
            <section className="mt-9"><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">About this crew</p><h2 className="mt-2 text-xl font-extrabold text-title">{ko ? "크루 소개" : "Introduction"}</h2><p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-muted">{crew.description}</p></section>

            <section className="mt-10 border-t border-border pt-9"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-primary dark:bg-teal-950/30"><Route size={20} /></span><div><h2 className="text-xl font-extrabold text-title">{ko ? "함께 여행할 루트" : "Crew route"}</h2><p className="text-xs text-muted">{routePlaces.length ? (ko ? `${routePlaces.length}개의 경유지` : `${routePlaces.length} stops`) : (ko ? `${routeDetails.length}개의 기존 여행 루트` : `${routeDetails.length} legacy routes`)}</p></div></div>{routePlaces.length > 0 && <div className="mt-5 overflow-hidden rounded-3xl border border-border"><PostRouteMap places={routePlaces} lang={currentLang} compact /><div className="divide-y divide-border">{routePlaces.map((place, index) => { const imageUrl = place.images?.[0]?.imageUrl; const placeName = place.region?.localizedNames?.[currentLang] || place.placeName || place.region?.displayName; return <article key={place.id || `${placeName}-${index}`} className="flex gap-4 p-4 sm:p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{index + 1}</span>{imageUrl && <img src={imageUrl} alt="" className="h-20 w-24 shrink-0 rounded-xl object-cover" />}<div className="min-w-0 flex-1"><h3 className="font-extrabold text-title">{placeName}</h3><div className="mt-2 line-clamp-3 text-sm leading-6 text-muted" dangerouslySetInnerHTML={{ __html: place.content }} /></div></article>; })}</div></div>}<div className="mt-5 space-y-5">{routePlaces.length === 0 && routeDetails.map((route, index) => <article key={route.id} className="overflow-hidden rounded-3xl border border-border"><div className="flex items-center gap-4 p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-white">{index + 1}</span><img src={route.coverImageUrl || DEFAULT_CREW_IMAGE} alt="" className="h-16 w-20 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="truncate font-extrabold text-title">{route.title}</h3><p className="mt-1 text-xs text-muted">{route.regionName || route.region?.displayName}</p></div><button type="button" onClick={() => navigate(`/post/${route.id}`)} className="shrink-0 text-xs font-bold text-primary">{ko ? "원문 보기" : "View"}</button></div>{Array.isArray(route.places) && route.places.length > 0 && <PostRouteMap places={route.places} lang={currentLang} compact />}</article>)}</div></section>

            <section className="mt-10 border-t border-border pt-9"><h2 className="flex items-center gap-2 text-xl font-extrabold text-title"><Users size={20} className="text-primary" /> {ko ? "참여자" : "Members"} <span className="text-sm text-muted">{members.length}</span></h2><div className="mt-4 flex flex-wrap gap-3">{members.slice(0, 12).map((member) => <div key={member.userId} className="flex items-center gap-2 rounded-full border border-border bg-card py-1.5 pl-1.5 pr-3"><UserAvatar src={member.profileImageUrl} className="h-8 w-8 rounded-full object-cover" /><span className="text-xs font-bold text-title">{member.nickname}</span>{member.role === "OWNER" && <span className="text-[10px] font-bold text-primary">{ko ? "크루장" : "Owner"}</span>}</div>)}</div></section>

            {crew.viewer?.owner && applications.length > 0 && <section className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20"><h2 className="font-extrabold text-title">{ko ? "가입 신청" : "Applications"} <span className="text-amber-600">{applications.length}</span></h2><div className="mt-4 space-y-3">{applications.map((application) => <div key={application.id} className="rounded-2xl bg-card p-4"><div className="flex items-center gap-3"><UserAvatar src={application.userProfileImageUrl} className="h-10 w-10 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="text-sm font-bold text-title">{application.userNickname}</p><p className="mt-1 text-sm text-muted">{application.message}</p></div></div><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => review(application.id, "REJECTED")} className="rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted"><X size={14} className="mr-1 inline" />{ko ? "거절" : "Reject"}</button><button type="button" onClick={() => review(application.id, "APPROVED")} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"><Check size={14} className="mr-1 inline" />{ko ? "승인" : "Approve"}</button></div></div>)}</div></section>}

            {crew.viewer?.owner && crew.recruiting && <div className="mt-10 flex justify-end"><button type="button" onClick={finish} className="text-sm font-bold text-rose-500 hover:text-rose-600">{ko ? "크루 종료하기" : "End crew"}</button></div>}
          </div>
        </article>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-3xl gap-2">{(membership === "PENDING" || membership === "APPROVED") && crew.recruiting && <button type="button" onClick={cancel} className="rounded-xl border border-border px-4 text-sm font-bold text-muted">{ko ? "취소" : "Cancel"}</button>}<button type="button" disabled={working || (!canChat && !crew.viewer?.canJoin)} onClick={handlePrimaryAction} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white disabled:bg-slate-300 dark:disabled:bg-slate-700">{membership === "PENDING" ? <Clock3 size={17} /> : canChat ? <MessageCircle size={17} /> : <Users size={17} />}{working ? (ko ? "처리 중..." : "Working...") : actionLabel}</button></div></div>

      {joinOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-xl font-extrabold text-title">{ko ? "가입 신청 메시지" : "Application message"}</h2><p className="mt-1 text-sm text-muted">{ko ? "크루장에게 간단한 인사를 남겨주세요." : "Introduce yourself to the crew owner."}</p></div><button type="button" onClick={() => setJoinOpen(false)} className="text-muted"><X /></button></div><textarea autoFocus value={applicationMessage} onChange={(event) => setApplicationMessage(event.target.value)} maxLength={500} rows={6} className="mt-5 w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm outline-none focus:border-primary" placeholder={ko ? "함께하고 싶은 이유나 여행 스타일을 알려주세요." : "Share why you would like to join."} /><p className="mt-1 text-right text-xs text-muted">{applicationMessage.length}/500</p><button type="button" disabled={!applicationMessage.trim() || working} onClick={submitApplication} className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-extrabold text-white disabled:opacity-40">{ko ? "신청 보내기" : "Send application"}</button></div></div>}
    </main>
  );
}
