import { Link } from "react-router";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";
import { isLogin } from "../services/auth";

export default function Home() {
  const { t } = useTranslation();
  // 비로그인 사용자의 서비스 진입점으로 검색과 로그인/가입 경로를 안내합니다.
  return (
    <div className="w-screen h-screen bg-[url('/home_img_1.png')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-black/30" />

      <div className="absolute left-12 top-8 z-10 flex items-baseline gap-3 text-white md:left-24 md:top-10">
        <span className="text-xl font-bold md:text-2xl">Journey Connect</span>
        <span className="text-sm text-white/50">|</span>
        <span className="text-sm text-white/60">JC</span>
      </div>
      <LanguageSwitcher inverted className="absolute right-6 top-6 z-20 md:right-12 md:top-8" />

      <div className="relative z-10 flex flex-col items-start justify-center min-h-screen px-12 md:px-24">
        <div>
          <h1 className="flex flex-col gap-3 text-4xl font-extrabold leading-tight text-white drop-shadow-lg md:gap-4 md:text-5xl">
            <span>{t("home.heading")}</span>
            <span>Journey Connect</span>
          </h1>

          <p className="mb-8 mt-5 text-sm leading-relaxed text-white/60 md:text-base">
            {t("home.description")}
          </p>
        </div>

        <Link
          to={isLogin() ? "/feed" : "/login"}
          className="px-8 py-4 text-base md:text-lg font-bold text-white bg-blue-600 rounded-xl shadow-xl hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
        >
          {t("home.getStarted")}
        </Link>
      </div>
    </div>
  );
}
