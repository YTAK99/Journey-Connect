import { useCallback } from "react";
import useLangStore from "../store/useLangStore";
import { translate } from ".";

export default function useTranslation() {
  const currentLang = useLangStore((state) => state.currentLang);
  const t = useCallback((key, variables) => translate(currentLang, key, variables), [currentLang]);
  return { currentLang, t };
}
