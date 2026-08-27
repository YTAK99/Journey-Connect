import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPinned } from "lucide-react";
import { loadGoogleMaps } from "../utils/googleMapsLoader";
import { translate } from "../i18n";

// 위도·경도가 Google 지도에서 사용할 수 있는 범위인지 검증합니다.
const validCoordinate = (place) => Number.isFinite(place?.latitude)
  && Number.isFinite(place?.longitude)
  && place.latitude >= -90 && place.latitude <= 90
  && place.longitude >= -180 && place.longitude <= 180;

// 이름이 없는 장소에는 현재 언어의 순번 기반 이름을 사용합니다.
const getPlaceName = (place, index, lang) => place.placeName
  || place.region?.displayName
  || translate(lang, "routeMap.stop", { count: index + 1 });

// 장소 카드에서 Google 지도 검색 화면으로 이동할 URL을 만듭니다.
const getGoogleMapsUrl = (place, index, lang) => {
  const params = new URLSearchParams({ api: "1" });
  const placeName = getPlaceName(place, index, lang);
  const query = validCoordinate(place)
    ? `${place.latitude},${place.longitude}`
    : [placeName, place.address].filter(Boolean).join(" ");
  params.set("query", query);
  if (place.region?.googlePlaceId) params.set("query_place_id", place.region.googlePlaceId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
};

export default function PostRouteMap({ places = [], lang = "ko" }) {
  const t = (key) => translate(lang, key);
  const mapElementRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 저장된 방문 순서대로 장소를 정렬하고 좌표가 있는 항목만 지도 경로에 포함합니다.
  const orderedPlaces = useMemo(() => [...places]
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)), [places]);
  const route = useMemo(() => orderedPlaces
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => validCoordinate(place)), [orderedPlaces]);

  useEffect(() => {
    if (!route.length) {
      return undefined;
    }

    let active = true;
    let polyline;
    let markers = [];
    const markerClickHandlers = [];

    const initialize = async () => {
      try {
        const maps = await loadGoogleMaps();
        const { AdvancedMarkerElement } = await maps.importLibrary("marker");
        if (!active) return;

        const first = route[0].place;
        const map = new maps.Map(mapElementRef.current, {
          center: { lat: first.latitude, lng: first.longitude },
          zoom: 14,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        const bounds = new maps.LatLngBounds();
        const infoWindow = new maps.InfoWindow();
        const path = route.map(({ place }) => ({ lat: place.latitude, lng: place.longitude }));

        markers = route.map(({ place, index }, routeIndex) => {
          const position = path[routeIndex];
          bounds.extend(position);
          const badge = document.createElement("div");
          badge.className = "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-extrabold text-white shadow-lg";
          badge.textContent = String(index + 1);
          const marker = new AdvancedMarkerElement({
            map,
            position,
            title: getPlaceName(place, index, lang),
            content: badge,
            gmpClickable: true,
          });
          const handleMarkerClick = () => {
            const name = getPlaceName(place, index, lang);
            infoWindow.setContent(`<div style="padding:4px 2px;font-weight:700">${index + 1}. ${name.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`);
            infoWindow.open({ map, anchor: marker });
          };
          marker.addEventListener("gmp-click", handleMarkerClick);
          markerClickHandlers.push({ marker, handleMarkerClick });
          return marker;
        });

        if (path.length > 1) {
          polyline = new maps.Polyline({
            map,
            path,
            geodesic: false,
            strokeColor: "#0d9488",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          map.fitBounds(bounds, 60);
        } else {
          map.setCenter(path[0]);
          map.setZoom(15);
        }
        setLoading(false);
      } catch {
        if (active) {
          setLoading(false);
          setError(translate(lang, "routeMap.loadFailed"));
        }
      }
    };

    initialize();
    return () => {
      active = false;
      markerClickHandlers.forEach(({ marker, handleMarkerClick }) => {
        marker.removeEventListener("gmp-click", handleMarkerClick);
      });
      markers.forEach((marker) => { marker.map = null; });
      if (polyline) polyline.setMap(null);
    };
  }, [lang, route]);

  if (!orderedPlaces.length) return null;

  return (
    <section className="border-t border-slate-100 py-10 dark:border-slate-800 sm:py-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Journey route</p>
          <h2 className="mt-1 text-xl font-bold text-title">{t("routeMap.title")}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-400"><MapPinned size={16} /> {orderedPlaces.length} stops</span>
      </div>

      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.35fr)]">
        <ol className="px-5 py-6 sm:px-7 sm:py-8">
          {orderedPlaces.map((place, index) => {
            const thumbnail = place.images?.[0];
            return (
              <li key={place.id || `${place.placeName}-${index}`} className="relative flex min-h-20 gap-4 pb-5 last:min-h-0 last:pb-0">
                {index < orderedPlaces.length - 1 && (
                  <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-8 border-l-2 border-dotted border-teal-300 dark:border-teal-700" />
                )}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-extrabold text-white shadow-sm dark:border-slate-900">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-4 border-b border-slate-100 pb-5 last:border-0 dark:border-slate-800">
                  <div className="min-w-0">
                    <a
                      href={getGoogleMapsUrl(place, index, lang)}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-bold text-title transition-colors hover:text-primary hover:underline"
                      title={t("routeMap.viewGoogleMaps")}
                    >
                      {getPlaceName(place, index, lang)}
                    </a>
                    {place.address && <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{place.address}</p>}
                  </div>
                  {thumbnail?.imageUrl && (
                    <img src={thumbnail.imageUrl} alt={thumbnail.altText || getPlaceName(place, index, lang)} className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-sm" />
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="relative min-h-[22rem] border-t border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 lg:min-h-[32rem] lg:border-l lg:border-t-0">
          {route.length > 0 ? <div ref={mapElementRef} className="absolute inset-0" /> : (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-500">
              {t("routeMap.empty")}
            </div>
          )}
          {loading && route.length > 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70"><Loader2 className="animate-spin text-teal-600" size={30} /></div>}
          {error && <div className="absolute inset-x-4 top-4 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">{error}</div>}
        </div>
      </div>
    </section>
  );
}
