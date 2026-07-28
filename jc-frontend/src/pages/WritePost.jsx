import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, MapPin, RefreshCw, Sparkles } from "lucide-react";
import MultipleImageUploader from "../components/MultipleImageUploader";
import RichTextEditor from "../components/RichTextEditor";
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

const copy = {
  ko: {
    loginRequired: "로그인이 필요합니다.",
    travelImage: "여행 이미지",
    loadFailed: "게시글을 불러오지 못했습니다.",
    titleRequired: "일정 제목을 입력해주세요.",
    regionRequired: "여행 지역을 선택해주세요.",
    contentRequired: "여행 일정을 입력해주세요.",
    invalidDates: "종료 날짜는 시작 날짜보다 빠를 수 없습니다.",
    updated: "게시글이 수정되었습니다.",
    created: "여행 일정이 등록되었습니다.",
    saveFailed: "게시글 저장에 실패했습니다.",
    loading: "게시글을 불러오는 중입니다.",
    back: "돌아가기",
    editTitle: "여행 기록 다듬기",
    createTitle: "새로운 여행 기록",
    intro: "직접 경험한 장소와 팁을 나만의 문장과 사진으로 남겨보세요.",
    basicInfo: "여행 기본 정보",
    scheduleTitle: "일정 제목",
    titlePlaceholder: "예: 비 오는 날의 교토 골목 산책",
    region: "여행 지역",
    selectRegion: "지역을 선택해주세요",
    changeRegion: "지역 변경",
    startDate: "시작 날짜",
    endDate: "종료 날짜",
    story: "여행 이야기",
    storyHelp: "원하는 부분을 선택한 뒤 글꼴과 서식을 적용할 수 있어요.",
    photos: "여행 사진",
    photosHelp: "여러 장을 한 번에 선택하고 대표 사진도 지정할 수 있어요.",
    tagsSection: "검색 태그",
    cancel: "취소",
    saving: "저장 중...",
    editSubmit: "수정 완료",
    createSubmit: "여행 기록 발행하기",
  },
  en: {
    loginRequired: "Please log in to continue.",
    travelImage: "Travel image",
    loadFailed: "Could not load the post.",
    titleRequired: "Please enter a trip title.",
    regionRequired: "Please select a travel region.",
    contentRequired: "Please write your travel story.",
    invalidDates: "The end date cannot be earlier than the start date.",
    updated: "Your post has been updated.",
    created: "Your travel story has been published.",
    saveFailed: "Failed to save the post.",
    loading: "Loading your post...",
    back: "Back",
    editTitle: "Polish your travel story",
    createTitle: "Create a travel story",
    intro: "Share the places, moments, and practical tips you discovered along the way.",
    basicInfo: "Trip details",
    scheduleTitle: "Trip title",
    titlePlaceholder: "e.g. A rainy-day walk through Kyoto",
    region: "Travel region",
    selectRegion: "Select a region",
    changeRegion: "Change region",
    startDate: "Start date",
    endDate: "End date",
    story: "Your story",
    storyHelp: "Select any text to apply a font, heading, list, or other formatting.",
    photos: "Travel photos",
    photosHelp: "Upload several photos at once and choose the cover image.",
    tagsSection: "Search tags",
    cancel: "Cancel",
    saving: "Saving...",
    editSubmit: "Save changes",
    createSubmit: "Publish travel story",
  },
};

const translatedRegionName = (name, lang) => {
  const region = REGIONS.find((item) => item.label.ko === name || item.label.en === name);
  return region ? region.label[lang] : name;
};

