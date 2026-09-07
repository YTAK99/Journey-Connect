import { useEffect, useState } from "react";

const readDarkMode = () => typeof document !== "undefined"
  && document.documentElement.classList.contains("dark");

export default function useDocumentDarkMode() {
  const [isDark, setIsDark] = useState(readDarkMode);

  useEffect(() => {
    const root = document.documentElement;
    const syncDarkMode = () => setIsDark(root.classList.contains("dark"));
    const observer = new MutationObserver(syncDarkMode);

    syncDarkMode();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
