import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, MapPinned, Plus, Route, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router";
import GoogleMapPlacePicker from "../components/GoogleMapPlacePicker";
import PostPlaceEditor from "../components/PostPlaceEditor";
import { CREW_CATEGORIES } from "../data/crewCategories";
import useTranslation from "../i18n/useTranslation";
import { isLogin } from "../services/auth";
import { getApiErrorMessage } from "../services/apiClient";
import { createCrew } from "../services/crewApi";
import { uploadPostImages } from "../services/postApi";
import { richTextToPlainText } from "../utils/richText";

const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const imageKey = (image) => image.localId || image.imageUrl;
const emptyPlace = () => ({
  localId: uid(),
  regionCode: null,
  regionPlaceId: null,
  regionNames: {},
  displayName: "",
  address: "",
  latitude: null,
  longitude: null,
  content: "",
  images: [],
});

const uploadInBatches = async (files) => {
  const uploaded = [];
  for (let index = 0; index < files.length; index += 10) {
    uploaded.push(...await uploadPostImages(files.slice(index, index + 10)));
  }
  return uploaded;
};

export default function CrewCreate() {
  const navigate = useNavigate();
  const { currentLang } = useTranslation();
  const ko = currentLang === "ko";
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [places, setPlaces] = useState(() => [emptyPlace()]);
  const [activePlaceId, setActivePlaceId] = useState(null);
  const [placePickerIndex, setPlacePickerIndex] = useState(null);
  const [coverImageKey, setCoverImageKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLogin()) navigate("/login", { replace: true });
  }, [navigate]);

  const updatePlace = (index, patch) => setPlaces((current) => current.map(
    (place, itemIndex) => itemIndex === index ? { ...place, ...patch } : place,
  ));

  const movePlace = (index, direction) => setPlaces((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });

  const removePlace = (index) => setPlaces((current) => {
    if (current.length === 1) return current;
    const removed = current[index];
    const next = current.filter((_, itemIndex) => itemIndex !== index);
    if (removed.localId === activePlaceId) setActivePlaceId(next[Math.min(index, next.length - 1)].localId);
    return next;
  });

  const addPlace = () => {
    const place = emptyPlace();
    setPlaces((current) => [...current, place]);
    setActivePlaceId(place.localId);
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

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim() || title.length > 25) return window.alert(ko ? "제목은 빈칸 포함 25자 이내로 입력해 주세요." : "Enter a title up to 25 characters.");
    if (!category) return window.alert(ko ? "카테고리를 선택해 주세요." : "Choose a category.");
    if (!description.trim()) return window.alert(ko ? "크루 소개를 입력해 주세요." : "Write a crew description.");
    if (!travelDate) return window.alert(ko ? "활동 날짜를 선택해 주세요." : "Choose an activity date.");
    const missingLocation = places.find((place) => !place.regionPlaceId);
    if (missingLocation) {
      setActivePlaceId(missingLocation.localId);
      return window.alert(ko ? "모든 경유지의 장소를 선택해 주세요." : "Choose a location for every stop.");
    }
    const missingContent = places.find((place) => !richTextToPlainText(place.content));
    if (missingContent) {
      setActivePlaceId(missingContent.localId);
      return window.alert(ko ? "모든 경유지의 소개를 입력해 주세요." : "Describe every stop.");
    }

    setSubmitting(true);
    try {
      const pendingFiles = places.flatMap((place) => place.images
        .filter((image) => image.file)
        .map((image) => image.file));
      const uploaded = pendingFiles.length ? await uploadInBatches(pendingFiles) : [];
      let uploadIndex = 0;
      let selectedCoverUrl = null;
      const normalizedPlaces = places.map((place) => ({
        ...place,
        images: place.images.map((image) => {
          const originalKey = imageKey(image);
          const value = image.file ? uploaded[uploadIndex++] : image;
          const normalized = {
            imageUrl: value.imageUrl,
            altText: image.altText || value.originalName || title.trim(),
          };
          if (coverImageKey === originalKey) selectedCoverUrl = normalized.imageUrl;
          return normalized;
        }),
      }));
      const firstImageUrl = normalizedPlaces.flatMap((place) => place.images)[0]?.imageUrl || null;
      const firstPlace = normalizedPlaces[0];
      const crew = await createCrew({
        title: title.trim(),
        regionCode: null,
        regionName: firstPlace.regionNames[currentLang] || firstPlace.displayName,
        description: description.trim(),
        travelDate,
        capacity: Number(capacity),
        approvalRequired,
        coverImageUrl: selectedCoverUrl || firstImageUrl,
        openChatUrl: null,
        tags: [],
        category,
        routeIds: [],
        routePlaces: normalizedPlaces.map((place) => ({
          regionCode: null,
          regionName: place.regionNames[currentLang] || place.displayName,
          regionPlaceId: place.regionPlaceId,
          latitude: place.latitude,
          longitude: place.longitude,
          content: place.content,
          images: place.images,
        })),
      });
      navigate(`/crew/${crew.id}`, { replace: true });
    } catch (error) {
      window.alert(getApiErrorMessage(error, ko ? "크루를 만들지 못했습니다." : "Could not create the crew."));
    } finally {
      setSubmitting(false);
    }
  };

  const activePlaceIndex = Math.max(0, places.findIndex((place) => place.localId === activePlaceId));
  const activePlace = places[activePlaceIndex];
  const sectionTitle = "mb-3 flex items-center gap-2 text-sm font-extrabold text-title";
  const inputClass = "w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-teal-500/10";

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 pb-24 pt-24 dark:from-slate-950 dark:to-slate-950 sm:px-6 sm:pt-28">
      <form onSubmit={submit} className="mx-auto max-w-4xl">
        <button type="button" onClick={() => navigate("/crew")} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"><ArrowLeft size={17} /> {ko ? "크루 목록" : "Crews"}</button>
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">New journey crew</p>
          <h1 className="mt-2 text-3xl font-extrabold text-title">{ko ? "함께할 크루를 만들어보세요" : "Create your travel crew"}</h1>
          <p className="mt-2 text-sm text-muted">{ko ? "경유지를 직접 연결해 우리 크루만의 여행 루트를 만들어보세요." : "Connect stops to create a route made just for your crew."}</p>
        </header>

        <div className="space-y-5">
          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <h2 className={sectionTitle}><MapPinned size={18} className="text-primary" /> 1. {ko ? "기본 정보" : "Basics"}</h2>
            <label className="block text-xs font-bold text-muted" htmlFor="crew-title">{ko ? "크루 제목" : "Crew title"}</label>
            <input id="crew-title" className={`${inputClass} mt-2`} value={title} maxLength={25} onChange={(event) => setTitle(event.target.value)} placeholder={ko ? "예: 제주 오름과 카페를 함께 즐겨요" : "e.g. Jeju trails and cafes together"} />
            <p className="mt-1.5 text-right text-xs text-muted">{title.length}/25</p>
            <p className="mb-2 mt-5 text-xs font-bold text-muted">{ko ? "카테고리" : "Category"}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{CREW_CATEGORIES.map((item) => <button key={item.value} type="button" onClick={() => setCategory(item.value)} className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${category === item.value ? "border-primary bg-primary text-white" : "border-border bg-background text-muted hover:border-primary/50"}`}>{item[currentLang]}</button>)}</div>
          </section>

          <section id="crew-route-editor" className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <h2 className={sectionTitle}><Route size={18} className="text-primary" /> 2. {ko ? "크루 여행 루트" : "Crew route"}</h2>
            <p className="mb-5 text-xs leading-5 text-muted">{ko ? "장소를 검색하고 방문 순서와 소개를 작성하세요. 사진은 선택 사항이며 첫 사진이 카드 대표 이미지가 됩니다." : "Search for stops, arrange their order, and describe them. Photos are optional; the first becomes the card cover."}</p>
            <div className="mb-5 rounded-2xl border border-border bg-secondary/60 p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-1"><div><p className="text-sm font-bold text-title">{ko ? "경유지 순서" : "Stop order"}</p><p className="mt-0.5 text-xs text-muted">{ko ? "카드를 눌러 각 경유지를 편집하세요." : "Select a card to edit each stop."}</p></div><span className="shrink-0 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-sm">{activePlaceIndex + 1} / {places.length}</span></div>
              <div className="crew-category-scroll flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={ko ? "경유지 순서" : "Stop order"}>
                {places.map((place, index) => {
                  const active = index === activePlaceIndex;
                  const complete = Boolean(place.regionPlaceId && richTextToPlainText(place.content));
                  return <button key={place.localId} type="button" role="tab" aria-selected={active} onClick={() => setActivePlaceId(place.localId)} className={`flex min-w-fit items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${active ? "border-primary bg-primary text-white" : "border-border bg-card text-muted"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${active ? "bg-white text-primary" : complete ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>{complete ? <Check size={14} strokeWidth={3} /> : index + 1}</span><span className="max-w-28 truncate text-xs font-semibold">{place.displayName || (ko ? `경유지 ${index + 1}` : `Stop ${index + 1}`)}</span></button>;
                })}
                <button type="button" disabled={places.length >= 20} onClick={addPlace} className="flex min-w-fit items-center gap-1.5 rounded-xl border border-dashed border-teal-300 bg-card px-3 py-2 text-xs font-bold text-primary disabled:opacity-40"><Plus size={15} /> {ko ? "경유지 추가" : "Add stop"}</button>
              </div>
            </div>
            {activePlace && <PostPlaceEditor key={activePlace.localId} place={activePlace} index={activePlaceIndex} total={places.length} lang={currentLang} onChange={updatePlace} onChooseLocation={setPlacePickerIndex} onMove={movePlace} onRemove={removePlace} onPrevious={() => setActivePlaceId(places[activePlaceIndex - 1].localId)} onNext={() => setActivePlaceId(places[activePlaceIndex + 1].localId)} selectedCoverKey={coverImageKey} onSelectCover={(image) => setCoverImageKey(imageKey(image))} />}
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <h2 className={sectionTitle}><Users size={18} className="text-primary" /> 3. {ko ? "활동과 참여 방식" : "Activity and joining"}</h2>
            <label className="text-xs font-bold text-muted" htmlFor="crew-description">{ko ? "크루 소개" : "Introduction"}</label>
            <textarea id="crew-description" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} rows={6} className={`${inputClass} mt-2 resize-none`} placeholder={ko ? "어떤 여행을 하고 싶은지, 함께 지킬 약속이 있다면 적어주세요." : "Describe the trip and any crew guidelines."} />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-muted"><span className="mb-2 flex items-center gap-1.5"><CalendarDays size={14} /> {ko ? "활동 날짜" : "Activity date"}</span><input type="date" required value={travelDate} onChange={(event) => setTravelDate(event.target.value)} className={inputClass} /></label>
              <label className="text-xs font-bold text-muted"><span className="mb-2 flex items-center gap-1.5"><Users size={14} /> {ko ? "최대 인원" : "Capacity"}</span><input type="number" min="2" max="20" value={capacity} onChange={(event) => setCapacity(event.target.value)} className={inputClass} /></label>
            </div>
            <p className="mb-2 mt-5 text-xs font-bold text-muted">{ko ? "가입 방식" : "Join method"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[{ value: false, title: ko ? "바로 참여" : "Instant join", desc: ko ? "누구나 정원 안에서 바로 참여해요." : "Anyone can join while spots remain." }, { value: true, title: ko ? "승인 후 참여" : "Approval required", desc: ko ? "신청 메시지를 확인하고 크루장이 승인해요." : "The owner reviews an application message." }].map((option) => <button key={String(option.value)} type="button" onClick={() => setApprovalRequired(option.value)} className={`rounded-2xl border p-4 text-left transition ${approvalRequired === option.value ? "border-primary bg-teal-50 ring-4 ring-teal-500/10 dark:bg-teal-950/30" : "border-border"}`}><span className="flex items-center gap-2 text-sm font-extrabold text-title"><ShieldCheck size={17} className="text-primary" /> {option.title}</span><span className="mt-1.5 block text-xs leading-5 text-muted">{option.desc}</span></button>)}
            </div>
          </section>
        </div>

        <div className="sticky bottom-4 mt-7 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/90"><button type="submit" disabled={submitting} className="w-full rounded-xl bg-primary py-3.5 text-sm font-extrabold text-white transition hover:bg-primaryHover disabled:cursor-not-allowed disabled:opacity-50">{submitting ? (ko ? "만드는 중..." : "Creating...") : (ko ? "크루 만들기" : "Create crew")}</button></div>
      </form>
      {placePickerIndex !== null && <GoogleMapPlacePicker value={places[placePickerIndex]} lang={currentLang} onConfirm={confirmPlace} onClose={() => setPlacePickerIndex(null)} />}
    </main>
  );
}
