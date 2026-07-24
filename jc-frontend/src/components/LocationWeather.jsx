import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, MapPin, Plane, RefreshCw, Search, Sun, X } from "lucide-react";
import { getLocalTime, REGIONS } from "../data/regions";
import { getApiErrorMessage } from "../services/apiClient";
import { getGoogleLocationSummary } from "../services/googleLocationApi";
import useLangStore from "../store/useLangStore";

const getLocalDate = (timezone, lang) => {
  try {
    return new Date().toLocaleDateString(lang === "ko" ? "ko-KR" : "en-US", {
      timeZone: timezone,
      year: "numeric",
      month: lang === "ko" ? "numeric" : "short",
      day: "numeric",
      weekday: "short",
    });
  } catch {
    return "--";
  }
};

const getRegionQuery = (region, lang) => {
  const label = lang === "ko" ? region.label.ko : region.label.en;
  return `${label} ${region.country}`;
};

export function RegionPicker({ currentRegion, onSelect, onSearch, onClose }) {
  const [query, setQuery] = useState("");
  const { currentLang } = useLangStore();
  const filtered = REGIONS.filter((region) => {
    const q = query.toLowerCase();
    return region.label.ko.includes(query) || region.label.en.toLowerCase().includes(q);
  });

  const submitSearch = (event) => {
    event.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{currentLang === "ko" ? "지역 선택" : "Select Region"}</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={submitSearch} className="mb-4 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={currentLang === "ko" ? "도시명 검색..." : "Search city..."}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            {currentLang === "ko" ? "검색" : "Search"}
          </button>
        </form>

        <div className="max-h-72 space-y-1 overflow-y-auto">
          {filtered.map((region) => {
            const Icon = region.icon;
            const active = region.id === currentRegion.id;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => {
                  onSelect(region);
                  onSearch(getRegionQuery(region, currentLang));
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                  active ? "bg-teal-50 dark:bg-teal-950/40" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-primary">
                  <Icon size={17} />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {region.country} {currentLang === "ko" ? region.label.ko : region.label.en}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Sun size={11} />
                      {region.weather.temp}C · {currentLang === "ko" ? region.weather.conditionKo : region.weather.conditionEn}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Plane size={11} />
                      {currentLang === "ko" ? region.flightTime.ko : region.flightTime.en}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LocationWeather({ selectedRegion = REGIONS[0], onRegionChange = () => {} }) {
  const { currentLang } = useLangStore();
  const [tick, setTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [request, setRequest] = useState(() => ({
    id: 0,
    query: getRegionQuery(selectedRegion, currentLang),
  }));
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;

    getGoogleLocationSummary(request.query, currentLang === "ko" ? "ko" : "en")
      .then((data) => {
        if (!ignore) setSummary(data);
      })
      .catch((error) => {
        if (!ignore) {
          setSummary(null);
          setErrorMessage(getApiErrorMessage(error, currentLang === "ko" ? "지역 정보를 가져오지 못했습니다." : "Could not load location data."));
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [currentLang, request]);

  const runSearch = (nextQuery) => {
    setLoading(true);
    setErrorMessage("");
    setRequest((value) => ({
      id: value.id + 1,
      query: nextQuery,
    }));
  };

  const fallbackDate = getLocalDate(selectedRegion.timezone, currentLang);
  const fallbackTime = getLocalTime(selectedRegion.timezone);
  const fallbackFlightTime = currentLang === "ko" ? selectedRegion.flightTime.ko : selectedRegion.flightTime.en;
  const display = useMemo(() => {
    const temperature = summary?.weather?.temperatureDegrees;

    return {
      title: summary?.place?.name || `${selectedRegion.country} ${currentLang === "ko" ? selectedRegion.label.ko : selectedRegion.label.en}`,
      address: summary?.place?.formattedAddress || "",
      date: summary?.timeZone?.localDate || fallbackDate,
      time: summary?.timeZone?.localTime || fallbackTime,
      temperature: Number.isFinite(temperature) ? Math.round(temperature) : selectedRegion.weather.temp,
      condition: summary?.weather?.conditionText || (currentLang === "ko" ? selectedRegion.weather.conditionKo : selectedRegion.weather.conditionEn),
      flightTime: summary?.flight?.label || fallbackFlightTime,
      flightOrigin: summary?.flight?.originName || (currentLang === "ko" ? "인천공항" : "Incheon Airport"),
    };
  }, [currentLang, fallbackDate, fallbackFlightTime, fallbackTime, selectedRegion, summary]);

  void tick;

  return (
    <>
      <div className="border-b border-gray-100 px-4 py-4 dark:border-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-slate-100">
                  <MapPin size={18} className="text-teal-600" />
                  {display.title}
                  {loading && <Loader2 size={15} className="animate-spin text-teal-600" />}
                </h2>
                {display.address && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{display.address}</p>}
                {errorMessage && <p className="mt-1 text-xs text-red-500">{errorMessage}</p>}
              </div>

              <div className="flex items-center gap-3 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={14} className="text-teal-600" />
                  {display.date}
                </span>
                <span className="h-3 w-px bg-gray-300 dark:bg-slate-600" />
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} className="text-teal-600" />
                  {display.time}
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-1.5 text-xs text-gray-600 dark:text-slate-300 sm:flex-row sm:flex-wrap">
              <span className="inline-flex w-full items-center gap-1.5 rounded-md bg-yellow-50 px-2.5 py-1.5 dark:bg-yellow-950/30 sm:w-auto">
                <Sun size={15} className="shrink-0 text-yellow-500" />
                <span className="font-medium text-gray-800 dark:text-slate-100">{display.temperature}C</span>
                <span className="text-gray-500 dark:text-slate-300">{display.condition}</span>
              </span>
              <span className="inline-flex w-full items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1.5 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:w-auto">
                <Plane size={15} className="shrink-0" />
                <span className="font-medium">
                  {currentLang === "ko" ? `${display.flightOrigin} 기준 ${display.flightTime}` : `${display.flightTime} from ${display.flightOrigin}`}
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className="text-gray-500" />
            {currentLang === "ko" ? "지역 변경" : "Change Region"}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <RegionPicker
          currentRegion={selectedRegion}
          onSelect={onRegionChange}
          onSearch={runSearch}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
