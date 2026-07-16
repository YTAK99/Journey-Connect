import { useState } from "react";
import { useNavigate } from "react-router-dom";


function Login() {

    const navigate = useNavigate();

    const [id, setId] = useState("");
    const [pw, setPw] = useState("");

    const handleLogin = () => {

        if (!id || !pw) {
            alert("아이디와 비밀번호를 입력하세요.");
            return;
        }
    
        if (id === "admin" && pw === "1234") {
    
            localStorage.setItem("accessToken", "fake-token");
    
            alert("로그인 성공!");
    
            navigate("/home");
    
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

            </div>

        </div>

    );

}

export default Login;