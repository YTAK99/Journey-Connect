import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPinned } from "lucide-react";
import { loadGoogleMaps } from "../utils/googleMapsLoader";

const validCoordinate = (place) => Number.isFinite(place?.latitude)
  && Number.isFinite(place?.longitude)
  && place.latitude >= -90 && place.latitude <= 90
  && place.longitude >= -180 && place.longitude <= 180;

export default function PostRouteMap({ places = [], lang = "ko" }) {
  const isKorean = lang === "ko";
  const mapElementRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const route = useMemo(() => [...places]
    .filter(validCoordinate)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)), [places]);

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

        const first = route[0];
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
        const path = route.map((place) => ({ lat: place.latitude, lng: place.longitude }));

        markers = route.map((place, index) => {
          const position = path[index];
          bounds.extend(position);
          const badge = document.createElement("div");
          badge.className = "flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-teal-500 text-sm font-extrabold text-white shadow-lg";
          badge.textContent = String(index + 1);
          const marker = new AdvancedMarkerElement({
            map,
            position,
            title: place.placeName || `Stop ${index + 1}`,
            content: badge,
            gmpClickable: true,
          });
          const handleMarkerClick = () => {
            const name = place.placeName || place.region?.displayName || `Stop ${index + 1}`;
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
            geodesic: true,
            strokeColor: "#14b8a6",
            strokeOpacity: 0.9,
            strokeWeight: 5,
          });
          map.fitBounds(bounds, 60);
        } else {
          map.setCenter(path[0]);
          map.setZoom(15);
        }
        setLoading(false);
      } catch (loadError) {
        if (active) {
          setLoading(false);
          setError(isKorean ? "여행 루트 지도를 불러오지 못했습니다." : loadError.message);
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
  }, [isKorean, route]);

  if (!route.length) return null;

  return (
    <section className="border-t border-slate-100 py-10 dark:border-slate-800 sm:py-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Journey route</p>
          <h2 className="mt-1 text-xl font-bold text-title">{isKorean ? "작성자의 여행 루트" : "The author's route"}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-400"><MapPinned size={16} /> {route.length} stops</span>
      </div>
      <div className="relative h-[24rem] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 sm:h-[32rem]">
        <div ref={mapElementRef} className="h-full w-full" />
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-slate-900/70"><Loader2 className="animate-spin text-teal-600" size={30} /></div>}
        {error && <div className="absolute inset-x-4 top-4 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">{error}</div>}
      </div>
    </section>
  );
}
