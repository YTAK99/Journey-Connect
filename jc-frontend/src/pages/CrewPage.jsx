import { useMemo, useState } from "react";
import { CalendarDays, Plus, Users } from "lucide-react";
import { useSearchParams } from "react-router";
import LocationWeather from "../components/LocationWeather";
import { getLocale, translate } from "../i18n";
import useLangStore from "../store/useLangStore";
import useRegionStore from "../store/useRegionStore";

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
  // Figma 시안 확인용 샘플 크루 3개를 고정으로 표시합니다.
  const [searchParams] = useSearchParams();
  const { currentLang } = useLangStore();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const [joined, setJoined] = useState([]);
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

  const handleJoin = (crew) => {
    setJoined((current) => (current.includes(crew.id) ? current.filter((id) => id !== crew.id) : [...current, crew.id]));
  };

  return (
    <main className="min-h-screen bg-sky-50">
      <div className="pt-24 pb-6">
        <section className="mx-auto max-w-screen-xl space-y-4 bg-white px-6 py-5">
          <LocationWeather selectedRegion={selectedRegion} onRegionChange={setSelectedRegion} />
        </section>

        <section className="mx-auto max-w-5xl px-6 py-8">
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

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

          {visibleCrews.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">{t("crew.empty")}</p>
          )}
        </section>
      </div>
    </main>
  );
}
