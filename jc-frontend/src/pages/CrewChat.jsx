import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Loader2, Menu, Send, UserMinus, Users, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import UserAvatar from "../components/UserAvatar";
import { DEFAULT_CREW_IMAGE } from "../data/crewCategories";
import useTranslation from "../i18n/useTranslation";
import { getUser, isLogin } from "../services/auth";
import { getApiErrorMessage } from "../services/apiClient";
import { connectCrewChat, crewPageItems, getCrew, getCrewMembers, getCrewMessages, kickCrewMember } from "../services/crewApi";
import { uploadPostImages } from "../services/postApi";

const messageTime = (value, lang) => new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const messageDay = (value, lang) => new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));

export default function CrewChat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useTranslation();
  const ko = currentLang === "ko";
  const me = getUser();
  const [crew, setCrew] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [beforeId, setBeforeId] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const connectionRef = useRef(null);
  const bottomRef = useRef(null);

  const loadMembers = async () => setMembers(crewPageItems(await getCrewMembers(id)));

  useEffect(() => {
    if (!isLogin()) { navigate("/login", { replace: true }); return undefined; }
    let active = true;
    Promise.all([getCrew(id), getCrewMessages(id), getCrewMembers(id)])
      .then(([crewValue, history, memberPage]) => {
        if (!active) return;
        if (!crewValue.viewer?.canAccessChat) { navigate(`/crew/${id}`, { replace: true }); return; }
        setCrew(crewValue);
        setMessages(history.items || []);
        setBeforeId(history.nextBeforeId);
        setHasMore(history.hasMore);
        setMembers(crewPageItems(memberPage));
        connectionRef.current = connectCrewChat({
          crewId: id,
          onConnectionChange: setConnected,
          onMessage: (message) => setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]),
          onError: () => setConnected(false),
        });
      })
      .catch((error) => { window.alert(getApiErrorMessage(error, ko ? "채팅방에 들어갈 수 없습니다." : "Could not open chat.")); navigate(`/crew/${id}`, { replace: true }); })
      .finally(() => active && setLoading(false));
    return () => { active = false; connectionRef.current?.disconnect(); };
  }, [id, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: messages.length > 50 ? "smooth" : "auto" }); }, [messages.length]);

  const loadOlder = async () => {
    if (!hasMore || !beforeId) return;
    try {
      const history = await getCrewMessages(id, { beforeId });
      setMessages((current) => [...(history.items || []), ...current]);
      setBeforeId(history.nextBeforeId);
      setHasMore(history.hasMore);
    } catch (error) { window.alert(getApiErrorMessage(error)); }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!text.trim() || !connected || !crew?.recruiting) return;
    connectionRef.current?.send({ type: "TEXT", content: text.trim() });
    setText("");
  };

  const sendImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !connected || !crew?.recruiting) return;
    setUploading(true);
    try {
      const uploaded = await uploadPostImages([file]);
      const imageUrl = uploaded?.[0]?.imageUrl;
      if (!imageUrl) throw new Error();
      connectionRef.current?.send({ type: "IMAGE", content: imageUrl });
    } catch (error) { window.alert(getApiErrorMessage(error, ko ? "사진을 보내지 못했습니다." : "Could not send photo.")); }
    finally { setUploading(false); }
  };

  const kick = async (member) => {
    if (!window.confirm(ko ? `${member.nickname}님을 내보낼까요? 다시 참여할 수 없습니다.` : `Remove ${member.nickname}? They cannot rejoin.`)) return;
    try { await kickCrewMember(id, member.userId); await loadMembers(); }
    catch (error) { window.alert(getApiErrorMessage(error)); }
  };

  if (loading || !crew) return <main className="flex min-h-screen items-center justify-center bg-sky-50 pt-20 dark:bg-slate-950"><Loader2 className="animate-spin text-primary" size={34} /></main>;

  return (
    <main className="h-screen overflow-hidden bg-sky-50 pt-20 dark:bg-slate-950">
      <div className="mx-auto flex h-[calc(100vh-5rem)] max-w-5xl flex-col border-x border-border bg-card shadow-2xl">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-6">
          <button type="button" onClick={() => navigate(`/crew/${id}`)} className="text-muted hover:text-primary"><ArrowLeft size={22} /></button>
          <img src={crew.coverImageUrl || DEFAULT_CREW_IMAGE} alt="" className="h-10 w-10 rounded-xl object-cover" />
          <div className="min-w-0 flex-1"><h1 className="truncate text-sm font-extrabold text-title">{crew.title}</h1><p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted"><span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-400"}`} />{!crew.recruiting ? (ko ? "종료된 크루 · 읽기 전용" : "Ended · read only") : connected ? (ko ? "실시간 연결됨" : "Live") : (ko ? "다시 연결하는 중" : "Reconnecting")}</p></div>
          <button type="button" onClick={() => setMembersOpen(true)} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-secondary hover:text-primary" aria-label={ko ? "참여자 보기" : "View members"}><Users size={20} /><span className="absolute -right-0.5 -top-0.5 rounded-full bg-primary px-1.5 text-[9px] font-bold text-white">{members.length}</span></button>
        </header>

        <section className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/70 to-white px-4 py-5 dark:from-slate-950 dark:to-slate-950 sm:px-8">
          {hasMore && <div className="mb-5 text-center"><button type="button" onClick={loadOlder} className="rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-muted shadow-sm">{ko ? "이전 대화 불러오기" : "Load older messages"}</button></div>}
          {messages.length === 0 && <div className="mx-auto mt-20 max-w-sm text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-primary dark:bg-teal-950/30"><Menu size={25} /></div><p className="mt-4 font-extrabold text-title">{ko ? "첫 인사를 건네보세요" : "Start the conversation"}</p><p className="mt-1 text-sm leading-6 text-muted">{ko ? "새로 참여한 사람도 이곳의 이전 대화를 함께 볼 수 있어요." : "Future members can also see the conversation history."}</p></div>}
          {messages.map((message, index) => {
            const mine = String(message.senderId) === String(me?.id);
            const previous = messages[index - 1];
            const dayChanged = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
            const sameSender = previous && previous.senderId === message.senderId && !dayChanged;
            return <div key={message.id}>{dayChanged && <div className="my-6 flex items-center gap-3"><span className="h-px flex-1 bg-border" /><span className="rounded-full bg-card px-3 py-1 text-[10px] font-semibold text-muted shadow-sm">{messageDay(message.createdAt, currentLang)}</span><span className="h-px flex-1 bg-border" /></div>}<div className={`mb-2 flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>{!mine && <div className="w-8 self-start">{!sameSender && <UserAvatar src={message.senderProfileImageUrl} className="h-8 w-8 rounded-full object-cover" />}</div>}<div className={`max-w-[76%] ${mine ? "items-end" : "items-start"}`}>{!mine && !sameSender && <p className="mb-1 ml-1 text-[11px] font-bold text-muted">{message.senderNickname}</p>}<div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>{message.type === "IMAGE" ? <a href={message.content} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><img src={message.content} alt={ko ? "채팅 사진" : "Chat attachment"} className="max-h-80 max-w-full object-cover" /></a> : <p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-6 shadow-sm ${mine ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-border bg-card text-foreground"}`}>{message.content}</p>}<span className="mb-0.5 shrink-0 text-[9px] text-muted">{messageTime(message.createdAt, currentLang)}</span></div></div></div></div>;
          })}
          <div ref={bottomRef} />
        </section>

        <footer className="shrink-0 border-t border-border bg-card p-3 sm:p-4">{crew.recruiting ? <form onSubmit={sendMessage} className="mx-auto flex max-w-4xl items-end gap-2"><label className={`flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-border text-muted transition hover:border-primary hover:text-primary ${(!connected || uploading) ? "pointer-events-none opacity-40" : ""}`}>{uploading ? <Loader2 className="animate-spin" size={19} /> : <ImagePlus size={20} />}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={sendImage} className="hidden" /></label><textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(event); } }} maxLength={1000} rows={1} placeholder={connected ? (ko ? "메시지를 입력하세요" : "Write a message") : (ko ? "연결 중..." : "Connecting...")} className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" /><button type="submit" disabled={!connected || !text.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"><Send size={18} /></button></form> : <p className="py-2 text-center text-sm font-semibold text-muted">{ko ? "종료된 크루의 대화 기록입니다." : "This crew has ended. Chat history is read only."}</p>}</footer>
      </div>

      {membersOpen && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35" onClick={() => setMembersOpen(false)}><aside className="h-full w-full max-w-sm bg-card p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><header className="flex items-center justify-between"><div><h2 className="text-xl font-extrabold text-title">{ko ? "참여자" : "Members"}</h2><p className="mt-1 text-xs text-muted">{members.length} / {crew.capacity}</p></div><button type="button" onClick={() => setMembersOpen(false)} className="text-muted"><X /></button></header><div className="mt-6 space-y-2">{members.map((member) => <div key={member.userId} className="flex items-center gap-3 rounded-2xl border border-border p-3"><UserAvatar src={member.profileImageUrl} className="h-11 w-11 rounded-full object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-title">{member.nickname}</p><p className="mt-0.5 text-[11px] font-semibold text-muted">{member.role === "OWNER" ? (ko ? "크루장" : "Owner") : (ko ? "참여자" : "Member")}</p></div>{crew.viewer?.owner && member.role !== "OWNER" && crew.recruiting && <button type="button" onClick={() => kick(member)} className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30" aria-label={ko ? "참여자 내보내기" : "Remove member"}><UserMinus size={18} /></button>}</div>)}</div></aside></div>}
    </main>
  );
}
