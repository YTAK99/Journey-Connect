import { useState } from "react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { signup } from "../services/auth";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";

function Signup() {
  // 클라이언트 입력 확인 후 회원가입하며, 성공 응답의 토큰으로 즉시 로그인 상태가 됩니다.
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!nickname || !email || !password || !confirmPassword) {
      alert(t("auth.signup.required"));
      return;
    }

    if (password !== confirmPassword) {
      alert(t("auth.signup.passwordMismatch"));
      return;
    }

    if (password.length < 8) {
      alert(t("auth.signup.passwordLength"));
      return;
    }

    try {
      setSubmitting(true);
      await signup({ email, password, nickname });
      navigate("/feed", { replace: true });
    } catch (error) {
      alert(getApiErrorMessage(error, t("auth.signup.failed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <section className="w-[400px] max-w-full rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold text-title">{t("auth.signup.title")}</h1>

        <input
          placeholder={t("auth.nickname")}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="mb-3 w-full rounded border p-3"
        />

        <input
          placeholder={t("auth.email")}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-3 w-full rounded border p-3"
        />

        <input
          type="password"
          placeholder={t("auth.password")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-3 w-full rounded border p-3"
        />

        <input
          type="password"
          placeholder={t("auth.confirmPassword")}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="mb-5 w-full rounded border p-3"
          onKeyDown={(event) => {
            if (event.key === "Enter") handleSignup();
          }}
        />

        <button
          type="button"
          onClick={handleSignup}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? t("auth.signup.submitting") : t("auth.signup.action")}
        </button>

        <p className="mt-4 text-center text-sm">
          {t("auth.signup.hasAccount")}
          <button type="button" onClick={() => navigate("/login")} className="ml-2 text-blue-600 hover:underline">
            {t("auth.login.action")}
          </button>
        </p>
      </section>
    </main>
  );
}

export default Signup;
