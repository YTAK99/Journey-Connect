// React에서 상태(State)를 관리하기 위해 useState를 import
// 상태(State)란 화면에서 변경되는 데이터를 저장하는 공간이다.
import { useState } from "react";

function Login() {

    // ===========================
    // useState
    // ===========================

    // 아이디 입력창의 값을 저장하는 상태 변수
    // id : 현재 입력된 값
    // setId : id 값을 변경하는 함수
    const [id, setId] = useState("");

    // 비밀번호 입력창의 값을 저장하는 상태 변수
    const [pw, setPw] = useState("");

    // ===========================
    // 로그인 버튼 클릭 이벤트
    // ===========================

    // 로그인 버튼을 누르면 실행되는 함수
    const handleLogin = () => {

        // 현재 입력된 아이디와 비밀번호를 출력
        // 아직 백엔드 API가 없기 때문에 콘솔에서 정상적으로
        // 값이 들어오는지만 먼저 확인한다.
        console.log("아이디 :", id);
        console.log("비밀번호 :", pw);

        /*
        ====================================

        백엔드가 완성되면 아래처럼 변경 예정

        login({
            username: id,
            password: pw
        })

        ====================================
        */
    };

    return (

        // ===========================
        // 전체 화면
        // ===========================

        // flex
        // → Flexbox 사용

        // justify-center
        // → 가로 가운데 정렬

        // items-center
        // → 세로 가운데 정렬

        // h-screen
        // → 화면 높이를 100% 사용

        // bg-gray-100
        // → 연한 회색 배경
        <div className="flex justify-center items-center h-screen bg-gray-100">

            {/* 로그인 박스 */}

            {/*

            w-96
            → 너비

            bg-white
            → 흰색 배경

            rounded-xl
            → 둥근 모서리

            shadow-lg
            → 그림자

            p-8
            → 안쪽 여백

            */}

            <div className="w-96 bg-white rounded-xl shadow-lg p-8">

                {/* 프로젝트 제목 */}

                <h1 className="text-3xl font-bold text-center mb-8">

                    Journey Connect

                </h1>

                {/* ===========================
                    아이디 입력창
                =========================== */}

                <input

                    // 입력창 디자인
                    className="w-full border rounded-lg p-3 mb-4"

                    // 입력창 안에 표시되는 글씨
                    placeholder="아이디"

                    // 입력된 값을 id 상태와 연결
                    value={id}

                    // 입력할 때마다 실행되는 이벤트
                    // e.target.value
                    // → 현재 입력된 값
                    onChange={(e) => setId(e.target.value)}

                />

                {/* ===========================
                    비밀번호 입력창
                =========================== */}

                <input

                    // 입력되는 글자를 ●●●로 표시
                    type="password"

                    className="w-full border rounded-lg p-3 mb-6"

                    placeholder="비밀번호"

                    value={pw}

                    // 입력될 때마다 pw 상태 변경
                    onChange={(e) => setPw(e.target.value)}

                />

                {/* ===========================
                    로그인 버튼
                =========================== */}

                <button

                    // 버튼 클릭 시 handleLogin 실행
                    onClick={handleLogin}

                    className="w-full bg-blue-600 text-white rounded-lg py-3 hover:bg-blue-700"

                >

                    로그인

                </button>

            </div>

        </div>

    );

}

// 다른 파일에서도 사용할 수 있도록 export
export default Login;