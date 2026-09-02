import { useMemo, useState } from "react";
import { CalendarDays, Plus, Users, X, Send } from "lucide-react";
import { useSearchParams } from "react-router";
import { getLocale, translate } from "../i18n";
import useLangStore from "../store/useLangStore";

// [데이터] 화면에 표시할 샘플 크루(여행 동행 모임) 목록입니다.
const sampleCrews = [
    {
        id: "sample-1",
        title: "7월 서울 성수동 빈티지 투어 같이 해요",
        regionName: { ko: "서울", en: "Seoul" },
        country: "🇰🇷",
        tags: ["성수동", "빈티지"],
        travelDate: "2026-08-08",
        capacity: 8,
        memberCount: 4,
        image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=220&fit=crop",
    },
    {
        id: "sample-2",
        title: "도쿄 야키토리 골목 투어 하실 분?",
        regionName: { ko: "도쿄", en: "Tokyo" },
        country: "🇯🇵",
        tags: ["도쿄", "야키토리"],
        travelDate: "2026-08-15",
        capacity: 10,
        memberCount: 6,
        image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=220&fit=crop",
    },
    {
        id: "sample-3",
        title: "제주 올레길 1코스 - 외국인 친구와 같이!",
        regionName: { ko: "제주", en: "Jeju" },
        country: "🇰🇷",
        tags: ["올레길", "외국인환영"],
        travelDate: "2026-08-22",
        capacity: 6,
        memberCount: 3,
        image: "/jeju-olle-trail.png",
    },
];

const crewImage = (crew) =>
    crew.image ||
    crew.coverImageUrl ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=220&fit=crop";

const getRegionName = (crew, language) => crew.regionName?.[language] || crew.regionName?.ko || crew.regionName || "";