function WritePost() {
  // URL에 게시물 id가 있으면 수정 모드, 없으면 새 글 작성 모드로 같은 폼을 재사용합니다.
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentLang } = useLangStore();
  const t = copy[currentLang] || copy.ko;
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const selectedRegionName = currentLang === "ko" ? selectedRegion.label.ko : selectedRegion.label.en;
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState(() => (id ? "" : selectedRegionName));
  const [selectedRegionCode, setSelectedRegionCode] = useState(() => (id ? null : selectedRegion.code || null));
  const [selectedRegionPlaceId, setSelectedRegionPlaceId] = useState(null);
  const [selectedRegionNames, setSelectedRegionNames] = useState(() => (id ? {} : selectedRegion.label || {}));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);

  useEffect(() => {
    if (!isLogin()) {
      alert(copy[useLangStore.getState().currentLang]?.loginRequired || copy.ko.loginRequired);
      navigate("/login", { replace: true });
      return;
    }

    if (!id) return;

    getPost(id)
      .then((post) => {
        const activeLang = useLangStore.getState().currentLang;
        const activeCopy = copy[activeLang] || copy.ko;
        setTitle(post.title || "");
        setContent(normalizeEditorContent(post.content || ""));
        setLocation(translatedRegionName(post.regionName || post.region?.displayName || post.region?.name || "", activeLang));
        setSelectedRegionCode(post.region?.code || null);
        setSelectedRegionPlaceId(post.region?.googlePlaceId || null);
        setSelectedRegionNames(post.region?.localizedNames || {});
        setStartDate(post.travelStartDate || "");
        setEndDate(post.travelEndDate || "");
        setTags(Array.isArray(post.tags) ? post.tags : []);
        const postImages = Array.isArray(post.images) ? post.images : [];
        setImages(
          postImages.length
            ? postImages.map((image) => ({
                imageUrl: image.imageUrl,
                altText: image.altText || post.title || activeCopy.travelImage,
              }))
            : post.coverImageUrl
              ? [{ imageUrl: post.coverImageUrl, altText: post.title || activeCopy.travelImage }]
              : [],
        );
      })
      .catch((error) => {
        const activeCopy = copy[useLangStore.getState().currentLang] || copy.ko;
        alert(getApiErrorMessage(error, activeCopy.loadFailed));
        navigate("/my-posts");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleRegionSelect = (region) => {
    setLocation(currentLang === "ko" ? region.label.ko : region.label.en);
    setSelectedRegionCode(region.code || null);
    setSelectedRegionPlaceId(null);
    setSelectedRegionNames(region.label || {});
  };

  const handleRegionSearch = (query, region) => {
    if (region?.code) {
      setLocation(currentLang === "ko" ? region.label.ko : region.label.en);
      setSelectedRegionCode(region.code);
      setSelectedRegionPlaceId(null);
      setSelectedRegionNames(region.label || {});
      return;
    }
    setLocation(query);
    setSelectedRegionCode(null);
    setSelectedRegionPlaceId(region?.placeId || null);
    setSelectedRegionNames(region?.label ? { [currentLang]: region.label[currentLang] } : {});
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert(t.titleRequired);
      return;
    }
    if (!location.trim()) {
      alert(t.regionRequired);
      return;
    }
    if (!richTextToPlainText(content)) {
      alert(t.contentRequired);
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      alert(t.invalidDates);
      return;
    }

    try {
      setSubmitting(true);
      const pendingFiles = images.filter((image) => image.file).map((image) => image.file);
      let resolvedImages = images;

      if (pendingFiles.length > 0) {
        const uploadedImages = await uploadPostImages(pendingFiles);
        let uploadedIndex = 0;
        resolvedImages = images.map((image) => {
          if (!image.file) return image;
          const uploaded = uploadedImages[uploadedIndex++];
          return {
            imageUrl: uploaded.imageUrl,
            altText: image.altText || uploaded.originalName || title.trim(),
            originalName: uploaded.originalName,
          };
        });
        setImages(resolvedImages);
      }

      const request = {
        title: title.trim(),
        content,
        regionCode: selectedRegionCode,
        regionName: (selectedRegionNames[currentLang] || translatedRegionName(location, currentLang)).trim(),
        regionPlaceId: selectedRegionPlaceId,
        coverImageUrl: resolvedImages[0]?.imageUrl || null,
        images: resolvedImages.map((image) => ({
          imageUrl: image.imageUrl,
          altText: image.altText || title.trim(),
        })),
        travelStartDate: startDate || null,
        travelEndDate: endDate || null,
        tags,
      };

      let savedPost;
      if (id) {
        savedPost = await updatePost(id, request);
        alert(t.updated);
      } else {
        savedPost = await createPost(request);
        alert(t.created);
      }
      if (savedPost?.region) {
        setSelectedRegion(toRegionPreference(savedPost.region, currentLang));
      }
      navigate("/feed");
    } catch (error) {
      alert(getApiErrorMessage(error, t.saveFailed));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-8 pt-28 text-center text-slate-500">{t.loading}</div>;
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:ring-4 focus:ring-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-teal-950/40";
  const displayLocation = selectedRegionNames[currentLang] || translatedRegionName(location, currentLang);

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-background to-background pb-16 pt-24 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm text-slate-500 transition hover:bg-white hover:text-teal-700 dark:hover:bg-slate-900 dark:hover:text-teal-300"
        >
          <ChevronLeft size={17} /> {t.back}
        </button>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-xl shadow-sky-100/70 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <header className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-sky-50 px-6 py-7 sm:px-10 dark:border-slate-800 dark:from-teal-950/35 dark:via-slate-900 dark:to-sky-950/30">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-lg shadow-teal-200 dark:shadow-none">
                <Sparkles size={21} />
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-teal-600">Journey Note</p>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  {id ? t.editTitle : t.createTitle}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t.intro}
                </p>
              </div>
            </div>
          </header>

          <div className="space-y-10 px-6 py-8 sm:px-10 sm:py-10">
            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">1</span>
                <h2 className="font-bold text-slate-900 dark:text-white">{t.basicInfo}</h2>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.scheduleTitle}</span>
                  <input
                    className={`${inputClass} text-lg font-semibold`}
                    placeholder={t.titlePlaceholder}
                    value={title}
                    maxLength={120}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  <span className="mt-1.5 block text-right text-xs text-slate-400">{title.length}/120</span>
                </label>

                <div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t.region}</span>
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                    <MapPin size={19} className="shrink-0 text-teal-500" />
                    <span className={`min-w-0 flex-1 text-sm ${location ? "text-slate-900 dark:text-slate-100" : "text-slate-400"}`}>
                      {displayLocation || t.selectRegion}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRegionPickerOpen(true)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200"
                    >
                      <RefreshCw size={13} /> {t.changeRegion}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-5">
                  <label className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <CalendarDays size={15} className="text-teal-500" /> {t.startDate}
                    </span>
                    <input type="date" className={inputClass} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  </label>
                  <label className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <CalendarDays size={15} className="text-teal-500" /> {t.endDate}
                    </span>
                    <input type="date" min={startDate || undefined} className={inputClass} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                  </label>
                </div>
              </div>
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">2</span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{t.story}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.storyHelp}</p>
                </div>
              </div>
              <RichTextEditor value={content} onChange={setContent} lang={currentLang} />
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">3</span>
                <div>
                  <h2 className="font-bold text-slate-900 dark:text-white">{t.photos}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.photosHelp}</p>
                </div>
              </div>
              <MultipleImageUploader images={images} onChange={setImages} lang={currentLang} />
            </section>

            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            <section>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-200">4</span>
                <h2 className="font-bold text-slate-900 dark:text-white">{t.tagsSection}</h2>
              </div>
              <TagInput tags={tags} onChange={setTags} lang={currentLang} />
            </section>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:justify-end sm:px-10 dark:border-slate-800 dark:bg-slate-950/40">
            <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-xl bg-teal-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-teal-200 transition hover:-translate-y-0.5 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
            >
              {submitting ? t.saving : id ? t.editSubmit : t.createSubmit}
            </button>
          </footer>
        </section>
      </div>

      {regionPickerOpen && (
        <RegionPicker
          currentRegion={
            [selectedRegion, ...REGIONS].find((region) => location === region.label.ko || location === region.label.en) || selectedRegion
          }
          onSelect={handleRegionSelect}
          onSearch={handleRegionSearch}
          onClose={() => setRegionPickerOpen(false)}
        />
      )}
    </main>
  );
}

export default WritePost;
