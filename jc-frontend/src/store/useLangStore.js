import { create } from "zustand";
import { getLocale, resolveLanguage } from "../i18n";

// 앱 초기 로드 시 사용할 언어를 결정합니다.
// 1) 로컬 스토리지에 저장된 언어가 있으면 그 값을 사용하고,
// 2) 없다면 브라우저가 제공하는 기본 언어를 사용합니다.
const getInitialLanguage = () => {
  const storedLanguage =
    typeof window !== "undefined"
      ? window.localStorage.getItem("lang")
      : null;

  const browserLanguage =
    typeof navigator !== "undefined"
      ? navigator.languages?.[0] || navigator.language
      : null;

  return resolveLanguage(storedLanguage || browserLanguage);
};

// 문서의 html lang 속성을 현재 언어에 맞춰 업데이트합니다.
const applyDocumentLanguage = (language) => {
  if (typeof document !== "undefined") {
    document.documentElement.lang = getLocale(language);
  }
};

const initialLanguage = getInitialLanguage();
applyDocumentLanguage(initialLanguage);

const useLangStore = create((set) => ({
  currentLang: initialLanguage,

  // 언어 변경 함수
  // 입력된 언어 값을 normalize(resolve)하고,
  // 로컬 스토리지에 저장한 뒤 문서 lang 속성을 갱신합니다.
  setLang: (language) => {
    const nextLanguage = resolveLanguage(language);

    if (typeof window !== "undefined") {
      window.localStorage.setItem("lang", nextLanguage);
    }

    applyDocumentLanguage(nextLanguage);
    set({ currentLang: nextLanguage });
  },
}));

export default useLangStore;