import { Languages } from "lucide-react";
import useLangStore from "../store/useLangStore";
import { translate } from "../i18n";

const options = ["ko", "en"];

export default function LanguageSwitcher({ className = "", inverted = false }) {
  const { currentLang, setLang } = useLangStore();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border p-1 ${
        inverted ? "border-white/30 bg-black/20" : "border-slate-200 bg-white"
      } ${className}`}
      aria-label={translate(currentLang, "common.language")}
    >
      <Languages size={15} className={inverted ? "ml-2 text-white/80" : "ml-2 text-slate-500"} />
      {options.map((language) => (
        <button
          key={language}
          type="button"
          onClick={() => setLang(language)}
          aria-pressed={currentLang === language}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            currentLang === language
              ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
              : inverted
                ? "text-white/75 hover:bg-white/10 hover:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          {translate(currentLang, `common.languages.${language}`)}
        </button>
      ))}
    </div>
  );
}
