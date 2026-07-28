import { useRef, useState } from "react";
import { Camera, Check, ImagePlus, LoaderCircle, Star, Trash2 } from "lucide-react";
import { getApiErrorMessage } from "../services/apiClient";
import { uploadPostImages } from "../services/postApi";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const copy = {
  ko: {
    maxAlert: `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`,
    invalidAlert: "JPEG, PNG, WebP, GIF 형식의 5MB 이하 이미지만 첨부해주세요.",
    uploadFailed: "이미지 업로드에 실패했습니다.",
    uploading: "이미지를 안전하게 저장하는 중...",
    select: "여행 사진을 선택하세요",
    limits: "JPEG · PNG · WebP · GIF / 장당 5MB / 최대 10장",
    travelImage: "여행 이미지",
    cover: "대표",
    setCover: "대표 지정",
    remove: "번째 이미지 제거",
    coverHelp: "첫 번째 사진이 피드의 대표 이미지로 표시됩니다.",
  },
  en: {
    maxAlert: `You can attach up to ${MAX_IMAGES} images.`,
    invalidAlert: "Please select JPEG, PNG, WebP, or GIF images up to 5MB each.",
    uploadFailed: "Failed to upload images.",
    uploading: "Uploading your images securely...",
    select: "Choose your travel photos",
    limits: "JPEG · PNG · WebP · GIF / 5MB each / up to 10",
    travelImage: "Travel image",
    cover: "Cover",
    setCover: "Set as cover",
    remove: "Remove image",
    coverHelp: "The first photo will be used as the cover image in the feed.",
  },
};

export default function MultipleImageUploader({ images, onChange, lang = "ko" }) {
  const t = copy[lang] || copy.ko;
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event) => {
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

    try {
      setUploading(true);
      const uploaded = await uploadPostImages(selected);
      onChange([
        ...images,
        ...uploaded.map((image) => ({
          imageUrl: image.imageUrl,
          altText: image.originalName || t.travelImage,
          originalName: image.originalName,
        })),
      ]);
    } catch (error) {
      alert(getApiErrorMessage(error, t.uploadFailed));
    } finally {
      setUploading(false);
    }
  };

  const makeCover = (index) => {
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
        disabled={uploading || images.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-200 bg-teal-50/60 px-6 py-8 text-center transition hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-900 dark:bg-teal-950/20 dark:hover:border-teal-700"
      >
        {uploading ? <LoaderCircle className="mb-3 animate-spin text-teal-600" size={28} /> : <ImagePlus className="mb-3 text-teal-600" size={28} />}
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {uploading ? t.uploading : t.select}
        </span>
        <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.limits}</span>
      </button>

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div key={`${image.imageUrl}-${index}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <img src={image.imageUrl} alt={image.altText || `${t.travelImage} ${index + 1}`} className="h-36 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
                {index === 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-2 py-1 text-[11px] font-semibold text-white">
                    <Check size={11} /> {t.cover}
                  </span>
                ) : (
                  <button type="button" onClick={() => makeCover(index)} className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white">
                    <Star size={11} /> {t.setCover}
                  </button>
                )}
                <button type="button" aria-label={lang === "ko" ? `${index + 1}${t.remove}` : `${t.remove} ${index + 1}`} onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white hover:bg-rose-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Camera size={13} /> {t.coverHelp} ({images.length}/{MAX_IMAGES})
      </div>
    </div>
  );
}
