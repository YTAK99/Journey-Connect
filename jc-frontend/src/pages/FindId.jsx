import { useState } from "react";
import { Link } from "react-router";
import { findId } from "../services/auth";
import LanguageSwitcher from "../components/LanguageSwitcher";
import useTranslation from "../i18n/useTranslation";

// 가입한 이메일로 아이디를 찾는 페이지다.
function FindId() {
  const { t } = useTranslation();
  const [account, setAccount] = useState("");

  const handleFindId = () => {
    if (!account) {
      alert(t("auth.findId.required"));
      return;
    }
  
    const id = findId(account);
  
    if (id) {
      alert(t("auth.findId.found", { id }));
    } else {
      alert(t("auth.findId.notFound"));
    }
  };
  return (
    <div className="relative flex justify-center items-center h-screen bg-gray-100">
      <LanguageSwitcher className="absolute right-5 top-5" />
      <div className="w-96 bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-center mb-8">
          {t("auth.findId.title")}
        </h1>

        <input
          type="email"
          className="w-full border rounded-lg p-3 mb-5"
          placeholder={t("auth.findId.accountPlaceholder")}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />

        <button
          onClick={handleFindId}
          className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
        >
          {t("auth.findId.title")}
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

export default FindId;
