import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { Languages, LogOut, Menu, Moon, Search, Settings, Sun, User, X } from "lucide-react";
import { getUser, isLogin, logout } from "../services/auth";
import useLangStore from "../store/useLangStore";

const navItems = [
  { to: "/feed", label: { ko: "피드", en: "Feed" } },
  { to: "/explore", label: { ko: "탐색", en: "Explore" } },
  { to: "/crew", label: { ko: "크루", en: "Crew" } },
];

function SettingsPanel({ lang, isDark, onLangToggle, onDarkToggle, onLogout }) {
  return (
    <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-gray-200 bg-white p-4 shadow-xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-700">
            <Languages size={14} className="text-primary" />
            {lang === "ko" ? "언어" : "Language"}
          </span>
          <button
            type="button"
            onClick={onLangToggle}
            className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-primary hover:text-white"
          >
            {lang === "ko" ? "한국어 > EN" : "EN > 한국어"}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-gray-700">
            {isDark ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-primary" />}
            {lang === "ko" ? "다크모드" : "Dark mode"}
          </span>
          <button
            type="button"
            onClick={onDarkToggle}
            className={`relative h-5 w-10 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-gray-300"}`}
            aria-label="다크모드"
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                isDark ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <div className="border-t border-gray-200 pt-2">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-rose-500 transition-colors hover:bg-rose-50"
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchText, setSearchText] = useState(searchParams.get("q") || "");
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");
  const user = getUser();
  const { currentLang, setLang } = useLangStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogout = async () => {
    await logout();
    setSettingsOpen(false);
    setIsMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const submitSearch = (event) => {
    event.preventDefault();
    const query = searchText.trim();
    setIsMenuOpen(false);
    navigate(query ? `/explore?q=${encodeURIComponent(query)}` : "/explore");
  };

  const navLinkClass = ({ isActive }) =>
    [
      "block rounded px-3 py-2 text-sm font-medium transition-colors md:p-0 md:hover:bg-transparent",
      isActive ? "text-teal-600" : "text-gray-900 hover:bg-gray-100 md:hover:text-teal-600",
    ].join(" ");

  const searchInput = (
    <>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
      <input
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={currentLang === "ko" ? "검색..." : "Search..."}
        className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 pl-10 text-sm text-gray-900 focus:border-teal-500 focus:outline-none focus:ring-teal-500"
      />
    </>
  );

  return (
    <nav className="fixed start-0 top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between p-4">
        <Link to="/feed" className="self-center whitespace-nowrap text-xl font-semibold text-gray-900">
          JC
        </Link>

        <div className="flex items-center space-x-3 md:order-3">
          <button
            type="button"
            onClick={() => navigate("/mypage")}
            className="flex h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-800 text-sm focus:ring-4 focus:ring-gray-300"
            aria-label="프로필"
          >
            {isLogin() ? (
              <img src={user?.profileImageUrl || "/user_1.jpg"} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="m-1.5 h-5 w-5 text-white" />
            )}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="설정"
            >
              <Settings size={16} />
            </button>
            {settingsOpen && (
              <SettingsPanel
                lang={currentLang}
                isDark={isDark}
                onLangToggle={() => setLang(currentLang === "ko" ? "en" : "ko")}
                onDarkToggle={() => setIsDark((value) => !value)}
                onLogout={handleLogout}
              />
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg p-2 text-sm text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 md:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-label="메뉴"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div className={`${isMenuOpen ? "block" : "hidden"} w-full md:order-1 md:flex md:w-auto`}>
          <form onSubmit={submitSearch} className="relative mb-4 mt-3 md:hidden">
            {searchInput}
          </form>

          <ul className="mt-4 flex flex-col rounded-lg border border-gray-100 bg-gray-50 p-4 font-medium md:mt-0 md:flex-row md:space-x-8 md:border-0 md:bg-white md:p-0">
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
