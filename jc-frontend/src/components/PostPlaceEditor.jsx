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
  const t = (key) => translate(lang, key);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-950/35">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500 text-sm font-extrabold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-600">Stop {index + 1}</p>
          <h3 className="truncate font-bold text-slate-900 dark:text-white">
            {place.displayName || t("placeEditor.choosePlace")}
          </h3>
        </div>
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

      <div className="space-y-7 p-5 sm:p-6">
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
