import { useMemo, useState } from "react";
import { CalendarDays, Plus, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import { getLocale, translate } from "../i18n";
import useLangStore from "../store/useLangStore";
// import useRegionStore from "../store/useRegionStore";

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

// [유틸 함수] 크루 이미지 주소가 없을 경우 대체(fallback) 이미지를 반환합니다.
const crewImage = (crew) =>
    crew.image ||
    crew.coverImageUrl ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=220&fit=crop";

// [유틸 함수] 현재 설정된 언어(ko, en 등)에 맞춰 지역 이름을 가져옵니다.
const getRegionName = (crew, language) => crew.regionName?.[language] || crew.regionName?.ko || crew.regionName || "";

// [유틸 함수] 날짜 문자열을 사용자의 언어 및 지역(Locale)에 맞는 형식으로 변환합니다.
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
  // Figma 시안 확인용 샘플 크루 3개를 고정으로 표시합니다.

  // URL의 쿼리 스트링(예: ?q=검색어)을 읽어오기 위한 훅
  const [searchParams] = useSearchParams();

  // 전역 상태 스토어에서 현재 언어 상태를 가져옴
  const { currentLang } = useLangStore();
  // const { selectedRegion, setSelectedRegion } = useRegionStore();

  // 사용자가 '참여하기'를 누른 크루의 ID들을 관리하는 상태 (토글 방식)
  const [joined, setJoined] = useState([]);

  // URL에서 검색어(q)를 추출하고, 소문자 및 공백 제거 처리
  const keyword = (searchParams.get("q") || "").trim().toLowerCase();

  // 다국어 번역 함수 숏컷 (예: t("crew.pageTitle"))
  const t = (key, variables) => translate(currentLang, key, variables);

  // [메모이제이션] 검색어(keyword)가 바뀔 때만 화면에 보여줄 크루 목록을 필터링합니다.
  const visibleCrews = useMemo(() => {
    return sampleCrews.filter((crew) => {
      if (!keyword) return true; // 검색어가 없으면 모든 크루 표시
      const regionNames = Object.values(crew.regionName || {}).join(" ");
      const searchable = `${crew.title} ${regionNames} ${crew.tags.join(" ")}`.toLowerCase();
      return searchable.includes(keyword); // 제목, 지역, 태그 중에 검색어가 포함되어 있는지 확인
    });
  }, [keyword]);

  // '참여하기' 버튼 클릭 시 호출되는 함수 (참여 상태 추가/취소 처리)
  const handleJoin = (crew) => {
    setJoined((current) => (current.includes(crew.id) ? current.filter((id) => id !== crew.id) : [...current, crew.id]));
  };

  return (
      <main className="w-full bg-sky-50">
        <div className="pt-24 pb-6">

          <section className="mx-auto max-w-7xl px-6 py-8">
            {/* 상단 타이틀 및 크루 생성 버튼 영역 */}
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

            {/* 크루 카드 목록 그리드 영역 */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {visibleCrews.map((crew) => {
                const memberCount = crew.memberCount ?? 1;
                const capacity = crew.capacity ?? 2;
                // 모임 정원 대비 현재 참여 인원 비율 계산 (최대 100%)
                const percent = Math.min(100, Math.round((memberCount / capacity) * 100));
                const isJoined = joined.includes(crew.id);

                return (
                    <article
                        key={crew.id}
                        className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* 카드 상단 이미지 및 국가/지역 배지 */}
                      <div className="relative h-36 overflow-hidden">
                        <img src={crewImage(crew)} alt={crew.title} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                        <span className="absolute bottom-2 left-3 rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm">
                      {crew.country} {getRegionName(crew, currentLang)}
                    </span>
                      </div>

                      {/* 카드 본문 내용 */}
                      <div className="p-4">
                        {/* 크루 제목 */}
                        <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{crew.title}</p>

                        {/* 태그 목록 */}
                        <div className="mb-3 flex flex-wrap gap-1">
                          {crew.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-primary">
                          #{tag}
                        </span>
                          ))}
                        </div>

                        {/* 인원 현황 및 여행 날짜 정보 */}
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
                          {/* 인원 참여율 프로그레스 바 */}
                          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
                          </div>
                        </div>

                        {/* 참여하기 / 참여 취소 버튼 */}
                        <button
                            type="button"
                            onClick={() => handleJoin(crew)}
                            className={`w-full rounded-xl py-2 text-sm font-medium transition-all ${
                                isJoined
                                    ? "border border-primary/20 bg-secondary text-primary"
                                    : "bg-primary text-white hover:bg-primaryHover"
                            }`}
                        >
                          {isJoined ? t("crew.joined") : t("crew.join")}
                        </button>
                      </div>
                    </article>
                );
              })}
            </div>

            {/* 검색 결과나 크루가 없을 때 보여주는 빈 상태(Empty state) 안내 */}
            {visibleCrews.length === 0 && (
                <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{t("crew.empty")}</p>
            )}
          </section>
        </div>
      </main>
  );
}