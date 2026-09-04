import { useEffect, useMemo, useState } from "react";

import {
  CalendarDays,
  Plus,
  Users,
  X,
  Send,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";

import { getLocale, translate } from "../i18n";
import useLangStore from "../store/useLangStore";

const sampleCrews = [
  {
    id: "sample-1",
    title: {
      ko: "7월 서울 성수동 빈티지 투어 같이 해요",
      en: "July vintage tour in Seongsu, Seoul",
    },
    regionName: {
      ko: "서울",
      en: "Seoul",
    },
    country: "🇰🇷",
    tags: ["성수동", "빈티지"],
    travelDate: "2026-08-08",
    capacity: 8,
    memberCount: 4,
    image:
      "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=220&fit=crop",
  },
  {
    id: "sample-2",
    title: {
      ko: "도쿄 야키토리 골목 투어 하실 분?",
      en: "Join a Tokyo yakitori alley tour",
    },
    regionName: {
      ko: "도쿄",
      en: "Tokyo",
    },
    country: "🇯🇵",
    tags: ["도쿄", "야키토리"],
    travelDate: "2026-08-15",
    capacity: 10,
    memberCount: 6,
    image:
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=220&fit=crop",
  },
  {
    id: "sample-3",
    title: {
      ko: "제주 올레길 1코스 - 외국인 친구와 같이!",
      en: "Jeju Olle Trail Route 1 with international friends",
    },
    regionName: {
      ko: "제주",
      en: "Jeju",
    },
    country: "🇰🇷",
    tags: ["올레길", "외국인환영"],
    travelDate: "2026-08-22",
    capacity: 6,
    memberCount: 3,
    image: "/jeju-olle-trail.png",
  },
];

const crewImage = (crew) =>
  crew?.image ||
  crew?.coverImageUrl ||
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=220&fit=crop";

const getRegionName = (crew, language) =>
  crew?.regionName?.[language] ||
  crew?.regionName?.ko ||
  crew?.regionName ||
  crew?.region ||
  "";

const getCrewTitle = (crew, language) =>
  crew?.title?.[language] ||
  crew?.title?.ko ||
  crew?.title ||
  "";

const formatTravelDate = (value, language) => {
  if (!value) {
    return translate(language, "crew.ongoing");
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

export default function CrewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentLang } = useLangStore();

  // 내가 참여한 크루
  const [joined, setJoined] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("joinedCrews") || "[]"
      );
    } catch {
      return [];
    }
  });

  // 내가 만든 크루
  const [createdCrews, setCreatedCrews] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("crews") || "[]"
      );
    } catch {
      return [];
    }
  });

  // 현재 열려 있는 채팅 크루
  const [activeChatCrew, setActiveChatCrew] = useState(null);

  // 채팅 메시지
  const [messages, setMessages] = useState([
    {
      id: 1,
      senderKey: "crew.manager",
      textKey: "crew.welcomeMessage",
      time: "15:30",
      isMe: false,
    },
    {
      id: 2,
      senderKey: "crew.me",
      textKey: "crew.helloMessage",
      time: "15:33",
      isMe: true,
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");

  const keyword = (searchParams.get("q") || "")
    .trim()
    .toLowerCase();

  const t = (key, variables) =>
    translate(currentLang, key, variables);

  // =========================
  // localStorage 크루 다시 읽기
  // =========================
  useEffect(() => {
    const loadCrews = () => {
      try {
        const storedCrews = JSON.parse(
          localStorage.getItem("crews") || "[]"
        );

        const storedJoined = JSON.parse(
          localStorage.getItem("joinedCrews") || "[]"
        );

        setCreatedCrews(
          Array.isArray(storedCrews) ? storedCrews : []
        );

        setJoined(
          Array.isArray(storedJoined) ? storedJoined : []
        );
      } catch (error) {
        console.error("Failed to load crews:", error);

        setCreatedCrews([]);
        setJoined([]);
      }
    };

    // 처음 페이지에 들어왔을 때
    loadCrews();

    // 다른 페이지에서 크루가 변경되었을 때
    window.addEventListener("crewChanged", loadCrews);

    return () => {
      window.removeEventListener(
        "crewChanged",
        loadCrews
      );
    };
  }, []);

  // =========================
  // 마이페이지에서
  // "오픈채팅방 입장"으로 들어왔을 때
  // =========================
  useEffect(() => {
    const openChatCrew = location.state?.openChatCrew;

    if (!openChatCrew) {
      return;
    }

    setActiveChatCrew(openChatCrew);

    // state 제거
    navigate("/crew", {
      replace: true,
      state: null,
    });
  }, [location.state, navigate]);

  // =========================
  // 화면에 보여줄 크루
  // =========================
  const visibleCrews = useMemo(() => {
    const allCrews = [
      ...createdCrews,
      ...sampleCrews,
    ];

    // 같은 ID 중복 제거
    const uniqueCrews = Array.from(
      new Map(
        allCrews.map((crew) => [
          String(crew.id),
          crew,
        ])
      ).values()
    );

    return uniqueCrews.filter((crew) => {
      if (!keyword) {
        return true;
      }

      const regionNames =
        typeof crew?.regionName === "object"
          ? Object.values(crew.regionName).join(" ")
          : crew?.regionName ||
            crew?.region ||
            "";

      const searchable = `
        ${getCrewTitle(crew, currentLang)}
        ${regionNames}
        ${(crew?.tags || []).join(" ")}
      `
        .toLowerCase()
        .trim();

      return searchable.includes(keyword);
    });
  }, [createdCrews, currentLang, keyword]);

  // =========================
  // 크루 참여하기
  // =========================
  const handleJoin = (crew) => {
    const currentJoined = (() => {
      try {
        const value = JSON.parse(
          localStorage.getItem("joinedCrews") || "[]"
        );

        return Array.isArray(value) ? value : [];
      } catch {
        return [];
      }
    })();

    const alreadyJoined = currentJoined.some(
      (item) => {
        const id =
          item && typeof item === "object"
            ? item.id
            : item;

        return (
          String(id) === String(crew.id)
        );
      }
    );

    if (alreadyJoined) {
      return;
    }

    // 현재 구조에서는 크루 객체를 저장
    // → 샘플 크루도 마이페이지에서 표시 가능
    const nextJoined = [
      ...currentJoined,
      crew,
    ];

    localStorage.setItem(
      "joinedCrews",
      JSON.stringify(nextJoined)
    );

    setJoined(nextJoined);

    // 마이페이지 등에 변경사항 알림
    window.dispatchEvent(
      new Event("crewChanged")
    );
  };

  // =========================
  // 메시지 전송
  // =========================
  const handleSend = (e) => {
    e.preventDefault();

    if (!inputMessage.trim()) {
      return;
    }

    const newMessage = {
      id: Date.now(),
      senderKey: "crew.me",
      text: inputMessage,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isMe: true,
    };

    setMessages((current) => [
      ...current,
      newMessage,
    ]);

    setInputMessage("");
  };

  return (
    <main className="w-full bg-sky-50 min-h-screen relative">
      <div className="pt-24 pb-6">
        <section className="mx-auto max-w-7xl px-6 py-8">

          {/* 제목 */}
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {t("crew.pageTitle")}
              </h1>

              <p className="mt-0.5 text-sm text-muted">
                {t("crew.pageDescription")}
              </p>
            </div>

            {/* 크루 만들기 */}
            <button
              type="button"
              onClick={() => navigate("create")}
              className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primaryHover"
            >
              <Plus size={14} />
              {t("crew.create")}
            </button>
          </div>

          {/* 크루 목록 */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleCrews.map((crew) => {
              const memberCount =
                crew?.memberCount ??
                crew?.currentMembers ??
                1;

              const capacity =
                crew?.capacity ??
                crew?.maxMembers ??
                2;

              const travelDate =
                crew?.travelDate ??
                crew?.date ??
                "";

              // 내가 만든 크루인지 확인
              const isMine = createdCrews.some(
                (createdCrew) =>
                  String(createdCrew.id) ===
                  String(crew.id)
              );

              const percent =
                capacity > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (memberCount / capacity) *
                          100
                      )
                    )
                  : 0;

              // ID 저장 / 객체 저장 모두 대응
              const isJoined = joined.some(
                (item) => {
                  const id =
                    item &&
                    typeof item === "object"
                      ? item.id
                      : item;

                  return (
                    String(id) ===
                    String(crew.id)
                  );
                }
              );

              return (
                <article
                  key={crew.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* 이미지 */}
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={crewImage(crew)}
                      alt={getCrewTitle(
                        crew,
                        currentLang
                      )}
                      className="h-full w-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src =
                          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=220&fit=crop";
                      }}
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                    <span className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {crew.country}{" "}
                      {getRegionName(
                        crew,
                        currentLang
                      )}
                    </span>
                  </div>

                  {/* 내용 */}
                  <div className="relative p-4">
                    <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">
                      {getCrewTitle(
                        crew,
                        currentLang
                      )}
                    </p>

                    {/* 태그 */}
                    <div className="mb-3 flex flex-wrap gap-1">
                      {(crew?.tags || []).map(
                        (tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-secondary px-2 py-0.5 text-xs text-primary"
                          >
                            #{tag}
                          </span>
                        )
                      )}
                    </div>

                    {/* 인원 / 날짜 */}
                    <div className="mb-3">
                      <div className="mb-1 flex justify-between text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Users size={10} />

                          {t(
                            "crew.memberCount",
                            {
                              current:
                                memberCount,
                              capacity,
                            }
                          )}
                        </span>

                        <span className="flex items-center gap-1">
                          <CalendarDays
                            size={10}
                          />

                          {formatTravelDate(
                            travelDate,
                            currentLang
                          )}
                        </span>
                      </div>

                      {/* 인원 게이지 */}
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${percent}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* 참여 버튼 */}
                    <button
                      type="button"
                      onClick={() =>
                        handleJoin(crew)
                      }
                      disabled={
                        isJoined || percent >= 100
                      }
                      className={`w-full rounded-xl py-2 text-sm font-medium text-white transition-all ${
                        isJoined || percent >= 100
                          ? "cursor-default bg-gray-400"
                          : "bg-primary hover:bg-primaryHover"
                      }`}
                    >
                      {isJoined
                        ? "참여완료"
                        : percent >= 100
                        ? "모집마감"
                        : "참여하기"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* 검색 결과 없음 */}
          {visibleCrews.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
              {t("crew.empty")}
            </p>
          )}
        </section>
      </div>

      {/* 채팅 모달 */}
      {activeChatCrew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex h-[650px] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#b2c7d9] shadow-2xl animate-in fade-in zoom-in-95 duration-200">

            {/* 채팅 헤더 */}
            <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
              <div>
                <h2 className="line-clamp-1 text-sm font-bold text-gray-800">
                  {getCrewTitle(
                    activeChatCrew,
                    currentLang
                  )}
                </h2>

                <span className="text-[11px] text-gray-400">
                  {t("crew.participants", {
                    count:
                      activeChatCrew?.memberCount ??
                      activeChatCrew?.currentMembers ??
                      1,
                  })}
                </span>
              </div>

              {/* 채팅 닫기 */}
              <button
                type="button"
                onClick={() =>
                  setActiveChatCrew(null)
                }
                aria-label={t(
                  "crew.closeChat"
                )}
                className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </header>

            {/* 메시지 */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="flex justify-center">
                <span className="rounded-full bg-black/10 px-3 py-1 text-xs text-white">
                  2026년 9월 1일 화요일
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${
                    msg.isMe
                      ? "flex-row-reverse"
                      : "flex-row"
                  }`}
                >
                  {!msg.isMe && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700">
                      {t(msg.senderKey)?.[0]}
                    </div>
                  )}

                  <div
                    className={`flex flex-col ${
                      msg.isMe
                        ? "items-end"
                        : "items-start"
                    }`}
                  >
                    {!msg.isMe && (
                      <span className="mb-1 text-xs text-gray-600">
                        {t(msg.senderKey)}
                      </span>
                    )}

                    <div
                      className={`flex items-end gap-1.5 ${
                        msg.isMe
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <div
                        className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          msg.isMe
                            ? "rounded-tr-none bg-[#fee500] text-gray-900"
                            : "rounded-tl-none bg-white text-gray-900"
                        }`}
                      >
                        {msg.textKey
                          ? t(msg.textKey)
                          : msg.text}
                      </div>

                      <span className="text-[10px] text-gray-500">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 메시지 입력 */}
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t border-gray-200 bg-[#f7f7f7] px-4 py-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) =>
                  setInputMessage(e.target.value)
                }
                placeholder={t(
                  "crew.messagePlaceholder"
                )}
                className="flex-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-[#fee500]"
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
