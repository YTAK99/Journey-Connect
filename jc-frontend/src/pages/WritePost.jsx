import { useEffect, useState } from "react";
import { CalendarDays, Check, ChevronLeft, MapPin, Plus, Sparkles } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import PostPlaceEditor from "../components/PostPlaceEditor";
import GoogleMapPlacePicker from "../components/GoogleMapPlacePicker";
import TagInput from "../components/TagInput";
import { RegionPicker } from "../components/LocationWeather";
import { REGIONS } from "../data/regions";
import { getApiErrorMessage } from "../services/apiClient";
import { isLogin } from "../services/auth";
import { createPost, getPost, updatePost, uploadPostImages } from "../services/postApi";
import useLangStore from "../store/useLangStore";
import useRegionStore from "../store/useRegionStore";
import { normalizeEditorContent, richTextToPlainText } from "../utils/richText";
import { toRegionPreference } from "../utils/region";
import { getMessages } from "../i18n";

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const imageKey = (image) => image.localId || image.imageUrl;

const uploadInBatches = async (files) => {
  const uploaded = [];
  for (let index = 0; index < files.length; index += 10) {
    uploaded.push(...await uploadPostImages(files.slice(index, index + 10)));
  }
  return uploaded;
};

const emptyPlace = () => ({
  localId: uid(), regionCode: null, regionPlaceId: null, regionNames: {},
  displayName: "", address: "", latitude: null, longitude: null,
  content: "", images: [],
});

