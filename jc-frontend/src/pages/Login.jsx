import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { login, loginWithGoogle } from "../services/auth";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";

export default function Login() {
  // 로그인 성공 시 토큰 저장은 auth 서비스에 맡기고 피드 화면으로 이동합니다.
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim();

  useEffect(() => {
    if (!googleClientId || !window.google?.accounts?.id) return;

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: async ({ credential }) => {
        if (!credential) return;
        try {
          setSubmitting(true);
          await loginWithGoogle(credential);
          navigate("/feed", { replace: true });
        } catch (error) {
          alert(getApiErrorMessage(error, t("auth.login.googleFailed")));
        } finally {
          setSubmitting(false);
        }
      },
    });
  }, [googleClientId, navigate, t]);

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

        {googleClientId && (
          <button
            type="button"
            onClick={() => {
              if (!window.google?.accounts?.id) {
                alert(t("auth.login.googleUnavailable"));
                return;
              }
              window.google.accounts.id.prompt();
            }}
            disabled={submitting}
            className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            {t("auth.login.google")}
          </button>
        )}

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
