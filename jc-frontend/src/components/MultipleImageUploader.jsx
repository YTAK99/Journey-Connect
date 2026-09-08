import { useEffect, useRef } from "react";
import { Camera, Check, ImagePlus, Star, X } from "lucide-react";
import { getMessages, translate } from "../i18n";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function MultipleImageUploader({
  images,
  onChange,
  lang = "ko",
  selectedCoverKey,
  onSelectCover,
}) {
  const t = getMessages(lang, "imageUploader");
  const inputRef = useRef(null);
  const previewUrlsRef = useRef(new Set());

  // 로컬 미리보기 URL은 브라우저 메모리를 점유하므로 삭제하거나 화면을 벗어날 때 반드시 해제합니다.
  useEffect(() => () => {
    previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    previewUrlsRef.current.clear();
  }, []);

  const handleFiles = (event) => {
    // 서버 검증 전에 개수·MIME 타입·크기를 확인해 잘못된 파일을 빠르게 차단합니다.
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selected.length) return;
    if (images.length + selected.length > MAX_IMAGES) {
      alert(t.maxAlert);
      return;
    }
    const invalid = selected.find((file) => !allowedTypes.has(file.type) || file.size > MAX_FILE_SIZE);
    if (invalid) {
      alert(t.invalidAlert);
      return;
    }

    const selectedImages = selected.map((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      return {
        localId: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${index}-${file.name}`,
        file,
        previewUrl,
        altText: file.name || t.travelImage,
        originalName: file.name,
      };
    });
    onChange([...images, ...selectedImages]);
  };

  const removeImage = (index) => {
    const removed = images[index];
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
      previewUrlsRef.current.delete(removed.previewUrl);
    }
    onChange(images.filter((_, imageIndex) => imageIndex !== index));
  };

  const makeCover = (index) => {
    if (onSelectCover) {
      onSelectCover(images[index]);
      return;
    }
    // 배열의 첫 항목을 대표 이미지로 사용하는 작성 요청 규칙에 맞춰 선택 이미지를 맨 앞으로 옮깁니다.
    if (index === 0) return;
    const next = [...images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    onChange(next);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      <button
        type="button"
        disabled={images.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/60 px-6 py-8 text-center transition hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-900 dark:bg-teal-950/20 dark:hover:border-teal-700"
      >
        <ImagePlus className="mb-3 text-teal-600" size={28} />
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {t.select}
        </span>
        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.limits}</span>
      </button>

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const imageKey = image.localId || image.imageUrl;
            const isCover = onSelectCover ? selectedCoverKey === imageKey : index === 0;
            return (
            <div key={image.localId || `${image.imageUrl}-${index}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <img src={image.previewUrl || image.imageUrl} alt={image.altText || `${t.travelImage} ${index + 1}`} className="h-28 w-full object-cover" />
              <button
                type="button"
                aria-label={lang === "ko" ? `${index + 1}${t.remove}` : `${t.remove} ${index + 1}`}
                onClick={() => removeImage(index)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white shadow-sm transition hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X size={15} />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
                {isCover ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-2 py-1 text-[11px] font-semibold text-white">
                    <Check size={11} /> {t.cover}
                  </span>
                ) : (
                  <button type="button" onClick={() => makeCover(index)} className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white">
                    <Star size={11} /> {t.setCover}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Camera size={13} /> {onSelectCover ? translate(lang, "imageUploader.chooseCover") : t.coverHelp} ({images.length}/{MAX_IMAGES})
      </div>
    </div>
  );
}
