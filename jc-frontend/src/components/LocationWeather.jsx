import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, MapPin, Plane, RefreshCw, Search, Sun, X } from "lucide-react";
import { getLocalTime, REGIONS } from "../data/regions";
import { getApiErrorMessage } from "../services/apiClient";
import { getGoogleLocationSuggestions, getGoogleLocationSummary } from "../services/googleLocationApi";
import useLangStore from "../store/useLangStore";
import { toRegionPreference } from "../utils/region";

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

const createCustomRegion = (name, summary = null) => ({
  id: `custom:${(summary?.place?.latitude ?? name)}:${(summary?.place?.longitude ?? name)}`,
  label: { ko: summary?.place?.name || name, en: summary?.place?.name || name },
  country: summary?.place?.formattedAddress || "",
  timezone: summary?.timeZone?.id || "UTC",
  weather: {
    temp: Math.round(summary?.weather?.temperatureDegrees ?? 0),
    conditionKo: summary?.weather?.conditionText || "날씨 정보 확인 중",
    conditionEn: summary?.weather?.conditionText || "Weather unavailable",
  },
  flightTime: {
    ko: summary?.flight?.label || "이동 시간 확인 중",
    en: summary?.flight?.label || "Checking travel time",
  },
  custom: true,
});

export function RegionPicker({ currentRegion, onSelect, onSearch, onClose }) {
  // 고정 지역 목록과 Google 자동완성 결과를 하나의 선택 UI로 합칩니다.
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const { currentLang } = useLangStore();
  const filtered = REGIONS.filter((region) => {
    const q = query.toLowerCase();
    return region.label.ko.includes(query) || region.label.en.toLowerCase().includes(q);
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      getGoogleLocationSuggestions(trimmed, currentLang === "ko" ? "ko" : "en")
        .then((items) => {
          if (active) setSuggestions(Array.isArray(items) ? items : []);
        })
        .catch((error) => {
          if (active) {
            setSuggestions([]);
            setSuggestionError(getApiErrorMessage(
              error,
              currentLang === "ko" ? "지역 추천을 불러오지 못했습니다." : "Could not load region suggestions.",
            ));
          }
        })
        .finally(() => {
          if (active) setSuggestionLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [currentLang, query]);

  const visibleSuggestions = query.trim().length >= 2 ? suggestions : [];

  const selectSuggestion = (suggestion) => {
    onSearch(suggestion.description, {
      id: `google:${suggestion.placeId}`,
      placeId: suggestion.placeId,
      code: null,
      label: { ko: suggestion.mainText, en: suggestion.mainText },
      country: suggestion.secondaryText,
      custom: true,
    });
    onClose();
  };

  const selectRegion = (region) => {
    onSelect(region);
    onSearch(getRegionQuery(region, currentLang), region);
    onClose();
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (visibleSuggestions.length > 0) {
      selectSuggestion(visibleSuggestions[0]);
    } else if (filtered.length > 0) {
      selectRegion(filtered[0]);
    }
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
              onChange={(event) => {
                const nextQuery = event.target.value;
                setQuery(nextQuery);
                setSuggestionError("");
                if (nextQuery.trim().length < 2) {
                  setSuggestions([]);
                  setSuggestionLoading(false);
                } else {
                  setSuggestionLoading(true);
                }
              }}
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
          {visibleSuggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => selectSuggestion(suggestion)}
              className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-teal-700 dark:bg-slate-800">
                <MapPin size={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-gray-900 dark:text-slate-100">{suggestion.mainText}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-slate-400">{suggestion.secondaryText}</span>
              </span>
            </button>
          ))}
          {query.trim().length >= 2 && suggestionLoading && <p className="px-3 py-2 text-xs text-gray-500">{currentLang === "ko" ? "지역 추천을 찾는 중..." : "Finding suggestions..."}</p>}
          {query.trim().length >= 2 && suggestionError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{suggestionError}</p>}
          {query.trim().length >= 2 && !suggestionLoading && !suggestionError && visibleSuggestions.length === 0 && filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
              {currentLang === "ko" ? "검색 결과가 없습니다. 다른 지역명을 입력해 주세요." : "No regions found. Try another name."}
            </p>
          )}
          {filtered.map((region) => {
            const active = region.id === currentRegion.id;
            return (
              <button
                key={region.id}
                type="button"
                onClick={() => selectRegion(region)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                  active ? "bg-teal-50 dark:bg-teal-950/40" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-xs font-bold tracking-wide text-primary dark:bg-teal-950/50 dark:text-teal-300">
                  {region.country}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {currentLang === "ko" ? region.label.ko : region.label.en}
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
  // 선택 지역이 바뀔 때 장소·날씨·현지 시각·예상 비행 정보를 백엔드에서 묶어 조회합니다.
  const { currentLang } = useLangStore();
  const [tick, setTick] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [request, setRequest] = useState(() => ({
    id: 0,
    query: getRegionQuery(selectedRegion, currentLang),
    persistDynamic: false,
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
        if (!ignore) {
          setSummary(data);
          if (request.persistDynamic) onRegionChange(createCustomRegion(request.query, data));
        }
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
  }, [currentLang, onRegionChange, request]);

  const runSearch = (nextQuery, presetRegion = null) => {
    setLoading(true);
    setErrorMessage("");
    if (presetRegion) {
      onRegionChange(toRegionPreference({ ...presetRegion, regionName: nextQuery }, currentLang));
    } else {
      onRegionChange(createCustomRegion(nextQuery));
    }
    setRequest((value) => ({
      id: value.id + 1,
      query: nextQuery,
      persistDynamic: !presetRegion,
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
      {/* 날씨·비행 정보 로직은 그대로 두고 지역 요약 영역의 세로 간격만 줄입니다. */}
      <div className="border-b border-gray-100 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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

            <div className="mt-1.5 flex flex-col gap-1 text-xs text-gray-600 dark:text-slate-300 sm:flex-row sm:flex-wrap">
              <span className="inline-flex w-full items-center gap-1.5 rounded-md bg-yellow-50 px-2.5 py-1 dark:bg-yellow-950/30 sm:w-auto">
                <Sun size={15} className="shrink-0 text-yellow-500" />
                <span className="font-medium text-gray-800 dark:text-slate-100">{display.temperature}C</span>
                <span className="text-gray-500 dark:text-slate-300">{display.condition}</span>
              </span>
              <span className="inline-flex w-full items-center gap-1.5 rounded-md bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200 sm:w-auto">
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