const formatTravelDate = (value, language) => {
    if (!value) return translate(language, "crew.ongoing");
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(getLocale(language), {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
};

export default function CrewPage() {
    const [searchParams] = useSearchParams();
    const { currentLang } = useLangStore();

    const [joined, setJoined] = useState([]);

    // 💡 현재 모달로 열려 있는 크루 정보를 관리하는 상태 (null이면 모달 닫힘)
    const [activeChatCrew, setActiveChatCrew] = useState(null);

    // 채팅 메시지 상태
    const [messages, setMessages] = useState([
        { id: 1, sender: "매니저", text: "안녕하세요! 오픈채팅방입니다.", time: "오후 3:30", isMe: false },
        { id: 2, sender: "나", text: "반가워요!", time: "오후 3:33", isMe: true },
    ]);
    const [inputMessage, setInputMessage] = useState("");

    const keyword = (searchParams.get("q") || "").trim().toLowerCase();
    const t = (key, variables) => translate(currentLang, key, variables);

    const visibleCrews = useMemo(() => {
        return sampleCrews.filter((crew) => {
            if (!keyword) return true;
            const regionNames = Object.values(crew.regionName || {}).join(" ");
            const searchable = `${crew.title} ${regionNames} ${crew.tags.join(" ")}`.toLowerCase();
            return searchable.includes(keyword);
        });
    }, [keyword]);

    // '참여하기' 버튼 클릭 시 상태 변경 및 채팅 모달 열기
    const handleJoin = (crew) => {
        setJoined((current) =>
            current.includes(crew.id) ? current : [...current, crew.id]
        );
        setActiveChatCrew(crew); // 모달 오픈
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const newMessage = {
            id: Date.now(),
            sender: "나",
            text: inputMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
        };

        setMessages([...messages, newMessage]);
        setInputMessage("");
    };

    return (
        <main className="w-full bg-sky-50 min-h-screen relative">
            <div className="pt-24 pb-6">
                <section className="mx-auto max-w-7xl px-6 py-8">
                    <div className="mb-6 flex items-end justify-between">
                        <div>
                            <h1 className="text-xl font-bold text-foreground">{t("crew.pageTitle")}</h1>
                            <p className="mt-0.5 text-sm text-muted">{t("crew.pageDescription")}</p>
                        </div>
                        <button
                            type="button"
                            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primaryHover"
                        >
                            <Plus size={14} />
                            {t("crew.create")}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {visibleCrews.map((crew) => {
                            const memberCount = crew.memberCount ?? 1;
                            const capacity = crew.capacity ?? 2;
                            const percent = Math.min(100, Math.round((memberCount / capacity) * 100));
                            const isJoined = joined.includes(crew.id);

                            return (
                                <article
                                    key={crew.id}
                                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                                >
                                    <div className="relative h-36 overflow-hidden">
                                        <img src={crewImage(crew)} alt={crew.title} className="h-full w-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                        <span className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                          {crew.country} {getRegionName(crew, currentLang)}
                        </span>
                                    </div>

                                    <div className="p-4">
                                        <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{crew.title}</p>

                                        <div className="mb-3 flex flex-wrap gap-1">
                                            {crew.tags.map((tag) => (
                                                <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-primary">
                                #{tag}
                              </span>
                                            ))}
                                        </div>

                                        <div className="mb-3">
                                            <div className="mb-1 flex justify-between text-xs text-muted">
                            <span className="flex items-center gap-1">
                              <Users size={10} />
                                {t("crew.memberCount", { current: memberCount, capacity })}
                            </span>
                                                <span className="flex items-center gap-1">
                              <CalendarDays size={10} />
                                                    {formatTravelDate(crew.travelDate, currentLang)}
                            </span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                                <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleJoin(crew)}
                                            className="w-full rounded-xl py-2 text-sm font-medium transition-all bg-primary text-white hover:bg-primaryHover"
                                        >
                                            {isJoined ? "채팅방 참여중" : t("crew.join")}
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {visibleCrews.length === 0 && (
                        <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{t("crew.empty")}</p>
                    )}
                </section>
            </div>

            {/* 💡 크루 페이지 위에 예쁘게 뜨는 카카오톡 스타일 채팅 모달 팝업 */}
            {activeChatCrew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="flex flex-col h-[650px] w-full max-w-lg rounded-2xl overflow-hidden bg-[#b2c7d9] shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                        {/* 모달 헤더 */}
                        <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
                            <div>
                                <h2 className="text-sm font-bold text-gray-800 line-clamp-1">{activeChatCrew.title}</h2>
                                <span className="text-[11px] text-gray-400">참여자 {activeChatCrew.memberCount}명</span>
                            </div>
                            <button
                                onClick={() => setActiveChatCrew(null)}
                                className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        {/* 메시지 리스트 영역 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="flex justify-center">
                    <span className="rounded-full bg-black/10 px-3 py-1 text-xs text-white">
                      2026년 9월 1일 화요일
                    </span>
                            </div>

                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-2 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}
                                >
                                    {!msg.isMe && (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700">
                                            {msg.sender[0]}
                                        </div>
                                    )}
                                    <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                                        {!msg.isMe && <span className="mb-1 text-xs text-gray-600">{msg.sender}</span>}
                                        <div className={`flex items-end gap-1.5 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}>
                                            <div
                                                className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm ${
                                                    msg.isMe
                                                        ? "bg-[#fee500] text-gray-900 rounded-tr-none"
                                                        : "bg-white text-gray-900 rounded-tl-none"
                                                }`}
                                            >
                                                {msg.text}
                                            </div>
                                            <span className="text-[10px] text-gray-500">{msg.time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 하단 입력창 */}
                        <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#f7f7f7] px-4 py-3 border-t border-gray-200">
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="메시지를 입력하세요..."
                                className="flex-1 rounded-full bg-white px-4 py-2 text-sm outline-none border border-gray-200 focus:border-[#fee500]"
                            />
                            <button
                                type="submit"
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fee500] text-gray-900 hover:bg-[#fdd800]"
                            >
                                <Send size={16} />
                            </button>
                        </form>

                    </div>
                </div>
            )}
        </main>
    );
}