import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../services/apiClient";
import { login } from "../services/auth";

export default function Login() {
  // 로그인 성공 시 토큰 저장은 auth 서비스에 맡기고 피드 화면으로 이동합니다.
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      alert("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      await login(email, password);
      navigate("/feed", { replace: true });
    } catch (error) {
      alert(getApiErrorMessage(error, "로그인에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex h-screen items-center justify-center bg-gray-100 px-4">
      <section className="w-96 max-w-full rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold text-title">Journey Connect</h1>

        <input
          className="mb-4 w-full rounded-lg border p-3"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          type="password"
          className="mb-6 w-full rounded-lg border p-3"
          placeholder="비밀번호"
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
          {submitting ? "로그인 중..." : "로그인"}
        </button>

        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Link to="/find-id" className="text-blue-600 hover:underline">
            아이디 찾기
          </Link>
          <span className="text-gray-400">|</span>
          <Link to="/find-password" className="text-blue-600 hover:underline">
            비밀번호 찾기
          </Link>
        </div>

        <Link to="/signup" className="mt-4 block text-center text-blue-600 hover:underline">
          회원가입
        </Link>
      </section>
    </main>
  );
}
