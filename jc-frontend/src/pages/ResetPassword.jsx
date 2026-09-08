import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";
import { getApiErrorMessage } from "../services/apiClient";
import { confirmPasswordReset } from "../services/auth";

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const email = location.state?.email || "";
  const initialToken = searchParams.get("token") || location.state?.token || "";
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleResetPassword = async () => {
    if (!token.trim() || !password || !confirmPassword) {
      alert(t("auth.resetPassword.required"));
      return;
    }
    if (password.length < 8) {
      alert(t("auth.signup.passwordLength"));
      return;
    }
    if (password !== confirmPassword) {
      alert(t("auth.signup.passwordMismatch"));
      return;
    }

    try {
      setSubmitting(true);
      await confirmPasswordReset({ token: token.trim(), newPassword: password });
      alert(t("auth.resetPassword.succeeded"));
      navigate("/login", { replace: true });
    } catch (error) {
      alert(getApiErrorMessage(error, t("auth.resetPassword.failed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex h-screen items-center justify-center bg-gray-100 px-4">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <section className="w-96 max-w-full rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-3 text-center text-3xl font-bold">{t("auth.resetPassword.title")}</h1>
        {email && <p className="mb-5 text-center text-sm text-gray-500">{email}</p>}
        {!initialToken && (
          <input
            className="mb-4 w-full rounded-lg border p-3"
            placeholder={t("auth.resetPassword.tokenPlaceholder")}
            value={token}
            onChange={(event) => setToken(event.target.value)}
          />
        )}
        <input
          type="password"
          className="mb-4 w-full rounded-lg border p-3"
          placeholder={t("auth.resetPassword.newPassword")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <input
          type="password"
          className="mb-6 w-full rounded-lg border p-3"
          placeholder={t("auth.resetPassword.confirmPassword")}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <button
          type="button"
          onClick={handleResetPassword}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? t("auth.resetPassword.submitting") : t("auth.resetPassword.action")}
        </button>
        <Link to="/login" className="mt-5 block text-center text-blue-600 hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </section>
    </main>
  );
}