function WritePost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const t = getMessages(currentLang, "writePost");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tags, setTags] = useState([]);
  const [representativeRegion, setRepresentativeRegion] = useState(() => id ? null : selectedRegion);
  const [places, setPlaces] = useState(() => [emptyPlace()]);
  const [activePlaceId, setActivePlaceId] = useState(() => null);
  const [coverImageKey, setCoverImageKey] = useState(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [placePickerIndex, setPlacePickerIndex] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin()) {
      alert(getMessages(useLangStore.getState().currentLang, "writePost").loginRequired);
      navigate("/login", { replace: true });
      return;
    }
    if (!id) return;
    getPost(id).then((post) => {
      const lang = useLangStore.getState().currentLang;
      const sourcePlaces = Array.isArray(post.places) && post.places.length ? post.places : [{
        region: post.region, placeName: post.regionName, content: post.content, images: post.images || [],
      }];
      setTitle(post.title || "");
      setStartDate(post.travelStartDate || "");
      setEndDate(post.travelEndDate || "");
      setTags(Array.isArray(post.tags) ? post.tags : []);
      setRepresentativeRegion(toRegionPreference(post.region || {}, lang));
      setCoverImageKey(post.coverImageUrl || null);
      const loadedPlaces = sourcePlaces.map((place) => ({
        localId: uid(), regionCode: place.region?.code || null, regionPlaceId: place.region?.googlePlaceId || null,
        regionNames: place.region?.localizedNames || {}, displayName: place.region?.localizedNames?.[lang] || place.placeName || place.region?.displayName || "",
        address: place.region?.displayName || place.placeName || "",
        latitude: place.latitude ?? place.region?.latitude ?? null,
        longitude: place.longitude ?? place.region?.longitude ?? null,
        content: normalizeEditorContent(place.content || ""),
        images: (place.images || []).map((image) => ({ imageUrl: image.imageUrl, altText: image.altText || post.title })),
      }));
      setPlaces(loadedPlaces);
      setActivePlaceId(loadedPlaces[0]?.localId || null);
    }).catch((error) => {
      alert(getApiErrorMessage(error, getMessages(useLangStore.getState().currentLang, "writePost").loadFailed));
      navigate("/my-posts");
    }).finally(() => setLoading(false));
  }, [id, navigate]);

  const updatePlace = (index, patch) => setPlaces((current) => current.map((place, itemIndex) => itemIndex === index ? { ...place, ...patch } : place));
  const movePlace = (index, direction) => setPlaces((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });
  const removePlace = (index) => setPlaces((current) => {
    if (current.length === 1) return current;
    const removedPlace = current[index];
    const next = current.filter((_, itemIndex) => itemIndex !== index);
    if (removedPlace.localId === activePlaceId) setActivePlaceId(next[Math.min(index, next.length - 1)].localId);
    return next;
  });
  const addPlace = () => {
    const nextPlace = emptyPlace();
    setPlaces((current) => [...current, nextPlace]);
    setActivePlaceId(nextPlace.localId);
  };
  const confirmPlace = (selection) => {
    updatePlace(placePickerIndex, {
      regionCode: null,
      regionPlaceId: selection.regionPlaceId,
      regionNames: { [currentLang]: selection.displayName },
      displayName: selection.displayName,
      address: selection.address,
      latitude: selection.latitude,
      longitude: selection.longitude,
    });
    setPlacePickerIndex(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return alert(t.titleRequired);
    if (!representativeRegion?.code && !representativeRegion?.placeId) return alert(t.regionRequired);
    const missingLocation = places.find((place) => !place.regionPlaceId);
    if (missingLocation) {
      setActivePlaceId(missingLocation.localId);
      document.getElementById("route-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return alert(t.placeRequired);
    }
    const missingContent = places.find((place) => !richTextToPlainText(place.content));
    if (missingContent) {
      setActivePlaceId(missingContent.localId);
      document.getElementById("route-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return alert(t.contentRequired);
    }
    if (startDate && endDate && startDate > endDate) return alert(t.invalidDates);

    try {
      setSubmitting(true);
      const pendingFiles = places.flatMap((place) => place.images.filter((image) => image.file).map((image) => image.file));
      const uploaded = pendingFiles.length ? await uploadInBatches(pendingFiles) : [];
      let uploadIndex = 0;
      let resolvedCoverUrl = null;
      const normalizedPlaces = places.map((place) => ({
        ...place,
        images: place.images.map((image) => {
          const originalKey = imageKey(image);
          if (!image.file) {
            if (coverImageKey === originalKey) resolvedCoverUrl = image.imageUrl;
            return image;
          }
          const value = uploaded[uploadIndex++];
          if (coverImageKey === originalKey) resolvedCoverUrl = value.imageUrl;
          return { imageUrl: value.imageUrl, altText: image.altText || value.originalName || title.trim() };
        }),
      }));
      const allImages = normalizedPlaces.flatMap((place) => place.images);
      if (allImages.length > 0 && !resolvedCoverUrl) return alert(t.coverRequired);
      setPlaces(normalizedPlaces);
      setCoverImageKey(resolvedCoverUrl);

      const request = {
        title: title.trim(), content: normalizedPlaces.map((place) => place.content).join("\n"),
        regionCode: representativeRegion.code || null,
        regionName: representativeRegion.label?.[currentLang] || representativeRegion.label?.en || null,
        regionPlaceId: representativeRegion.placeId || null,
        coverImageUrl: resolvedCoverUrl,
        images: allImages.map((image) => ({ imageUrl: image.imageUrl, altText: image.altText || title.trim() })),
        places: normalizedPlaces.map((place) => ({
          regionCode: null, regionName: place.regionNames[currentLang] || place.displayName,
          regionPlaceId: place.regionPlaceId, content: place.content,
          images: place.images.map((image) => ({ imageUrl: image.imageUrl, altText: image.altText || title.trim() })),
        })),
        travelStartDate: startDate || null, travelEndDate: endDate || null, tags,
      };
      const savedPost = id ? await updatePost(id, request) : await createPost(request);
      alert(id ? t.updated : t.created);
      if (savedPost?.region) setSelectedRegion(toRegionPreference(savedPost.region, currentLang));
      navigate(`/post/${savedPost.id}`);
    } catch (error) {
      alert(getApiErrorMessage(error, t.saveFailed));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-background p-8 pt-28 text-center text-slate-500">{t.loading}</div>;
  const inputClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-950/40";
  const regionName = representativeRegion?.label?.[currentLang] || representativeRegion?.label?.en || "";
  const activePlaceIndex = Math.max(0, places.findIndex((place) => place.localId === activePlaceId));
  const activePlace = places[activePlaceIndex];

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background pb-16 pt-24 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-white hover:text-teal-700 dark:hover:bg-slate-900"><ChevronLeft size={17} /> {t.back}</button>
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-xl shadow-sky-100/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <header className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-6 py-7 sm:px-10 dark:border-slate-800 dark:from-teal-950/35 dark:via-slate-900 dark:to-sky-950/30"><div className="flex items-start gap-4"><div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white"><Sparkles size={21} /></div><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Journey Route</p><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{id ? t.editTitle : t.createTitle}</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t.intro}</p></div></div></header>
          <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
            <section><h2 className="mb-5 font-bold text-slate-900 dark:text-white">1. {t.tripInfo}</h2><div className="space-y-5"><label className="block"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.title}</span><input className={`${inputClass} text-lg font-semibold`} value={title} maxLength={120} placeholder={t.titlePlaceholder} onChange={(event) => setTitle(event.target.value)} /></label><div><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.region}</span><div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"><MapPin size={18} className="text-teal-500" /><span className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-100">{regionName || t.regionRequired}</span><button type="button" onClick={() => setRegionPickerOpen(true)} className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-700 dark:border-teal-800 dark:text-teal-200">{t.chooseRegion}</button></div></div><div className="grid grid-cols-2 gap-3 sm:gap-5"><label><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarDays size={15} className="text-teal-500" /> {t.startDate}</span><input type="date" className={inputClass} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarDays size={15} className="text-teal-500" /> {t.endDate}</span><input type="date" min={startDate || undefined} className={inputClass} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div></div></section>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <section id="route-editor" className="scroll-mt-24"><div className="mb-5"><h2 className="font-bold text-slate-900 dark:text-white">2. {t.route}</h2><p className="mt-1 text-xs text-slate-500">{t.routeHelp}</p></div>
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/35">
                <div className="mb-3 flex items-center justify-between gap-3 px-1"><div><p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t.placeNavigator}</p><p className="mt-0.5 text-xs text-slate-500">{t.placeNavigatorHelp}</p></div><span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700 shadow-sm dark:bg-slate-900 dark:text-teal-200">{activePlaceIndex + 1} / {places.length}</span></div>
                <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t.placeNavigator}>
                  {places.map((place, index) => {
                    const isActive = index === activePlaceIndex;
                    const isComplete = Boolean(place.regionPlaceId && richTextToPlainText(place.content));
                    return <button key={place.localId} type="button" role="tab" aria-selected={isActive} onClick={() => setActivePlaceId(place.localId)} className={`group flex min-w-fit items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${isActive ? "border-teal-500 bg-teal-500 text-white shadow-md shadow-teal-100 dark:shadow-none" : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-teal-950/30"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${isActive ? "bg-white text-teal-600" : isComplete ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-200" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200"}`}>{isComplete ? <Check size={14} strokeWidth={3} /> : index + 1}</span><span className="hidden max-w-28 truncate text-xs font-semibold sm:block">{place.displayName || `${t.stop} ${index + 1}`}</span></button>;
                  })}
                  <button type="button" disabled={places.length >= 20} onClick={addPlace} className="flex min-w-fit items-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-white px-3 py-2 text-xs font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-40 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-200"><Plus size={15} /> {t.addPlaceShort}</button>
                </div>
              </div>
              {activePlace && <PostPlaceEditor key={activePlace.localId} place={activePlace} index={activePlaceIndex} total={places.length} lang={currentLang} onChange={updatePlace} onChooseLocation={setPlacePickerIndex} onMove={movePlace} onRemove={removePlace} onPrevious={() => setActivePlaceId(places[activePlaceIndex - 1].localId)} onNext={() => setActivePlaceId(places[activePlaceIndex + 1].localId)} selectedCoverKey={coverImageKey} onSelectCover={(image) => setCoverImageKey(imageKey(image))} />}
            </section>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <section><h2 className="mb-5 font-bold text-slate-900 dark:text-white">3. {t.tags}</h2><TagInput tags={tags} onChange={setTags} lang={currentLang} /></section>
          </div>
          <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-10 dark:border-slate-800 dark:bg-slate-950/40"><button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{t.cancel}</button><button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-xl bg-teal-500 px-8 py-3 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50">{submitting ? t.saving : id ? t.editSubmit : t.createSubmit}</button></footer>
        </section>
      </div>
      {regionPickerOpen && <RegionPicker currentRegion={representativeRegion || REGIONS[0]} onSelect={setRepresentativeRegion} onSearch={(_query, region) => setRepresentativeRegion(region)} onClose={() => setRegionPickerOpen(false)} searchMode="region" />}
      {placePickerIndex !== null && <GoogleMapPlacePicker value={places[placePickerIndex]} lang={currentLang} onConfirm={confirmPlace} onClose={() => setPlacePickerIndex(null)} />}
    </main>
  );
}

export default WritePost;
