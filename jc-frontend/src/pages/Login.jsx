import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";

import { getApiErrorMessage } from "../services/apiClient";
import { login } from "../services/auth";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 일반 로그인
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

  // Google 로그인
  const handleGoogleLogin = (response) => {
    console.log("Google 로그인 성공!");
    console.log("Google credential:", response.credential);

    // 현재는 백엔드가 없으므로 여기까지만
    // 나중에 백엔드가 만들어지면
    // response.credential을 백엔드로 전달
  };

  // Google 로그인 초기화
  useEffect(() => {
    if (!window.google) {
      console.error("Google Identity Services가 로드되지 않았습니다.");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: "여기에_구글_CLIENT_ID",
      callback: handleGoogleLogin,
    });
  }, []);

  // Google 로그인 실행
  const startGoogleLogin = () => {
    if (!window.google) {
      alert("Google 로그인 서비스를 불러오지 못했습니다.");
      return;
    }

    window.google.accounts.id.prompt();
  };

  return (
    <main className="flex h-screen items-center justify-center bg-gray-100 px-4">
      <section className="w-96 max-w-full rounded-lg bg-white p-8 shadow-lg">

        {/* 제목 */}
        <h1 className="mb-8 text-center text-3xl font-bold text-title">
          Journey Connect
        </h1>

        {/* 이메일 */}
        <input
          className="mb-4 w-full rounded-lg border p-3"
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {/* 비밀번호 */}
        <input
          type="password"
          className="mb-6 w-full rounded-lg border p-3"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleLogin();
            }
          }}
        />

        {/* 일반 로그인 */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-3 text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "로그인 중..." : "로그인"}
        </button>


        {/* Google 로그인 */}
        <button
          type="button"
          onClick={startGoogleLogin}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          {/* Google 아이콘 */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />

            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />

            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />

            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>

          <span>Google 계정으로 로그인</span>
        </button>

        {/* 비밀번호 찾기 */}
        <div className="mt-5 flex items-center justify-center text-sm">
          <Link
            to="/find-password"
            className="text-blue-600 hover:underline"
          >
            비밀번호 찾기
          </Link>
        </div>

        {/* 회원가입 */}
        <Link
          to="/signup"
          className="mt-4 block text-center text-blue-600 hover:underline"
        >
          회원가입
        </Link>

      </section>
    </main>
  );
}