import { useState } from "react";
import { X } from "lucide-react";

const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 20;

const copy = {
  ko: {
    help: "태그를 입력하고 Enter를 눌러주세요. 검색에 활용됩니다.",
    placeholder: "예: 제주맛집",
    duplicate: "이미 입력한 태그입니다.",
    tooLong: "태그는 20자 이하로 입력해주세요.",
    remove: "태그 삭제",
  },
  en: {
    help: "Type a tag and press Enter. Tags help other travelers find your post.",
    placeholder: "e.g. JejuFood",
    duplicate: "You already added that tag.",
    tooLong: "Tags must be 20 characters or fewer.",
    remove: "Remove tag",
  },
};

const cleanTag = (value) => value.trim().replace(/^#+/, "").trim().replace(/\s+/g, " ");
// 대소문자와 공백만 다른 태그를 같은 값으로 판단하되 화면에는 사용자가 입력한 표기를 유지합니다.
const normalizeTag = (value) => value.toLocaleLowerCase().replace(/\s+/g, "");

export default function TagInput({ tags, onChange, lang = "ko" }) {
  const [input, setInput] = useState("");
  const t = copy[lang] || copy.ko;

  const addTag = () => {
    const tag = cleanTag(input);
    if (!tag) return;
    if (tag.length > MAX_TAG_LENGTH) {
      alert(t.tooLong);
      return;
    }
    if (tags.some((item) => normalizeTag(item) === normalizeTag(tag))) {
      alert(t.duplicate);
      return;
    }
    if (tags.length >= MAX_TAGS) return;
    onChange([...tags, tag]);
    setInput("");
  };

  const handleKeyDown = (event) => {
    // Enter·쉼표로 태그를 확정하고, 빈 입력에서 Backspace를 누르면 마지막 태그를 제거합니다.
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    } else if (event.key === "Backspace" && !input && tags.length) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t.help}</p>
        <span className="shrink-0 text-xs text-slate-400">{tags.length}/{MAX_TAGS}</span>
      </div>

      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 transition focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-teal-950/40">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-lg border border-teal-200/70 bg-teal-50/65 py-1 pl-2.5 pr-1.5 text-xs font-medium text-teal-700 backdrop-blur-sm dark:border-teal-800/60 dark:bg-teal-950/35 dark:text-teal-200">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((item) => item !== tag))} aria-label={`${t.remove}: ${tag}`} className="flex h-5 w-5 items-center justify-center rounded-md text-teal-500 hover:bg-teal-100 hover:text-rose-500 dark:hover:bg-teal-900/60">
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            value={input}
            maxLength={MAX_TAG_LENGTH + 1}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length ? "" : t.placeholder}
            className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
        )}
      </div>
    </div>
  );
}
