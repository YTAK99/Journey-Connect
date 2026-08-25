import { useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, MapPin, Plus, Sparkles } from "lucide-react";
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

const copy = {
  ko: {
    loginRequired: "로그인이 필요합니다.", loadFailed: "게시글을 불러오지 못했습니다.",
    titleRequired: "여행 제목을 입력해 주세요.", regionRequired: "여행 대표 지역을 선택해 주세요.",
    placeRequired: "모든 방문 장소를 Google 장소 검색으로 지정해 주세요.", contentRequired: "모든 장소에 여행 이야기를 작성해 주세요.",
    coverRequired: "첨부한 사진 중 대표사진을 선택해 주세요.", invalidDates: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    updated: "게시글을 수정했습니다.", created: "여행 기록을 등록했습니다.", saveFailed: "게시글 저장에 실패했습니다.", loading: "게시글을 불러오는 중입니다.",
    back: "돌아가기", editTitle: "여행 루트 수정하기", createTitle: "새 여행 루트 만들기",
    intro: "대표 지역을 정하고, 방문한 장소마다 위치·사진·이야기를 남겨 여행 루트를 완성하세요.", tripInfo: "여행 기본 정보",
    title: "여행 제목", titlePlaceholder: "예: 비 오는 날의 교토 골목 여행", region: "여행 대표 지역", chooseRegion: "지역 선택",
    startDate: "시작 날짜", endDate: "종료 날짜", route: "방문 장소와 이야기", routeHelp: "카페·식당·관광지명을 Google에서 검색하고 방문 순서대로 배치하세요.",
    addPlace: "다음 장소 추가", tags: "검색 태그", cancel: "취소", saving: "저장 중...", editSubmit: "수정 완료", createSubmit: "여행 루트 발행하기",
  },
  en: {
    loginRequired: "Please log in to continue.", loadFailed: "Could not load the post.", titleRequired: "Please enter a trip title.",
    regionRequired: "Choose a representative travel region.", placeRequired: "Find every stop using Google place search.",
    contentRequired: "Write a story for every stop.", coverRequired: "Choose a cover from the attached photos.",
    invalidDates: "The end date cannot be earlier than the start date.", updated: "Your post has been updated.", created: "Your travel route has been published.",
    saveFailed: "Failed to save the post.", loading: "Loading your post...", back: "Back", editTitle: "Edit your travel route", createTitle: "Create a travel route",
    intro: "Choose a region, then add a Google place, photos, and story for every stop.", tripInfo: "Trip details", title: "Trip title",
    titlePlaceholder: "e.g. A rainy-day walk through Kyoto", region: "Representative region", chooseRegion: "Choose region", startDate: "Start date", endDate: "End date",
    route: "Stops and stories", routeHelp: "Search cafés, restaurants, and attractions, then arrange them in visit order.", addPlace: "Add next stop",
    tags: "Search tags", cancel: "Cancel", saving: "Saving...", editSubmit: "Save changes", createSubmit: "Publish travel route",
  },
};

function WritePost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const t = copy[currentLang] || copy.ko;
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tags, setTags] = useState([]);
  const [representativeRegion, setRepresentativeRegion] = useState(() => id ? null : selectedRegion);
  const [places, setPlaces] = useState(() => [emptyPlace()]);
  const [coverImageKey, setCoverImageKey] = useState(null);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [placePickerIndex, setPlacePickerIndex] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin()) {
      alert((copy[useLangStore.getState().currentLang] || copy.ko).loginRequired);
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
      setPlaces(sourcePlaces.map((place) => ({
        localId: uid(), regionCode: place.region?.code || null, regionPlaceId: place.region?.googlePlaceId || null,
        regionNames: place.region?.localizedNames || {}, displayName: place.region?.localizedNames?.[lang] || place.placeName || place.region?.displayName || "",
        address: place.region?.displayName || place.placeName || "",
        latitude: place.latitude ?? place.region?.latitude ?? null,
        longitude: place.longitude ?? place.region?.longitude ?? null,
        content: normalizeEditorContent(place.content || ""),
        images: (place.images || []).map((image) => ({ imageUrl: image.imageUrl, altText: image.altText || post.title })),
      })));
    }).catch((error) => {
      alert(getApiErrorMessage(error, (copy[useLangStore.getState().currentLang] || copy.ko).loadFailed));
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
  const removePlace = (index) => setPlaces((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index));
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
    if (places.some((place) => !place.regionPlaceId)) return alert(t.placeRequired);
    if (places.some((place) => !richTextToPlainText(place.content))) return alert(t.contentRequired);
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

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background pb-16 pt-24 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-5 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-white hover:text-teal-700 dark:hover:bg-slate-900"><ChevronLeft size={17} /> {t.back}</button>
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-xl shadow-sky-100/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <header className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-6 py-7 sm:px-10 dark:border-slate-800 dark:from-teal-950/35 dark:via-slate-900 dark:to-sky-950/30"><div className="flex items-start gap-4"><div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white"><Sparkles size={21} /></div><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Journey Route</p><h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{id ? t.editTitle : t.createTitle}</h1><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{t.intro}</p></div></div></header>
          <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
            <section><h2 className="mb-5 font-bold text-slate-900 dark:text-white">1. {t.tripInfo}</h2><div className="space-y-5"><label className="block"><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.title}</span><input className={`${inputClass} text-lg font-semibold`} value={title} maxLength={120} placeholder={t.titlePlaceholder} onChange={(event) => setTitle(event.target.value)} /></label><div><span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.region}</span><div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"><MapPin size={18} className="text-teal-500" /><span className="min-w-0 flex-1 text-sm text-slate-800 dark:text-slate-100">{regionName || t.regionRequired}</span><button type="button" onClick={() => setRegionPickerOpen(true)} className="rounded-full border border-teal-200 px-3 py-1.5 text-xs font-bold text-teal-700 dark:border-teal-800 dark:text-teal-200">{t.chooseRegion}</button></div></div><div className="grid grid-cols-2 gap-3 sm:gap-5"><label><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarDays size={15} className="text-teal-500" /> {t.startDate}</span><input type="date" className={inputClass} value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label><span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarDays size={15} className="text-teal-500" /> {t.endDate}</span><input type="date" min={startDate || undefined} className={inputClass} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div></div></section>
            <div className="h-px bg-slate-100 dark:bg-slate-800" />
            <section><div className="mb-5"><h2 className="font-bold text-slate-900 dark:text-white">2. {t.route}</h2><p className="mt-1 text-xs text-slate-500">{t.routeHelp}</p></div><div className="space-y-6">{places.map((place, index) => <PostPlaceEditor key={place.localId} place={place} index={index} total={places.length} lang={currentLang} onChange={updatePlace} onChooseLocation={setPlacePickerIndex} onMove={movePlace} onRemove={removePlace} selectedCoverKey={coverImageKey} onSelectCover={(image) => setCoverImageKey(imageKey(image))} />)}</div><button type="button" disabled={places.length >= 20} onClick={() => setPlaces((current) => [...current, emptyPlace()])} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-300 px-5 py-4 font-bold text-teal-700 hover:bg-teal-50 disabled:opacity-40 dark:border-teal-800 dark:text-teal-200"><Plus size={18} /> {t.addPlace}</button></section>
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
