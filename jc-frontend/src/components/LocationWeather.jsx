import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, MapPin, Plane, RefreshCw, Search, Sun, X } from "lucide-react";
import { getLocalTime, REGIONS } from "../data/regions";
import { getApiErrorMessage } from "../services/apiClient";
import { getGoogleLocationSuggestions, getGoogleLocationSummary } from "../services/googleLocationApi";
import useLangStore from "../store/useLangStore";
import { getMessages } from "../i18n";
import { toRegionPreference } from "../utils/region";
import { loadGoogleMaps } from "../utils/googleMapsLoader";

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

export function RegionPicker({ currentRegion, onSelect, onSearch, onClose, searchMode = "region" }) {
  // 고정 지역 목록과 Google 자동완성 결과를 하나의 선택 UI로 합칩니다.
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const { currentLang } = useLangStore();
  const labels = getMessages(currentLang, "location");
  const filtered = searchMode === "place" ? [] : REGIONS.filter((region) => {
    const q = query.toLowerCase();
    return region.label.ko.includes(query) || region.label.en.toLowerCase().includes(q);
  });

  // 입력 중 매 글자마다 외부 API를 호출하지 않도록 지연하고, 이전 요청의 늦은 응답은 무시합니다.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return undefined;
    }

    let active = true;
    const timer = setTimeout(() => {
      if (searchMode === "region") {
        loadGoogleMaps()
          .then(async (maps) => {
            if (!active) return;
            const { AutocompleteSuggestion } = await maps.importLibrary("places");
            const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: trimmed,
              language: currentLang === "ko" ? "ko" : "en",
              includedPrimaryTypes: ["locality", "administrative_area_level_1", "administrative_area_level_2"],
            });
            if (!active) return;
            const predictions = (response.suggestions || [])
              .map((item) => item.placePrediction)
              .filter(Boolean);
            setSuggestions(predictions.slice(0, 6).map((prediction) => ({
                placeId: prediction.placeId,
                mainText: prediction.mainText?.toString() || prediction.text?.toString() || "",
                secondaryText: prediction.secondaryText?.toString() || "",
                description: prediction.text?.toString() || prediction.mainText?.toString() || "",
                browserResult: true,
                placePrediction: prediction,
              })));
            setSuggestionError("");
            setSuggestionLoading(false);
          })
          .catch(() => {
            if (active) {
              setSuggestions([]);
              setSuggestionError(labels.suggestionsFailed);
              setSuggestionLoading(false);
            }
          });
        return;
      }
      getGoogleLocationSuggestions(trimmed, currentLang, searchMode)
        .then((items) => {
          if (active) setSuggestions(Array.isArray(items) ? items : []);
        })
        .catch((error) => {
          if (active) {
            setSuggestions([]);
            setSuggestionError(getApiErrorMessage(
              error,
              labels.suggestionsFailed,
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
  }, [currentLang, labels.suggestionsFailed, query, searchMode]);

  const visibleSuggestions = query.trim().length >= 2 ? suggestions : [];

  const selectSuggestion = async (suggestion) => {
    if (suggestion.browserResult && suggestion.placePrediction) {
      setSuggestionLoading(true);
      setSuggestionError("");
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
        if (!place.location) throw new Error("Selected city has no coordinates.");
        const name = place.displayName || suggestion.mainText;
        onSearch(name, {
          id: `google:${suggestion.placeId}`,
          placeId: suggestion.placeId,
          code: null,
          label: { ko: name, en: name },
          country: place.formattedAddress || suggestion.secondaryText,
          timezone: "UTC",
          weather: { temp: 0, conditionKo: "날씨 확인 중", conditionEn: "Checking weather" },
          flightTime: { ko: "이동 시간 확인 중", en: "Checking travel time" },
          latitude: place.location.lat(),
          longitude: place.location.lng(),
          address: place.formattedAddress || "",
          custom: true,
        });
        onClose();
      } catch {
        setSuggestionError(labels.suggestionsFailed);
      } finally {
        setSuggestionLoading(false);
      }
      return;
    }
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
          <h3 className="font-semibold text-gray-900 dark:text-slate-100">{searchMode === "place" ? labels.searchPlace : labels.selectRegion}</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={submitSearch} className="mb-4 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400" />
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
              placeholder={searchMode === "place" ? labels.placePlaceholder : labels.cityPlaceholder}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-teal-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-teal-600 px-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            {labels.search}
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
          {query.trim().length >= 2 && suggestionLoading && <p className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">{labels.findingSuggestions}</p>}
          {query.trim().length >= 2 && suggestionError && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-950/30 dark:text-rose-300">{suggestionError}</p>}
          {query.trim().length >= 2 && !suggestionLoading && !suggestionError && visibleSuggestions.length === 0 && filtered.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500 dark:text-slate-400">
              {labels.noRegions}
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
                    {region.label[currentLang] || region.label.en}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Sun size={11} />
                      {region.weather.temp}C · {currentLang === "ko" ? region.weather.conditionKo : region.weather.conditionEn}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Plane size={11} />
                      {region.flightTime[currentLang] || region.flightTime.en}
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

export default function LocationWeather({ selectedRegion = REGIONS[0], onRegionChange = () => {}, pickerOpen = false, onPickerOpenChange = () => {} }) {
  // 선택 지역이 바뀔 때 장소·날씨·현지 시각·예상 비행 정보를 백엔드에서 묶어 조회합니다.
  const { currentLang } = useLangStore();
  const labels = getMessages(currentLang, "location");
  const [tick, setTick] = useState(0);
  // 같은 검색어를 다시 선택해도 id를 증가시켜 요약 정보를 새로 조회할 수 있게 합니다.
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

    // 장소 조회가 성공한 동적 지역만 좌표·시간대가 포함된 값으로 전역 상태를 갱신합니다.
    getGoogleLocationSummary(request.query, currentLang, request.location)
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setErrorMessage("");
          if (request.persistDynamic) onRegionChange(createCustomRegion(request.query, data));
        }
      })
      .catch(() => {
        if (!ignore) {
          setSummary(null);
          setErrorMessage(currentLang === "ko"
            ? "실시간 정보를 불러오지 못해 기본 지역 정보를 표시합니다."
            : "Showing saved region information because live data is unavailable.");
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
      persistDynamic: !presetRegion || Boolean(presetRegion?.custom),
      location: presetRegion?.custom ? {
        latitude: presetRegion.latitude,
        longitude: presetRegion.longitude,
        address: presetRegion.address,
      } : null,
    }));
  };

  const fallbackDate = getLocalDate(selectedRegion.timezone, currentLang);
  const fallbackTime = getLocalTime(selectedRegion.timezone);
  const fallbackFlightTime = selectedRegion.flightTime[currentLang] || selectedRegion.flightTime.en;
  const display = useMemo(() => {
    // 외부 응답에 일부 값이 없더라도 고정 지역의 기본 정보로 화면을 유지합니다.
    const temperature = summary?.weather?.temperatureDegrees;

    return {
      title: summary?.place?.name || `${selectedRegion.country} ${selectedRegion.label[currentLang] || selectedRegion.label.en}`,
      address: summary?.place?.formattedAddress || "",
      date: summary?.timeZone?.localDate || fallbackDate,
      time: summary?.timeZone?.localTime || fallbackTime,
      temperature: Number.isFinite(temperature) ? Math.round(temperature) : selectedRegion.weather.temp,
      condition: summary?.weather?.conditionText || (currentLang === "ko" ? selectedRegion.weather.conditionKo : selectedRegion.weather.conditionEn),
      flightTime: summary?.flight?.label || fallbackFlightTime,
      flightOrigin: summary?.flight?.originName || labels.incheonAirport,
    };
  }, [currentLang, fallbackDate, fallbackFlightTime, fallbackTime, labels.incheonAirport, selectedRegion, summary]);

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
                  {labels.flightFrom.replace("{{origin}}", display.flightOrigin).replace("{{time}}", display.flightTime)}
                </span>
              </span>
            </div>
            {errorMessage && <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">{errorMessage}</p>}
          </div>

          <button
            type="button"
            onClick={() => onPickerOpenChange(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw size={14} className="text-gray-500 dark:text-slate-400" />
            {labels.changeRegion}
          </button>
        </div>
      </div>

      {pickerOpen && (
        <RegionPicker
          currentRegion={selectedRegion}
          onSelect={onRegionChange}
          onSearch={runSearch}
          onClose={() => onPickerOpenChange(false)}
        />
      )}
    </>
  );
}
