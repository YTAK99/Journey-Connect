import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Languages, LogOut, Menu, Moon, Search, Settings, Sun, User, X } from "lucide-react";
import { getUser, isLogin, logout } from "../services/auth";
import useLangStore from "../store/useLangStore";

const navItems = [
  { to: "/feed", label: { ko: "피드", en: "Feed" } },
  { to: "/explore", label: { ko: "탐색", en: "Explore" } },
  { to: "/crew", label: { ko: "크루", en: "Crew" } },
];

const languageOptions = [
  { value: "ko", label: "한국어", shortLabel: "KO" },
  { value: "en", label: "English", shortLabel: "EN" },
];

const getInitialDarkMode = () => {
  // 저장된 사용자 선택을 우선하고, 없으면 운영체제의 다크 모드 설정을 따릅니다.
  const saved = localStorage.getItem("theme");
  if (saved) return saved === "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

function SettingsPanel({ lang, isDark, onLangChange, onDarkToggle, onLogout }) {
  return (
    <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="space-y-4">
        <div>
          <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200">
            <Languages size={14} className="text-primary" />
            {lang === "ko" ? "언어" : "Language"}
          </span>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
            {languageOptions.map((option) => {
              const active = option.value === lang;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onLangChange(option.value)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-200"
                      : "text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  <span className="block text-xs opacity-70">{option.shortLabel}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-slate-700">
          <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-200">
            {isDark ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-primary" />}
            {lang === "ko" ? "다크 모드" : "Dark mode"}
          </span>
          <button
            type="button"
            onClick={onDarkToggle}
            className={`relative h-6 w-11 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-gray-300 dark:bg-slate-600"}`}
            aria-label={lang === "ko" ? "다크 모드 전환" : "Toggle dark mode"}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                isDark ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-200 pt-2 dark:border-slate-700">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <LogOut size={14} />
            {lang === "ko" ? "로그아웃" : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Header() {
  // 전역 내비게이션과 검색, 언어·테마·로그인 메뉴를 묶어 모든 주요 화면에서 공유합니다.
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [isDark, setIsDark] = useState(getInitialDarkMode);
  const settingsRef = useRef(null);
  const user = getUser();
  const { currentLang, setLang } = useLangStore();

  useEffect(() => {
    // Tailwind의 dark 변형이 동작하도록 루트 요소 클래스와 저장값을 함께 갱신합니다.
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (!settingsOpen) return undefined;

    // 설정 버튼과 패널 밖을 누르면 열린 메뉴를 즉시 닫아 화면을 가리지 않게 합니다.
    const closeSettingsOnOutsideClick = (event) => {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeSettingsOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeSettingsOnOutsideClick);
  }, [settingsOpen]);

  const handleLogout = async () => {
    await logout();
    setSettingsOpen(false);
    setIsMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchText.trim();
    const searchablePaths = ["/feed", "/explore"];
    const targetPath = searchablePaths.includes(location.pathname) ? location.pathname : "/explore";
    setIsMenuOpen(false);
    navigate(query ? `${targetPath}?q=${encodeURIComponent(query)}` : targetPath);
  };

  const navLinkClass = ({ isActive }) =>
    [
      "block rounded px-3 py-2 text-sm font-medium transition-colors md:p-0 md:hover:bg-transparent",
      isActive
        ? "text-teal-600 dark:text-teal-300"
        : "text-gray-900 hover:bg-gray-100 md:hover:text-teal-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:md:hover:text-teal-300",
    ].join(" ");

  const searchInput = (
    <>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400" />
      <input
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={currentLang === "ko" ? "검색..." : "Search..."}
        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-10 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </>
  );

  return (
    <nav className="fixed start-0 top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      {/* 고정 헤더의 세로 패딩만 줄여 모든 기능을 유지하면서 화면 점유 높이를 낮춥니다. */}
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between px-4 py-3">
        <Link to="/feed" className="self-center whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-slate-50">
          JC
        </Link>

        <div className="flex items-center space-x-3 md:order-3">
          <button
            type="button"
            onClick={() => navigate("/mypage")}
            className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300 dark:bg-slate-700 dark:focus:ring-slate-600"
            aria-label={currentLang === "ko" ? "프로필" : "Profile"}
          >
            {isLogin() ? (
              <img src={user?.profileImageUrl || "/user_1.jpg"} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="m-1.5 h-5 w-5 text-white" />
            )}
          </button>

          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={currentLang === "ko" ? "설정" : "Settings"}
            >
              <Settings size={16} />
            </button>
            {settingsOpen && (
              <SettingsPanel
                lang={currentLang}
                isDark={isDark}
                onLangChange={setLang}
                onDarkToggle={() => setIsDark((value) => !value)}
                onLogout={handleLogout}
              />
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-slate-700 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={currentLang === "ko" ? "메뉴" : "Menu"}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div className={`${isMenuOpen ? "block" : "hidden"} w-full md:order-1 md:flex md:w-auto`}>
          <form onSubmit={submitSearch} className="relative mb-4 mt-3 md:hidden">
            {searchInput}
          </form>

          <ul className="mt-4 flex flex-col rounded-lg border border-gray-100 bg-gray-50 p-4 font-medium dark:border-slate-800 dark:bg-slate-900 md:mt-0 md:flex-row md:space-x-8 md:border-0 md:bg-white md:p-0 md:dark:bg-transparent">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navLinkClass} onClick={() => setIsMenuOpen(false)}>
                  {currentLang === "ko" ? item.label.ko : item.label.en}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submitSearch} className="relative hidden md:order-2 md:block md:w-1/3">
          {searchInput}
        </form>
      </div>
    </nav>
  );
}
