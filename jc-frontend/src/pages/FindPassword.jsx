import { useState } from "react";
import { Link } from "react-router";
import { findPassword } from "../services/auth";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";

// 아이디와 이메일로 비밀번호를 찾는 페이지다.
function FindPassword() {
  const { t } = useTranslation();
  const [id, setId] = useState("");
  const [account, setAccount] = useState("");



const handleFindPassword = () => {
  if (!id || !account) {
    alert(t("auth.findPassword.required"));
    return;
  }

  const pw = findPassword(id, account);

  if (pw) {
    alert(t("auth.findPassword.found", { password: pw }));
  } else {
    alert(t("auth.findPassword.notFound"));
  }
};

  return (
    <div className="relative flex justify-center items-center h-screen bg-gray-100">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <div className="w-96 bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-center mb-8">
          {t("auth.findPassword.title")}
        </h1>
        <input
  type="text"
  className="w-full border rounded-lg p-3 mb-4"
  placeholder={t("auth.findPassword.idPlaceholder")}
  value={id}
  onChange={(e) => setId(e.target.value)}
/>

        <input
          type="email"
          className="w-full border rounded-lg p-3 mb-5"
          placeholder={t("auth.findId.accountPlaceholder")}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />

        <button
          onClick={handleFindPassword}
          className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
        >
          {t("auth.findPassword.title")}
        </button>

        <Link
          to="/login"
          className="block text-center mt-5 text-blue-600 hover:underline"
        >
          {t("auth.backToLogin")}
        </Link>

      </div>
    </div>
  );
}

export default FindPassword;
