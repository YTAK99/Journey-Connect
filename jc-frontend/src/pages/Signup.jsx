import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../services/apiClient";
import { signup } from "../services/auth";

function Signup() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSignup = async () => {
    if (!nickname || !email || !password || !confirmPassword) {
      alert("모든 항목을 입력해주세요.");
      return;
    }

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (password.length < 8) {
      alert("비밀번호는 8자 이상 입력해주세요.");
      return;
    }

    try {
      setSubmitting(true);
      await signup({ email, password, nickname });
      navigate("/feed", { replace: true });
    } catch (error) {
      alert(getApiErrorMessage(error, "회원가입에 실패했습니다."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-[400px] max-w-full rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold text-title">회원가입</h1>

        <input
          placeholder="닉네임"
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="mb-3 w-full rounded border p-3"
        />

        <input
          placeholder="이메일"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-3 w-full rounded border p-3"
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-3 w-full rounded border p-3"
        />

        <input
          type="password"
          placeholder="비밀번호 확인"
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
          {submitting ? "가입 중..." : "회원가입"}
        </button>

        <p className="mt-4 text-center text-sm">
          이미 계정이 있나요?
          <button type="button" onClick={() => navigate("/login")} className="ml-2 text-blue-600 hover:underline">
            로그인
          </button>
        </p>
      </section>
    </main>
  );
}

export default Signup;
