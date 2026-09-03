import { useState } from "react";
import { Link, useNavigate } from "react-router";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";
import { getApiErrorMessage } from "../services/apiClient";
import { requestPasswordReset } from "../services/auth";

export default function FindPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFindPassword = async () => {
    if (!email.trim()) {
      alert(t("auth.findPassword.required"));
      return;
    }

    try {
      setSubmitting(true);
      const result = await requestPasswordReset(email.trim());
      alert(t("auth.findPassword.requested"));
      navigate("/reset-password", {
        state: { email: email.trim(), token: result?.resetToken || "" },
      });
    } catch (error) {
      alert(getApiErrorMessage(error, t("auth.findPassword.failed")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex h-screen items-center justify-center bg-gray-100 px-4">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <section className="w-96 max-w-full rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold">{t("auth.findPassword.title")}</h1>
        <input
          type="email"
          className="mb-5 w-full rounded-lg border p-3"
          placeholder={t("auth.findPassword.emailPlaceholder")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") handleFindPassword(); }}
        />
        <button
          type="button"
          onClick={handleFindPassword}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? t("auth.findPassword.submitting") : t("auth.findPassword.action")}
        </button>
        <Link to="/login" className="mt-5 block text-center text-blue-600 hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </section>
    </main>
  );
}
