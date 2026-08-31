import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { login } from "../services/auth";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";

export default function Login() {
  // 로그인 성공 시 토큰 저장은 auth 서비스에 맡기고 피드 화면으로 이동합니다.
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert(t("auth.login.required"));
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      navigate("/feed", { replace: true });
    } catch (error) {
      alert(getApiErrorMessage(error, t("auth.login.failed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex h-screen items-center justify-center bg-gray-100 px-4">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <section className="w-96 max-w-full rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold text-title">Journey Connect</h1>

        <input
          className="mb-4 w-full rounded-lg border p-3"
          placeholder={t("auth.email")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          className="mb-6 w-full rounded-lg border p-3"
          placeholder={t("auth.password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") handleLogin();
          }}
        />

        <button
          type="button"
          onClick={handleLogin}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? t("auth.login.submitting") : t("auth.login.action")}
        </button>

        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Link to="/find-id" className="text-blue-600 hover:underline">
            {t("auth.findId.title")}
          </Link>
          <span className="text-gray-400">|</span>
          <Link to="/find-password" className="text-blue-600 hover:underline">
            {t("auth.findPassword.title")}
          </Link>
        </div>

        <Link to="/signup" className="mt-4 block text-center text-blue-600 hover:underline">
          {t("auth.signup.title")}
        </Link>
      </section>
    </main>
  );
}
