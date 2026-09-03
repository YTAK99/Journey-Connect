import { useEffect, useRef, useState } from "react";
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
  const [googleUnavailable, setGoogleUnavailable] = useState(false);
  const googleButtonRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID?.trim();

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return undefined;

    let cancelled = false;
    let loadTimeout;
    const script = document.getElementById("google-identity-services");

    const handleCredential = async ({ credential }) => {
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
    };

    const initializeGoogleLogin = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;

      clearTimeout(loadTimeout);
      setGoogleUnavailable(false);
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential,
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: 320,
      });
    };

    const handleLoadError = () => {
      if (!cancelled) setGoogleUnavailable(true);
    };

    if (window.google?.accounts?.id) {
      initializeGoogleLogin();
    } else if (script) {
      script.addEventListener("load", initializeGoogleLogin);
      script.addEventListener("error", handleLoadError);
      loadTimeout = window.setTimeout(handleLoadError, 10000);
    } else {
      handleLoadError();
    }

    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
      script?.removeEventListener("load", initializeGoogleLogin);
      script?.removeEventListener("error", handleLoadError);
    };
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
          <div className={`mt-4 flex justify-center ${submitting ? "pointer-events-none opacity-60" : ""}`}>
            <div ref={googleButtonRef} />
          </div>
        )}
        {googleClientId && googleUnavailable && (
          <p className="mt-2 text-center text-sm text-red-600">
            {t("auth.login.googleUnavailable")}
          </p>
        )}

        <div className="mt-4 text-center text-sm">
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
