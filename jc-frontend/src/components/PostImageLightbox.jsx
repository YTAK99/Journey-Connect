import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function PostImageLightbox({ images, index, onIndexChange, onClose }) {
  const closeButtonRef = useRef(null);
  const image = images[index];
  const hasMultiple = images.length > 1;
  const previous = () => onIndexChange((index - 1 + images.length) % images.length);
  const next = () => onIndexChange((index + 1) % images.length);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasMultiple) previous();
      if (event.key === "ArrowRight" && hasMultiple) next();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="사진 크게 보기" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="사진 크게 보기 닫기" className="absolute right-4 top-4 z-10 rounded-full bg-black/45 p-3 text-white transition hover:bg-black/70"><X size={24} /></button>
      {hasMultiple && <button type="button" onClick={previous} aria-label="이전 사진" className="absolute left-3 z-10 rounded-full bg-black/45 p-3 text-white transition hover:bg-black/70 sm:left-7"><ChevronLeft size={30} /></button>}
      <figure className="flex h-full w-full flex-col items-center justify-center gap-3">
        <img src={image.imageUrl} alt={image.altText || `사진 ${index + 1}`} className="max-h-[calc(100vh-6rem)] max-w-full select-none object-contain" />
        <figcaption className="rounded-full bg-black/45 px-3 py-1 text-sm text-white">{index + 1} / {images.length}</figcaption>
      </figure>
      {hasMultiple && <button type="button" onClick={next} aria-label="다음 사진" className="absolute right-3 z-10 rounded-full bg-black/45 p-3 text-white transition hover:bg-black/70 sm:right-7"><ChevronRight size={30} /></button>}
    </div>
  );
}
