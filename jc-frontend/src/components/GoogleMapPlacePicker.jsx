import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { loadGoogleMaps } from "../utils/googleMapsLoader";

// 초기 지도가 표시될 기본 중심 좌표 (기본값: 서울 시청)
const SEOUL = { lat: 37.5665, lng: 126.978 };

/**
 * @component GoogleMapPlacePicker
 * @description 지도 모달을 띄워 사용자가 장소를 검색하거나 클릭하여 위치 정보를 선택할 수 있는 컴포넌트[cite: 2]
 */
export default function GoogleMapPlacePicker({ value, lang = "ko", onConfirm, onClose }) {
  // 언어 설정이 한국어('ko')인지 여부 확인
  const isKorean = lang === "ko";

  // DOM 및 구글 맵 객체 레퍼런스 관리
  const mapElementRef = useRef(null);
  const autocompleteContainerRef = useRef(null);
  const markerRef = useRef(null);

  // 현재 선택된 장소 상태 관리 (기존 전달된 값이 있다면 초기값으로 설정)
  const [selection, setSelection] = useState(value?.regionPlaceId ? value : null);

  // 로딩 및 API 요청 처리 상태 관리
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  // 구글 맵 초기화 및 이벤트 리스너 설정 훅
  useEffect(() => {
    let active = true;
    const autocompleteContainer = autocompleteContainerRef.current;
    let map;
    let clickListener;
    let autocompleteElement;
    let autocompleteSelectHandler;

    const initialize = async () => {
      try {
        // 1. 구글 맵 API 로드
        const maps = await loadGoogleMaps();
        if (!active) return;

        // 초기 지도 중심 좌표 결정 (전달받은 위치가 있으면 해당 좌표, 없으면 서울)
        const initialCenter = Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude)
            ? { lat: value.latitude, lng: value.longitude }
            : SEOUL;

        // 2. 구글 맵 라이브러리(마커, 장소) 로드
        const [{ AdvancedMarkerElement }, { Place, PlaceAutocompleteElement }] = await Promise.all([
          maps.importLibrary("marker"),
          maps.importLibrary("places"),
        ]);
        if (!active) return;

        // 3. 맵 인스턴스 생성
        map = new maps.Map(mapElementRef.current, {
          center: initialCenter,
          zoom: value?.latitude ? 16 : 12,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        // 지도 위에 표시될 마커 생성
        markerRef.current = new AdvancedMarkerElement({
          map,
          position: value?.latitude ? initialCenter : undefined,
        });

        // 4. 장소 선택 시 마커 위치 이동 및 상태 업데이트 함수
        const applySelection = (next) => {
          if (!active) return;
          markerRef.current.position = { lat: next.latitude, lng: next.longitude };
          map.panTo({ lat: next.latitude, lng: next.longitude });
          map.setZoom(Math.max(map.getZoom() || 15, 16));
          setSelection(next);
          setError("");
        };

        // 5. 구글 Place ID를 기반으로 상세 장소 정보(위치, 주소 등)를 가져오는 함수
        const selectPlaceId = async (placeId) => {
          setResolving(true);
          try {
            const place = new Place({ id: placeId });
            await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
            setResolving(false);
            if (!place.location) {
              setError(isKorean ? "장소 정보를 불러오지 못했습니다." : "Could not load this place.");
              return;
            }
            applySelection({
              regionPlaceId: place.id,
              displayName: place.displayName || place.formattedAddress,
              address: place.formattedAddress || "",
              latitude: place.location.lat(),
              longitude: place.location.lng(),
            });
          } catch {
            setResolving(false);
            setError(isKorean ? "장소 정보를 불러오지 못했습니다." : "Could not load this place.");
          }
        };

        // 6. 구글 자동완성 검색 컴포넌트(PlaceAutocompleteElement) 설정
        autocompleteElement = new PlaceAutocompleteElement();
        autocompleteElement.placeholder = isKorean
            ? "카페, 식당, 숙소, 관광지 검색"
            : "Search cafes, restaurants, hotels, attractions";
        autocompleteElement.style.width = "100%";
        autocompleteElement.style.minHeight = "3rem";
        autocompleteElement.style.colorScheme = "light";
        autocompleteElement.style.backgroundColor = "#ffffff";
        autocompleteElement.style.color = "#0f172a";
        autocompleteElement.style.border = "1px solid #cbd5e1";
        autocompleteElement.style.borderRadius = "0.75rem";
        autocompleteElement.style.fontSize = "0.875rem";

        // 자동완성 목록에서 특정 장소를 선택했을 때의 이벤트 핸들러
        autocompleteSelectHandler = async ({ placePrediction }) => {
          if (!placePrediction) return;
          setResolving(true);
          try {
            const place = placePrediction.toPlace();
            await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
            if (!place.location) throw new Error("Place has no location.");
            applySelection({
              regionPlaceId: place.id,
              displayName: place.displayName || place.formattedAddress,
              address: place.formattedAddress || "",
              latitude: place.location.lat(),
              longitude: place.location.lng(),
            });
          } catch {
            setError(isKorean ? "장소 정보를 불러오지 못했습니다." : "Could not load this place.");
          } finally {
            setResolving(false);
          }
        };

        autocompleteElement.addEventListener("gmp-select", autocompleteSelectHandler);
        autocompleteContainer.replaceChildren(autocompleteElement);

        // 7. 지도 직접 클릭 시 Geocoder를 이용해 주소 및 좌표를 따오는 이벤트 설정
        const geocoder = new maps.Geocoder();
        clickListener = map.addListener("click", (event) => {
          // 사용자가 지도 위의 특정 POI(랜드마크 등)를 클릭한 경우
          if (event.placeId) {
            event.stop?.();
            selectPlaceId(event.placeId);
            return;
          }
          if (!event.latLng) return;
          setResolving(true);

          // 좌표를 주소로 변환 (Reverse Geocoding)
          geocoder.geocode({ location: event.latLng }, (results, status) => {
            setResolving(false);
            const result = results?.[0];
            if (status !== "OK" || !result) {
              setError(isKorean ? "선택 지점의 주소를 찾지 못했습니다." : "No address was found for this point.");
              return;
            }
            applySelection({
              regionPlaceId: result.place_id,
              displayName: result.address_components?.[0]?.long_name || result.formatted_address,
              address: result.formatted_address || "",
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng(),
            });
          });
        });

        setLoading(false);
      } catch (loadError) {
        if (active) {
          setLoading(false);
          setError(isKorean ? "Google 지도를 불러오지 못했습니다. 키와 API 설정을 확인해 주세요." : loadError.message);
        }
      }
    };

    initialize();

    // 클린업 함수: 컴포넌트 언마운트 시 이벤트 리스너 제거 및 지도 정리
    return () => {
      active = false;
      if (clickListener) clickListener.remove();
      if (autocompleteElement && autocompleteSelectHandler) {
        autocompleteElement.removeEventListener("gmp-select", autocompleteSelectHandler);
      }
      if (autocompleteContainer) autocompleteContainer.replaceChildren();
      if (markerRef.current) markerRef.current.map = null;
    };
  }, [isKorean, value]);

  return (
      // 모달 배경 클릭 시 닫기
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-3 sm:p-6" onClick={onClose}>
        <section className="flex h-[min(90vh,780px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>

          {/* 모달 헤더: 타이틀 및 닫기(X) 버튼 */}
          <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-slate-900 dark:text-white">{isKorean ? "지도에서 방문 장소 선택" : "Choose a place on the map"}</h2>
              <p className="mt-1 text-xs text-slate-500">{isKorean ? "장소를 검색하거나 지도 위 장소·지점을 클릭하세요." : "Search or click a place or point on the map."}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
          </header>

          {/* 장소 검색 자동완성 입력창 영역 */}
          <div className="border-b border-slate-200 p-3 dark:border-slate-700">
            <div ref={autocompleteContainerRef} className="min-h-12 w-full" />
          </div>

          {/* 구글 맵이 그려질 본문 영역 (로딩 및 에러 메시지 오버레이 포함) */}
          <div className="relative min-h-0 flex-1 bg-slate-100">
            <div ref={mapElementRef} className="h-full w-full" />
            {(loading || resolving) && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]">
                  <Loader2 className="animate-spin text-teal-600" size={30} />
                </div>
            )}
            {error && (
                <div className="absolute left-4 right-4 top-4 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">{error}</div>
            )}
          </div>

          {/* 모달 푸터: 선택된 장소 요약 정보 및 확인/취소 버튼 */}
          <footer className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              {selection ? (
                  <>
                    <p className="flex items-center gap-2 truncate font-bold text-slate-900 dark:text-white">
                      <MapPin size={17} className="shrink-0 text-teal-500" />
                      {selection.displayName}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">{selection.address}</p>
                  </>
              ) : (
                  <p className="text-sm text-slate-500">{isKorean ? "지도에서 방문 장소를 선택해 주세요." : "Select a place on the map."}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">
                {isKorean ? "취소" : "Cancel"}
              </button>
              {/* 선택된 장소가 있거나 처리 중이 아닐 때만 '이 장소로 지정' 버튼 활성화 */}
              <button type="button" disabled={!selection || resolving} onClick={() => onConfirm(selection)} className="rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-extrabold text-white disabled:opacity-40">
                {isKorean ? "이 장소로 지정" : "Use this place"}
              </button>
            </div>
          </footer>

        </section>
      </div>
  );
}