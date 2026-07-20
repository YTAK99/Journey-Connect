import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "../services/auth";


function Signup(){

  const navigate = useNavigate();


  const [id,setId] = useState("");
  const [pw,setPw] = useState("");
  const [email,setEmail] = useState("");
  const [name,setName] = useState("");



  const handleSignup = ()=>{


    if(!id || !pw || !email){
      alert("모든 항목을 입력해주세요");
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



        <button
          onClick={handleSignup}
          className="w-full bg-cyan-500 text-white p-3 rounded-xl"
        >
          가입하기
        </button>


      </div>


    </div>

  );

}


export default Signup;