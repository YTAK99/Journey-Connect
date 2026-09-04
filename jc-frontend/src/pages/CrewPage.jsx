import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, MapPin, Plus, Search, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { CREW_CATEGORIES, crewCategoryLabel, getStableCrewColor } from "../data/crewCategories";
import useTranslation from "../i18n/useTranslation";
import { isLogin } from "../services/auth";
import { getApiErrorMessage } from "../services/apiClient";
import { crewPageItems, getCrews } from "../services/crewApi";

const formatDate = (value, lang) => {
  if (!value) return lang === "ko" ? "날짜 협의" : "Date TBD";
  return new Intl.DateTimeFormat(lang === "ko" ? "ko-KR" : "en-US", {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
};

export default function CrewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentLang } = useTranslation();
  const ko = currentLang === "ko";
  const [category, setCategory] = useState("");
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const keyword = searchParams.get("q") || "";

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      getCrews({ keyword, category, size: 100 })
        .then((page) => active && setCrews(crewPageItems(page)))
        .catch((requestError) => active && setError(getApiErrorMessage(
          requestError, ko ? "크루를 불러오지 못했습니다." : "Could not load crews.",
        )))
        .finally(() => active && setLoading(false));
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [category, keyword, ko]);

  const handleCreate = () => {
    if (!isLogin()) {
      window.alert(ko ? "로그인 후 크루를 만들 수 있습니다." : "Please sign in to create a crew.");
      navigate("/login");
      return;
    }
    navigate("/crew/create");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white px-4 pb-20 pt-24 text-foreground dark:from-slate-950 dark:via-slate-950 dark:to-slate-950 sm:px-6 sm:pt-28">
      <section className="mx-auto max-w-screen-xl">
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">Journey crew</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-title sm:text-4xl">
              {ko ? "같이 떠날 크루를 찾아보세요" : "Find people to travel with"}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {ko ? "마음에 드는 여행 루트를 함께 경험할 새로운 동행을 만나보세요." : "Meet new companions for routes you want to experience."}
            </p>
          </div>
          <button type="button" onClick={handleCreate} className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition hover:-translate-y-0.5 hover:bg-primaryHover">
            <Plus size={17} /> {ko ? "크루 만들기" : "Create crew"}
          </button>
        </header>

        <div className="mb-7" aria-label={ko ? "카테고리 필터" : "Category filters"}>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {[{ value: "", ko: "전체", en: "All" }, ...CREW_CATEGORIES].map((item) => (
              <button key={item.value || "all"} type="button" onClick={() => setCategory(item.value)} className={`whitespace-nowrap rounded-xl border px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${category === item.value ? "border-primary bg-primary text-white shadow-sm" : "border-border bg-card text-muted hover:border-primary/40 hover:text-primary"}`}>
                {item[currentLang]}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />)}
          </div>
        )}

        {!loading && error && <div className="rounded-3xl border border-rose-200 bg-rose-50 p-10 text-center text-sm text-rose-600 dark:border-rose-900 dark:bg-rose-950/20">{error}</div>}

        {!loading && !error && crews.length === 0 && (
          <div className="rounded-3xl border border-dashed border-teal-200 bg-teal-50/60 px-6 py-16 text-center dark:border-teal-900 dark:bg-teal-950/20">
            <Search className="mx-auto text-teal-500" size={32} />
            <p className="mt-4 font-bold text-title">{ko ? "아직 조건에 맞는 크루가 없어요" : "No matching crews yet"}</p>
            <p className="mt-1 text-sm text-muted">{ko ? "첫 번째 크루를 만들어 여행을 시작해보세요." : "Create the first crew and start your journey."}</p>
          </div>
        )}

        {!loading && !error && crews.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {crews.map((crew) => {
              const percent = Math.min(100, Math.round((crew.memberCount / crew.capacity) * 100));
              const fallbackColor = getStableCrewColor(crew.id ?? crew.title);
              return (
                <article key={crew.id} onClick={() => navigate(`/crew/${crew.id}`)} className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal-950/10">
                  <div className="relative h-40 overflow-hidden" style={{ backgroundColor: fallbackColor }}>
                    {crew.coverImageUrl && <img src={crew.coverImageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold text-teal-700 backdrop-blur dark:bg-slate-900/90 dark:text-teal-300">
                      {crewCategoryLabel(crew.category, currentLang)}
                    </span>
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white"><MapPin size={14} /> {crew.regionName}</span>
                  </div>
                  <div className="p-4">
                    <h2 className="truncate text-base font-extrabold text-title" title={crew.title}>{crew.title}</h2>
                    <p className="mt-1.5 line-clamp-2 min-h-9 text-xs leading-[18px] text-muted">{crew.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-2 text-[11px] font-semibold text-muted">
                      <span className="inline-flex min-w-0 items-center gap-1"><CalendarDays size={13} className="shrink-0 text-primary" /><span className="truncate">{formatDate(crew.travelDate, currentLang)}</span></span>
                      <span className="inline-flex shrink-0 items-center gap-1"><Users size={13} className="text-primary" /> {crew.memberCount}/{crew.capacity}</span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="font-medium text-muted">{crew.approvalRequired ? (ko ? "승인제" : "Approval") : (ko ? "바로 참여" : "Instant")}</span>
                      <span className="inline-flex items-center gap-0.5 font-bold text-primary">{ko ? "자세히" : "Details"}<ChevronRight size={14} /></span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
