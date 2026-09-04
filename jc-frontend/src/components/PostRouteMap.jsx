import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPinned } from "lucide-react";
import { loadGoogleMaps } from "../utils/googleMapsLoader";
import { translate } from "../i18n";

// 위도/경도 값이 유효한 범위(-90~90, -180~180) 내에 있는지 검증하는 헬퍼 함수
const validCoordinate = (place) => Number.isFinite(place?.latitude)
  && Number.isFinite(place?.longitude)
  && place.latitude >= -90 && place.latitude <= 90
  && place.longitude >= -180 && place.longitude <= 180;

// 장소 이름을 가져오는 함수 (이름이 없으면 언어 설정에 맞춰 '장소 N' 또는 'Stop N' 반환)
const getPlaceName = (place, index, lang) => place.region?.localizedNames?.[lang]
  || place.placeName
  || place.region?.displayName
  || translate(lang, "routeMap.stop", { count: index + 1 });

// 개별 장소를 클릭했을 때 새 창으로 열릴 구글 지도 검색 URL을 생성하는 함수
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

export default function PostRouteMap({ places = [], lang = "ko", compact = false }) {
  // 언어가 한국어('ko')인지 확인
  const t = (key) => translate(lang, key);
  const mapElementRef = useRef(null);
  // 지도 로딩 상태 및 에러 상태 관리
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // 장소들의 정렬 순서(sortOrder)를 기준으로 오름차순 정렬
  const orderedPlaces = useMemo(() => [...places]
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)), [places]);
  // 정렬된 장소 중 위·경도 좌표가 유효한 장소들만 필터링하여 루트 경로 데이터 생성
  const route = useMemo(() => orderedPlaces
    .map((place, index) => ({ place, index }))
    .filter(({ place }) => validCoordinate(place)), [orderedPlaces]);

  // 지도 생성 및 마커/폴리라인 렌더링 훅
  useEffect(() => {
    // 표시할 루트 좌표가 없으면 실행 중단
    if (!route.length) {
      return undefined;
    }

    let active = true;
    let polyline;
    let markers = [];
    const markerClickHandlers = [];

    const initialize = async () => {
      try {
        // 1. 구글 맵 API 로드
        const maps = await loadGoogleMaps();
        if (!active) return;

        // 첫 번째 장소의 좌표를 지도의 초기 중심점으로 설정
        const first = route[0].place;
        const map = new maps.Map(mapElementRef.current, {
          center: { lat: first.latitude, lng: first.longitude },
          zoom: 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: !compact,
        });
        const bounds = new maps.LatLngBounds();
        const infoWindow = new maps.InfoWindow();
        const path = route.map(({ place }) => ({ lat: place.latitude, lng: place.longitude }));

        // 2. 각 장소 위치마다 번호가 적힌 커스텀 마커 생성
        markers = route.map(({ place, index }, routeIndex) => {
          const position = path[routeIndex];
          bounds.extend(position);
          const marker = new maps.Marker({
            map,
            position,
            title: getPlaceName(place, index, lang),
            label: {
              text: String(index + 1),
              color: "#ffffff",
              fontSize: compact ? "10px" : "12px",
              fontWeight: "700",
            },
          });
          // 마커 클릭 시 장소 이름이 담긴 인포윈도우(말풍선) 오픈
          const handleMarkerClick = () => {
            const name = getPlaceName(place, index, lang);
            infoWindow.setContent(`<div style="padding:4px 2px;font-weight:700">${index + 1}. ${name.replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</div>`);
            infoWindow.open({ map, anchor: marker });
          };
          const clickListener = marker.addListener("click", handleMarkerClick);
          markerClickHandlers.push(clickListener);
          return marker;
        });

        // 3. 장소가 2개 이상이면 마커들을 잇는 선(Polyline) 그리기, 1개면 해당 위치로 줌인
        if (path.length > 1) {
          polyline = new maps.Polyline({
            map,
            path,
            geodesic: false,
            strokeColor: "#0d9488",
            strokeOpacity: 0.9,
            strokeWeight: 4,
          });
          map.fitBounds(bounds, compact ? 28 : 60);
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
    // 클린업 함수: 컴포넌트 언마운트 시 이벤트 리스너 및 지도 객체 정리
    return () => {
      active = false;
      markerClickHandlers.forEach((listener) => listener.remove());
      markers.forEach((marker) => marker.setMap(null));
      if (polyline) polyline.setMap(null);
    };
  }, [compact, lang, route]);

  // 등록된 장소가 없으면 아무것도 렌더링하지 않음
  if (!orderedPlaces.length) return null;

  if (compact) {
    return (
      <section className="grid h-80 min-h-0 grid-cols-[36%_64%] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <ol className="min-h-0 overflow-y-auto border-r border-slate-200 px-3 py-4 dark:border-slate-700">
          {orderedPlaces.map((place, index) => (
            <li key={place.id || `${place.placeName}-${index}`} className="relative flex min-h-14 gap-2.5 pb-3 last:min-h-0 last:pb-0">
              {index < orderedPlaces.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-[11px] top-6 border-l-2 border-dotted border-teal-300 dark:border-teal-700" />}
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-[10px] font-extrabold text-white shadow-sm dark:border-slate-900">{index + 1}</span>
              <a href={getGoogleMapsUrl(place, index, lang)} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate pt-0.5 text-xs font-bold text-title transition-colors hover:text-primary hover:underline" title={getPlaceName(place, index, lang)}>{getPlaceName(place, index, lang)}</a>
            </li>
          ))}
        </ol>
        <div className="relative min-h-0 bg-slate-100 dark:bg-slate-800">
          {route.length > 0 ? <div ref={mapElementRef} className="absolute inset-0" /> : <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-slate-500">{t("routeMap.empty")}</div>}
          {loading && route.length > 0 && <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70"><Loader2 className="animate-spin text-teal-600" size={24} /></div>}
          {error && <div className="absolute inset-x-2 top-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">{error}</div>}
        </div>
      </section>
    );
  }

  return (
    <section className="border-t border-slate-100 py-10 dark:border-slate-800 sm:py-12">
      {/* 상단 타이틀 및 전체 스탑 개수 요약 */}
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Journey route</p>
          <h2 className="mt-1 text-xl font-bold text-title">{t("routeMap.title")}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-400"><MapPinned size={16} /> {orderedPlaces.length} stops</span>
      </div>

      {/* 좌측: 장소 타임라인 목록 / 우측: 구글 맵 루트 시각화 영역 */}
      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:grid-cols-[minmax(18rem,0.9fr)_minmax(0,1.35fr)]">
        {/* 좌측 패널: 방문 장소 순서 목록 및 썸네일 */}
        <ol className="px-5 py-6 sm:px-7 sm:py-8">
          {orderedPlaces.map((place, index) => {
            const thumbnail = place.images?.[0];
            return (
              <li key={place.id || `${place.placeName}-${index}`} className="relative flex min-h-20 gap-4 pb-5 last:min-h-0 last:pb-0">
                {/* 장소들 사이를 연결하는 세로 점선 디자인 */}
                {index < orderedPlaces.length - 1 && (
                  <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-8 border-l-2 border-dotted border-teal-300 dark:border-teal-700" />
                )}
                {/* 순서 번호 배지 */}
                <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white bg-teal-600 text-xs font-extrabold text-white shadow-sm dark:border-slate-900">
                  {index + 1}
                </span>
                {/* 장소 이름, 주소, 썸네일 이미지 영역 */}
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

        {/* 우측 패널: 구글 맵이 로드되는 지도 영역 (로딩 및 에러 오버레이 포함) */}
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
