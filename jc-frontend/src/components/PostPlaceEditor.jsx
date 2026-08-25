import { ChevronDown, ChevronUp, MapPin, Trash2 } from "lucide-react";
import MultipleImageUploader from "./MultipleImageUploader";
import RichTextEditor from "./RichTextEditor";

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
  const isKorean = lang === "ko";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/35">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-extrabold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Stop {index + 1}</p>
          <h3 className="truncate font-bold text-slate-900 dark:text-white">
            {place.displayName || (isKorean ? "장소를 선택해 주세요" : "Choose a place")}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={isKorean ? "위로 이동" : "Move up"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
            <ChevronUp size={17} />
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label={isKorean ? "아래로 이동" : "Move down"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
            <ChevronDown size={17} />
          </button>
          <button type="button" disabled={total === 1} onClick={() => onRemove(index)} aria-label={isKorean ? "장소 삭제" : "Remove place"} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30">
            <Trash2 size={17} />
          </button>
        </div>
      </header>

      <div className="space-y-7 p-5 sm:p-6">
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {isKorean ? "위치" : "Location"}
            </label>
            <button type="button" onClick={() => onChooseLocation(index)} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-200">
              <MapPin size={13} /> {place.displayName ? (isKorean ? "위치 변경" : "Change") : (isKorean ? "위치 지정" : "Choose")}
            </button>
          </div>
          <div className={`rounded-2xl border px-4 py-4 text-sm ${place.displayName ? "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100" : "border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"}`}>
            {place.displayName || (isKorean ? "Google 장소 검색으로 방문 위치를 지정하세요." : "Find this stop using Google place search.")}
          </div>
        </section>

        <section>
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{isKorean ? "이 장소의 이야기" : "Story at this place"}</h4>
            <p className="mt-1 text-xs text-slate-500">{isKorean ? "사진 설명과 여행 기록을 서식 도구로 작성할 수 있습니다." : "Write notes and photo context with the formatting tools."}</p>
          </div>
          <RichTextEditor value={place.content} onChange={(content) => onChange(index, { content })} lang={lang} />
        </section>

        <section>
          <div className="mb-2">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{isKorean ? "이 장소의 사진" : "Photos from this place"}</h4>
            <p className="mt-1 text-xs text-slate-500">{isKorean ? "사진 순서는 상세 글과 하단 갤러리에 그대로 반영됩니다." : "Photo order is preserved in the post and gallery."}</p>
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
