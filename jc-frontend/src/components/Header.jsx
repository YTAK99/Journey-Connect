import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from "react-router";
import { Bell, Languages, LogOut, Menu, Moon, Search, Settings, Sun, User, X } from "lucide-react";
import { getUser, isLogin, logout } from "../services/auth";
import useLangStore from "../store/useLangStore";
import NotificationSidebar from "../components/NotificationSidebar";

// 상단 내비게이션 바에 표시될 메뉴 항목들
const navItems = [
  { to: "/feed", label: { ko: "피드", en: "Feed" } },
  { to: "/explore", label: { ko: "탐색", en: "Explore" } },
  { to: "/crew", label: { ko: "크루", en: "Crew" } },
];

// 설정 메뉴에서 선택할 수 있는 언어 옵션
const languageOptions = [
  { value: "ko", label: "한국어", shortLabel: "KO" },
  { value: "en", label: "English", shortLabel: "EN" },
];

// 초기 다크 모드 설정 상태를 불러오는 함수
const getInitialDarkMode = () => {
  const saved = localStorage.getItem("theme");
  if (saved) return saved === "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
};

// [설정 패널 컴포넌트]
function SettingsPanel({ lang, isDark, onLangChange, onDarkToggle, onLogout }) {
  return (
    <div className="absolute right-0 top-12 z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="space-y-4">
        {/* 언어 선택 영역 */}
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

        {/* 다크 모드 토글 스위치 영역 */}
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

        {/* 로그아웃 버튼 영역 */}
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

// [메인 Header 컴포넌트]
export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // 🔥 1. currentUser 상태 선언
  const [currentUser, setCurrentUser] = useState(() => getUser());

  // 상태 관리 (모바일 메뉴 열림 여부, 설정 패널 열림 여부, 검색어, 다크모드 여부)
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [isDark, setIsDark] = useState(getInitialDarkMode);

  const settingsRef = useRef(null);
  const { currentLang, setLang } = useLangStore();

  // 🔥 2. 프로필 변경 이벤트 감지 리스너 (상태 업데이트)
  useEffect(() => {
    const handleProfileUpdate = () => {
      setCurrentUser(getUser()); // 최신 유저 정보 동기화
    };

    window.addEventListener("userProfileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("userProfileUpdated", handleProfileUpdate);
  }, []);

  // 다크 모드 상태가 바뀔 때마다 HTML 루트 클래스 및 로컬스토리지 업데이트
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // 설정 패널 외부 클릭 시 패널 닫기
  useEffect(() => {
    if (!settingsOpen) return undefined;
    const closeSettingsOnOutsideClick = (event) => {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeSettingsOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeSettingsOnOutsideClick);
  }, [settingsOpen]);

  // 로그아웃 처리 함수
  const handleLogout = async () => {
    await logout();
    setSettingsOpen(false);
    setIsMenuOpen(false);
    navigate("/login", { replace: true });
  };

  // 검색 제출 핸들러
  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchText.trim();
    const searchablePaths = ["/feed", "/explore"];
    const targetPath = searchablePaths.includes(location.pathname) ? location.pathname : "/explore";
    setIsMenuOpen(false);
    navigate(query ? `${targetPath}?q=${encodeURIComponent(query)}` : targetPath);
  };

  // 내비게이션 링크 스타일
  const navLinkClass = ({ isActive }) =>
    [
      "block rounded px-3 py-2 text-sm font-medium transition-colors md:p-0 md:hover:bg-transparent",
      isActive
        ? "text-teal-600 dark:text-teal-300"
        : "text-gray-900 hover:bg-gray-100 md:hover:text-teal-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:md:hover:text-teal-300",
    ].join(" ");

  // 검색창 JSX
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
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between px-4 py-3">

        {/* 로고 */}
        <Link to="/feed" className="self-center whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-slate-50">
          JC
        </Link>

        {/* 우측 아이콘 영역 */}
        <div className="flex items-center space-x-3 md:order-3">

          {/* 알림 버튼 */}
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
            aria-label={currentLang === "ko" ? "알람" : "Notifications"}
          >
            <Bell size={18} />
          </button>

          {/* 프로필 이미지 버튼 */}
          <button
            type="button"
            onClick={() => navigate("/mypage")}
            className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300 dark:bg-slate-700 dark:focus:ring-slate-600"
            aria-label={currentLang === "ko" ? "프로필" : "Profile"}
          >
            {isLogin() ? (
              <img
                src={currentUser?.profileImageUrl || currentUser?.profileImage || currentUser?.image || "/user_1.jpg"}
                alt="프로필"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="m-1.5 h-5 w-5 text-white" />
            )}
          </button>

          {/* 설정 버튼 */}
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

          {/* 햄버거 메뉴 버튼 */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:ring-slate-700 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label={currentLang === "ko" ? "메뉴" : "Menu"}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* 내비게이션 메뉴 */}
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

        {/* 데스크탑 검색창 */}
        <form onSubmit={submitSearch} className="relative hidden md:order-2 md:block md:w-1/3">
          {searchInput}
        </form>
      </div>

      <NotificationSidebar
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />
    </nav>
  );
}