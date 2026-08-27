import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, X } from "lucide-react";
import { loadGoogleMaps } from "../utils/googleMapsLoader";
import { translate } from "../i18n";

const SEOUL = { lat: 37.5665, lng: 126.978 };

export default function GoogleMapPlacePicker({ value, lang = "ko", onConfirm, onClose }) {
  const t = (key) => translate(lang, key);
  const mapElementRef = useRef(null);
  const autocompleteContainerRef = useRef(null);
  const markerRef = useRef(null);
  const [selection, setSelection] = useState(value?.regionPlaceId ? value : null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const autocompleteContainer = autocompleteContainerRef.current;
    let map;
    let clickListener;
    let autocompleteElement;
    let autocompleteSelectHandler;

    const initialize = async () => {
      try {
        const maps = await loadGoogleMaps();
        if (!active) return;
        const initialCenter = Number.isFinite(value?.latitude) && Number.isFinite(value?.longitude)
          ? { lat: value.latitude, lng: value.longitude }
          : SEOUL;
        const [{ AdvancedMarkerElement }, { Place, PlaceAutocompleteElement }] = await Promise.all([
          maps.importLibrary("marker"),
          maps.importLibrary("places"),
        ]);
        if (!active) return;
        map = new maps.Map(mapElementRef.current, {
          center: initialCenter,
          zoom: value?.latitude ? 16 : 12,
          mapId: "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        markerRef.current = new AdvancedMarkerElement({
          map,
          position: value?.latitude ? initialCenter : undefined,
        });

        const applySelection = (next) => {
          if (!active) return;
          markerRef.current.position = { lat: next.latitude, lng: next.longitude };
          map.panTo({ lat: next.latitude, lng: next.longitude });
          map.setZoom(Math.max(map.getZoom() || 15, 16));
          setSelection(next);
          setError("");
        };

        const selectPlaceId = async (placeId) => {
          setResolving(true);
          try {
            const place = new Place({ id: placeId });
            await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location"] });
            setResolving(false);
            if (!place.location) {
              setError(translate(lang, "placePicker.placeLoadFailed"));
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
            setError(translate(lang, "placePicker.placeLoadFailed"));
          }
        };

        autocompleteElement = new PlaceAutocompleteElement();
        autocompleteElement.placeholder = translate(lang, "placePicker.searchPlaceholder");
        autocompleteElement.style.width = "100%";
        autocompleteElement.style.minHeight = "3rem";
        autocompleteElement.style.colorScheme = "light";
        autocompleteElement.style.backgroundColor = "#ffffff";
        autocompleteElement.style.color = "#0f172a";
        autocompleteElement.style.border = "1px solid #cbd5e1";
        autocompleteElement.style.borderRadius = "0.75rem";
        autocompleteElement.style.fontSize = "0.875rem";
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
            setError(translate(lang, "placePicker.placeLoadFailed"));
          } finally {
            setResolving(false);
          }
        };
        autocompleteElement.addEventListener("gmp-select", autocompleteSelectHandler);
        autocompleteContainer.replaceChildren(autocompleteElement);

        const geocoder = new maps.Geocoder();
        clickListener = map.addListener("click", (event) => {
          if (event.placeId) {
            event.stop?.();
            selectPlaceId(event.placeId);
            return;
          }
          if (!event.latLng) return;
          setResolving(true);
          geocoder.geocode({ location: event.latLng }, (results, status) => {
            setResolving(false);
            const result = results?.[0];
            if (status !== "OK" || !result) {
              setError(translate(lang, "placePicker.addressNotFound"));
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
      } catch {
        if (active) {
          setLoading(false);
          setError(translate(lang, "placePicker.mapLoadFailed"));
        }
      }
    };

    initialize();
    return () => {
      active = false;
      if (clickListener) clickListener.remove();
      if (autocompleteElement && autocompleteSelectHandler) {
        autocompleteElement.removeEventListener("gmp-select", autocompleteSelectHandler);
      }
      if (autocompleteContainer) autocompleteContainer.replaceChildren();
      if (markerRef.current) markerRef.current.map = null;
    };
  }, [lang, value]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/65 p-3 sm:p-6" onClick={onClose}>
      <section className="flex h-[min(90vh,780px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div className="min-w-0 flex-1"><h2 className="font-extrabold text-slate-900 dark:text-white">{t("placePicker.title")}</h2><p className="mt-1 text-xs text-slate-500">{t("placePicker.help")}</p></div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
        </header>
        <div className="border-b border-slate-200 p-3 dark:border-slate-700">
          <div ref={autocompleteContainerRef} className="min-h-12 w-full" />
        </div>
        <div className="relative min-h-0 flex-1 bg-slate-100"><div ref={mapElementRef} className="h-full w-full" />{(loading || resolving) && <div className="absolute inset-0 flex items-center justify-center bg-white/65 backdrop-blur-[1px]"><Loader2 className="animate-spin text-teal-600" size={30} /></div>}{error && <div className="absolute left-4 right-4 top-4 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-lg">{error}</div>}</div>
        <footer className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-700 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">{selection ? <><p className="flex items-center gap-2 truncate font-bold text-slate-900 dark:text-white"><MapPin size={17} className="shrink-0 text-teal-500" />{selection.displayName}</p><p className="mt-1 truncate text-xs text-slate-500">{selection.address}</p></> : <p className="text-sm text-slate-500">{t("placePicker.selectPrompt")}</p>}</div>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">{t("common.cancel")}</button><button type="button" disabled={!selection || resolving} onClick={() => onConfirm(selection)} className="rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-extrabold text-white disabled:opacity-40">{t("placePicker.confirm")}</button></div>
        </footer>
      </section>
    </div>
  );
}
