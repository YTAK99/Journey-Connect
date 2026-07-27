import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/auth";

// 사용자 로그인 화면이다.
export default function Login() {

    const navigate = useNavigate();

    const [id, setId] = useState("");
    const [pw, setPw] = useState("");


    const handleLogin = () => {

        if (!id || !pw) {
            alert("아이디와 비밀번호를 입력하세요.");
            return;
        }


        const result = login(id, pw);


        if (result) {

    
        
            navigate("/feedpage");
        
        } else {

            alert("아이디 또는 비밀번호가 틀렸습니다.");

        }

    };


    return (

        <div className="flex justify-center items-center h-screen bg-gray-100">

            <div className="w-96 bg-white rounded-xl shadow-lg p-8">

                <h1 className="text-3xl font-bold text-center mb-8">
                    Journey Connect
                </h1>


                <input
                    className="w-full border rounded-lg p-3 mb-4"
                    placeholder="아이디"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                />


                <input
                    type="password"
                    className="w-full border rounded-lg p-3 mb-6"
                    placeholder="비밀번호"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                />

<button
    onClick={handleLogin}
    className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"
>
    로그인
</button>

<div className="flex justify-center items-center gap-3 mt-4 text-sm">
    <Link
        to="/find-id"
        className="text-blue-600 hover:underline"
    >
        아이디 찾기
    </Link>

    <span className="text-gray-400">|</span>

    <Link
        to="/find-password"
        className="text-blue-600 hover:underline"
    >
        비밀번호 찾기
    </Link>
</div>

<Link
    to="/signup"
    className="block text-center mt-4 text-blue-600 hover:underline"
>
    회원가입
</Link>
            </div>

        </div>
        

    );

}
