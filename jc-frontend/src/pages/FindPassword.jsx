import { useState } from "react";
import { Link, useNavigate } from "react-router";

function FindPassword() {
  const [account, setAccount] = useState("");
  const navigate = useNavigate();

  const handleFindPassword = () => {
    if (!account) {
      alert("가입한 이메일을 입력하세요.");
      return;
    }

    // 일단 이메일을 다음 페이지로 전달
    navigate("/reset-password", {
      state: { email: account },
    });
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-96 rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold">
          비밀번호 찾기
        </h1>

        <input
          type="email"
          className="mb-5 w-full rounded-lg border p-3"
          placeholder="가입한 이메일"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />

        <button
          type="button"
          onClick={handleFindPassword}
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
        >
          비밀번호 재설정
        </button>

        <Link
          to="/login"
          className="mt-5 block text-center text-blue-600 hover:underline"
        >
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default FindPassword;