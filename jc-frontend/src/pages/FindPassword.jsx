import { useState } from "react";
import { Link } from "react-router";
import { findPassword } from "../services/auth";

// 아이디와 이메일로 비밀번호를 찾는 페이지다.
function FindPassword() {
  const [id, setId] = useState("");
  const [account, setAccount] = useState("");



const handleFindPassword = () => {
  if (!id || !account) {
    alert("아이디와 이메일을 모두 입력하세요.");
    return;
  }

  const pw = findPassword(id, account);

  if (pw) {
    alert(`회원님의 비밀번호는 "${pw}" 입니다.`);
  } else {
    alert("일치하는 회원 정보가 없습니다.");
  }
};

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="w-96 bg-white rounded-xl shadow-lg p-8">

        <h1 className="text-3xl font-bold text-center mb-8">
          비밀번호 찾기
        </h1>
        <input
  type="text"
  className="w-full border rounded-lg p-3 mb-4"
  placeholder="아이디"
  value={id}
  onChange={(e) => setId(e.target.value)}
/>

        <input
          type="email"
          className="w-full border rounded-lg p-3 mb-5"
          placeholder="가입한 계정(이메일)"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />

        <button
          onClick={handleFindPassword}
          className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
        >
          비밀번호 찾기
        </button>

        <Link
          to="/login"
          className="block text-center mt-5 text-blue-600 hover:underline"
        >
          로그인으로 돌아가기
        </Link>

      </div>
    </div>
  );
}

export default FindPassword;