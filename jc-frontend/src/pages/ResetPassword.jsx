import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();

  const email = location.state?.email || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleResetPassword = () => {
    if (!password || !confirmPassword) {
      alert("새 비밀번호를 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    console.log("비밀번호 변경:", email, password);

    alert("비밀번호가 변경되었습니다.");
    navigate("/login");
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-96 rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold">
          비밀번호 재설정
        </h1>

        <p className="mb-5 text-sm text-gray-500">
          {email}
        </p>

        <input
          type="password"
          className="mb-4 w-full rounded-lg border p-3"
          placeholder="새 비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          className="mb-6 w-full rounded-lg border p-3"
          placeholder="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="button"
          onClick={handleResetPassword}
          className="w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
        >
          비밀번호 변경
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

export default ResetPassword;