import { useEffect, useState } from "react";
import { CalendarDays, Clock, Plane, RefreshCw, Search, Sun, X } from "lucide-react";
import { getLocalTime, REGIONS } from "../data/regions";
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

function RegionPicker({ currentRegion, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const { currentLang } = useLangStore();
  const filtered = REGIONS.filter((region) => {
    const q = query.toLowerCase();
    return region.label.ko.includes(query) || region.label.en.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{currentLang === "ko" ? "지역 선택" : "Select Region"}</h3>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-gray-100">
            <X size={14} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={currentLang === "ko" ? "지역 검색..." : "Search region..."}
            className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pl-8 pr-3 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>

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
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                  active ? "bg-teal-50" : "hover:bg-gray-50"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-primary">
                  <Icon size={17} />
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {region.country} {currentLang === "ko" ? region.label.ko : region.label.en}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
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

  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const time = getLocalTime(selectedRegion.timezone);
  const date = getLocalDate(selectedRegion.timezone, currentLang);
  const flightTime = currentLang === "ko" ? selectedRegion.flightTime.ko : selectedRegion.flightTime.en;
  void tick;

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <h2 className="text-lg font-bold text-gray-900">
            {selectedRegion.country}{" "}
            <span className="font-normal text-gray-700">
              {currentLang === "ko" ? selectedRegion.label.ko : selectedRegion.label.en}
            </span>
          </h2>

          <div className="flex items-center gap-3 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <CalendarDays size={14} className="text-teal-600" />
              {date}
            </span>
            <span className="h-3 w-px bg-gray-300" />
            <span className="inline-flex items-center gap-1">
              <Clock size={14} className="text-teal-600" />
              {time}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Sun size={18} className="text-yellow-500" />
              <span className="font-medium text-gray-800">{selectedRegion.weather.temp}C</span>
              <span className="text-gray-500">
                {currentLang === "ko" ? selectedRegion.weather.conditionKo : selectedRegion.weather.conditionEn}
              </span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
              <Plane size={13} />
              {currentLang === "ko" ? `비행 ${flightTime}` : flightTime}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <RefreshCw size={14} className="text-gray-500" />
          {currentLang === "ko" ? "지역 변경" : "Change Region"}
        </button>
      </div>

      {pickerOpen && (
        <RegionPicker currentRegion={selectedRegion} onSelect={onRegionChange} onClose={() => setPickerOpen(false)} />
      )}
    </>
  );
}
