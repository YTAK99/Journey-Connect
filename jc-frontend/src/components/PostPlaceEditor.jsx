import { ChevronDown, ChevronUp, MapPin, Trash2 } from "lucide-react";
import MultipleImageUploader from "./MultipleImageUploader";
import RichTextEditor from "./RichTextEditor";

export default function PostPlaceEditor({ place,
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
  const isKorean = lang === "ko";

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
              {place.displayName || (isKorean ? "장소를 선택해 주세요" : "Choose a place")}
            </h3>
          </div>

          {/* 장소 제어 버튼 그룹 (위로 이동, 아래로 이동, 삭제) */}
          <div className="flex items-center gap-1">
            {/* 위로 이동 버튼 (첫 번째 장소면 비활성화) */}
            <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} aria-label={isKorean ? "위로 이동" : "Move up"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
              <ChevronUp size={17} />
            </button>

            {/* 아래로 이동 버튼 (마지막 장소면 비활성화) */}
            <button type="button" disabled={index === total - 1} onClick={() => onMove(index, 1)} aria-label={isKorean ? "아래로 이동" : "Move down"} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
              <ChevronDown size={17} />
            </button>

            {/* 삭제 버튼 (장소가 1개뿐이면 삭제 방지) */}
            <button type="button" disabled={total === 1} onClick={() => onRemove(index)} aria-label={isKorean ? "장소 삭제" : "Remove place"} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30">
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
                {isKorean ? "위치" : "Location"}
              </label>
              {/* 구글 지도 위치 지정/변경 모달을 띄우는 버튼 */}
              <button type="button" onClick={() => onChooseLocation(index)} className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:bg-slate-900 dark:text-teal-200">
                <MapPin size={13} /> {place.displayName ? (isKorean ? "위치 변경" : "Change") : (isKorean ? "위치 지정" : "Choose")}
              </button>
            </div>
            {/* 선택된 장소 주소/이름 상태에 따른 스타일 및 텍스트 분기 */}
            <div className={`rounded-2xl border px-4 py-4 text-sm ${place.displayName ? "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100" : "border-dashed border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900"}`}>
              {place.displayName || (isKorean ? "Google 장소 검색으로 방문 위치를 지정하세요." : "Find this stop using Google place search.")}
            </div>
          </section>

          {/* 2. 장소 이야기(RichTextEditor) 섹션 */}
          <section>
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{isKorean ? "이 장소의 이야기" : "Story at this place"}</h4>
              <p className="mt-1 text-xs text-slate-500">{isKorean ? "사진 설명과 여행 기록을 서식 도구로 작성할 수 있습니다." : "Write notes and photo context with the formatting tools."}</p>
            </div>
            {/* RichTextEditor 컴포넌트 연결 (내용 변경 시 부모 컴포넌트에 반영) */}
            <RichTextEditor value={place.content} onChange={(content) => onChange(index, { content })} lang={lang} />
          </section>

          {/* 3. 장소 사진(MultipleImageUploader) 섹션 */}
          <section>
            <div className="mb-2">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{isKorean ? "이 장소의 사진" : "Photos from this place"}</h4>
              <p className="mt-1 text-xs text-slate-500">{isKorean ? "사진 순서는 상세 글과 하단 갤러리에 그대로 반영됩니다." : "Photo order is preserved in the post and gallery."}</p>
            </div>
            {/* 다중 이미지 업로더 컴포넌트 연결 */}
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