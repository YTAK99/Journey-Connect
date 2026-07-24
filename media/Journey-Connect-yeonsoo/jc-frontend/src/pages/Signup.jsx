import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../services/auth";

// 신규 사용자 회원가입 페이지다.
function Signup(){

  const navigate = useNavigate();


  const [id,setId] = useState("");
  const [pw,setPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [email,setEmail] = useState("");
  const [name,setName] = useState("");



  const handleSignup = ()=>{

    if(!id || !pw || !email){
      alert("모든 항목을 입력해주세요");
      return;
    }
    if (pw !== confirmPw) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    
    if (id.length < 4) {
      alert("아이디는 4자 이상 입력해주세요.");
      return;
    }
    
    if (pw.length < 8) {
      alert("비밀번호는 8자 이상 입력해주세요.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      alert("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    const result = signup({
      id,
      pw,
      email,
      name
    });



    if(result){

      alert("회원가입 완료");

      navigate("/login");

    }
    else{

      alert("이미 존재하는 아이디입니다.");

    }

  };



  return(

    <div className="min-h-screen flex justify-center items-center bg-slate-100">


      <div className="bg-white p-8 rounded-2xl shadow w-[400px]">


        <h1 className="text-3xl font-bold mb-6">
          회원가입
        </h1>


        <input
          placeholder="닉네임"
          value={name}
          onChange={(e)=>setName(e.target.value)}
          className="w-full border p-3 mb-3 rounded"
        />


        <input
          placeholder="아이디"
          value={id}
          onChange={(e)=>setId(e.target.value)}
          className="w-full border p-3 mb-3 rounded"
        />


        <input
          placeholder="이메일"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          className="w-full border p-3 mb-3 rounded"
        />


        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e)=>setPw(e.target.value)}
          className="w-full border p-3 mb-5 rounded"
        />
<input
  type="password"
  placeholder="비밀번호 확인"
  value={confirmPw}
  onChange={(e) => setConfirmPw(e.target.value)}
  className="w-full border p-3 mb-5 rounded"
/>



<button
  onClick={handleSignup}
  className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
>
  회원가입
</button>

<p className="text-center mt-4 text-sm">
  이미 계정이 있으신가요?

  <button
    onClick={() => navigate("/login")}
    className="text-blue-600 ml-2 hover:underline"
  >
    로그인
  </button>
</p>

      </div>


    </div>

  );

}


export default Signup;