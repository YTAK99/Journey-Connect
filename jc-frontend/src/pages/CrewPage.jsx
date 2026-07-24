import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Users } from "lucide-react";
import LocationWeather from "../components/LocationWeather";
import { getApiErrorMessage } from "../services/apiClient";
import { isLogin } from "../services/auth";
import { getCrews, joinCrew } from "../services/crewApi";
import useRegionStore from "../store/useRegionStore";

const fallbackCrews = [
  {
    id: "sample-1",
    title: "7월 서울 성수 빈티지 투어 같이 해요",
    regionName: "서울",
    description: "성수동에서 만나 카페와 편집숍을 천천히 둘러보는 반나절 코스입니다.",
    travelDate: "2026-07-27",
    capacity: 8,
    memberCount: 4,
    image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=220&fit=crop",
  },
  {
    id: "sample-2",
    title: "도쿄 시모키타자와 골목 투어",
    regionName: "도쿄",
    description: "도쿄 감성 골목에서 맛집을 같이 먹고 산책하는 크루입니다.",
    travelDate: "2026-08-03",
    capacity: 10,
    memberCount: 6,
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=220&fit=crop",
  },
  {
    id: "sample-3",
    title: "제주 올레길 1코스 같이 걷기",
    regionName: "제주",
    description: "가볍게 걷고 사진 찍는 일정입니다. 초보자도 부담 없는 코스입니다.",
    travelDate: "2026-08-10",
    capacity: 6,
    memberCount: 3,
    image: "https://images.unsplash.com/photo-1590736969596-701f0a18e6f0?w=400&h=220&fit=crop",
  },
];

const crewImage = (crew) =>
  crew.image ||
  crew.coverImageUrl ||
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&h=220&fit=crop";

const matchesRegion = (item, region) => {
  const regionTerms = [region.label.ko, region.label.en, region.id]
    .filter(Boolean)
    .map((term) => String(term).toLowerCase());
  const searchableRegion = `${item.regionName || ""} ${item.region?.name || ""} ${item.regionCode || ""}`.toLowerCase();
  return regionTerms.some((term) => searchableRegion.includes(term));
};

export default function CrewPage() {
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const [crews, setCrews] = useState([]);
  const [joined, setJoined] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchCrews = async () => {
      try {
        const result = await getCrews({ size: 20 });
        const items = result?.items || result?.content || [];
        if (active) setCrews(items.length > 0 ? items : fallbackCrews);
      } catch (requestError) {
        if (!active) return;
        setCrews(fallbackCrews);
        setError(getApiErrorMessage(requestError, "크루 API를 불러오지 못해 샘플 카드를 표시합니다."));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCrews();

    return () => {
      active = false;
    };
  }, []);

  const visibleCrews = useMemo(() => {
    return crews.filter((crew) => matchesRegion(crew, selectedRegion));
  }, [crews, selectedRegion]);

  const handleJoin = async (crew) => {
    if (String(crew.id).startsWith("sample-")) {
      setJoined((current) => (current.includes(crew.id) ? current.filter((id) => id !== crew.id) : [...current, crew.id]));
      return;
    }

    if (!isLogin()) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      await joinCrew(crew.id);
      setJoined((current) => [...current, crew.id]);
    } catch (requestError) {
      alert(getApiErrorMessage(requestError, "크루 참여에 실패했습니다."));
    }
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
              <h1 className="text-xl font-bold text-foreground">크루 · 모임</h1>
              <p className="mt-0.5 text-sm text-muted">선택한 지역의 여행자들과 함께하세요.</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primaryHover">
              <Plus size={14} />
              크루 만들기
            </button>
          </div>

          {error && <p className="mb-4 text-sm text-amber-700">{error}</p>}
          {loading && <p className="py-10 text-center text-muted">크루를 불러오는 중입니다.</p>}

          {!loading && (
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
                        {crew.regionName || "지역 미정"}
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="mb-2 line-clamp-2 text-sm font-semibold text-foreground">{crew.title}</p>
                      <p className="mb-3 line-clamp-2 text-xs leading-5 text-muted">{crew.description}</p>

                      <div className="mb-3">
                        <div className="mb-1 flex justify-between text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Users size={10} />
                            {memberCount}/{capacity}명
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarDays size={10} />
                            {crew.travelDate || "상시"}
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
                        {isJoined ? "참여중" : "참여하기"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && visibleCrews.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
              선택한 지역의 크루가 없습니다.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
