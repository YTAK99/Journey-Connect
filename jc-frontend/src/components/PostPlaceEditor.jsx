import { ChevronDown, ChevronUp, MapPin, Trash2 } from "lucide-react";
import MultipleImageUploader from "./MultipleImageUploader";
import RichTextEditor from "./RichTextEditor";
import { translate } from "../i18n";

export default function PostPlaceEditor({
  place,
  index,
  total,
  lang,
  onChange,
  onChooseLocation,
  onMove,
  onRemove,
  selectedCoverKey,
  onSelectCover,
}) {
  // 언어가 한국어('ko')인지 확인하여 UI 텍스트 분기 처리에 사용
  const t = (key) => translate(lang, key);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/35">
      {/* 상단 헤더: 순서 번호, 장소 이름, 순서 이동 및 삭제 버튼 영역 */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        {/* 장소 순서 번호 표시 배지 (0부터 시작하므로 +1) */}
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-extrabold text-white">
          {index + 1}
        </span>
        {/* 장소 타이틀 영역 */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Stop {index + 1}</p>
          <h3 className="truncate font-bold text-slate-900 dark:text-white">
            {place.displayName || t("placeEditor.choosePlace")}
          </h3>
        </div>
        {/* 장소 제어 버튼 그룹 (위로 이동, 아래로 이동, 삭제) */}
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={t("placeEditor.moveUp")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
            <ChevronUp size={17} />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label={t("placeEditor.moveDown")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
            <ChevronDown size={17} />
          </button>
          <button type="button" disabled={total === 1} onClick={() => onRemove(index)} aria-label={t("placeEditor.remove")} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30">
            <Trash2 size={17} />
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 (위치, 이야기, 사진) */}
      <div className="space-y-7 p-5 sm:p-6">
        {/* 1. 위치(Location) 섹션 */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("placeEditor.location")}
            </label>
            <button type="button" onClick={() => onChooseLocation(index)} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-200">
              <MapPin size={13} /> {place.displayName ? t("placeEditor.change") : t("placeEditor.choose")}
            </button>
          </div>
          <div className={`rounded-2xl border px-4 py-4 text-sm ${place.displayName ? "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100" : "border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"}`}>
            {place.displayName || t("placeEditor.locationHelp")}
          </div>
        </section>

        {/* 장소별 다중 이미지와 대표사진 선택 상태를 함께 관리합니다. */}
        <section>
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("placeEditor.story")}</h4>
            <p className="mt-1 text-xs text-slate-500">{t("placeEditor.storyHelp")}</p>
          </div>
          <RichTextEditor value={place.content} onChange={(content) => onChange(index, { content })} lang={lang} />
        </section>

        <section>
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("placeEditor.photos")}</h4>
            <p className="mt-1 text-xs text-slate-500">{t("placeEditor.photosHelp")}</p>
          </div>
          <MultipleImageUploader
            images={place.images}
            onChange={(images) => onChange(index, { images })}
            lang={lang}
            selectedCoverKey={selectedCoverKey}
            onSelectCover={onSelectCover}
          />
        </section>
      </div>
    </article>
  );
}
