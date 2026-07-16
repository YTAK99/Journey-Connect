// // React에서 상태(State)를 관리하기 위해 useState를 import
// // 상태(State)는 사용자가 입력하는 값을 저장하는 공간이다.
// import { useState } from "react";

// function WritePost() {

//     // ===========================
//     // useState
//     // ===========================

//     // 여행 일정 제목을 저장하는 상태 변수
//     // title : 현재 제목 값
//     // setTitle : 제목을 변경하는 함수
//     const [title, setTitle] = useState("");

//     // 여행 일정 내용을 저장하는 상태 변수
//     const [content, setContent] = useState("");

//     // 여행 지역을 저장하는 상태 변수
//     const [location, setLocation] = useState("");

//     // 여행 시작 날짜를 저장하는 상태 변수
//     const [startDate, setStartDate] = useState("");

//     // 여행 종료 날짜를 저장하는 상태 변수
//     const [endDate, setEndDate] = useState("");

//     // ===========================
//     // 등록 버튼 클릭 이벤트
//     // ===========================

//     const handleSubmit = () => {

//         // 입력값 확인
//         // 실제 프로젝트에서는 백엔드로 보내기 전에
//         // 값이 제대로 입력되었는지 확인하는 용도이다.
//         console.log("제목 :", title);
//         console.log("내용 :", content);
//         console.log("여행 지역 :", location);
//         console.log("시작 날짜 :", startDate);
//         console.log("종료 날짜 :", endDate);

//         /*
//         ========================================

//         백엔드 API가 완성되면 아래 코드로 변경 예정

//         createPost({
//             title,
//             content,
//             location,
//             startDate,
//             endDate
//         })

//         ========================================
//         */

//         alert("여행 일정이 등록되었습니다.");
//     };

//     return (

//         // ===========================
//         // 전체 화면
//         // ===========================

//         <div className="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">

//             {/* 화면 제목 */}

//             <h1 className="text-3xl font-bold mb-8">

//                 여행 일정 작성

//             </h1>

//             {/* ===========================
//                 제목 입력
//             =========================== */}

//             <label className="font-semibold">

//                 일정 제목

//             </label>

//             <input

//                 className="w-full border rounded-lg p-3 mt-2 mb-5"

//                 placeholder="여행 일정 제목을 입력하세요."

//                 value={title}

//                 onChange={(e) => setTitle(e.target.value)}

//             />

//             {/* ===========================
//                 여행 지역
//             =========================== */}

//             <label className="font-semibold">

//                 여행 지역

//             </label>

//             <input

//                 className="w-full border rounded-lg p-3 mt-2 mb-5"

//                 placeholder="예) 일본 오사카"

//                 value={location}

//                 onChange={(e)=>setLocation(e.target.value)}

//             />

//             {/* ===========================
//                 여행 시작 날짜
//             =========================== */}

//             <label className="font-semibold">

//                 여행 시작 날짜

//             </label>

//             <input

//                 type="date"

//                 className="w-full border rounded-lg p-3 mt-2 mb-5"

//                 value={startDate}

//                 onChange={(e)=>setStartDate(e.target.value)}

//             />

//             {/* ===========================
//                 여행 종료 날짜
//             =========================== */}

//             <label className="font-semibold">

//                 여행 종료 날짜

//             </label>

//             <input

//                 type="date"

//                 className="w-full border rounded-lg p-3 mt-2 mb-5"

//                 value={endDate}

//                 onChange={(e)=>setEndDate(e.target.value)}

//             />

//             {/* ===========================
//                 여행 일정 내용
//             =========================== */}

//             <label className="font-semibold">

//                 여행 일정

//             </label>

//             <textarea

//                 className="w-full h-72 border rounded-lg p-3 mt-2"

//                 placeholder="여행 일정을 자유롭게 작성해주세요."

//                 value={content}

//                 onChange={(e)=>setContent(e.target.value)}

//             />

//             {/* ===========================
//                 등록 버튼
//             =========================== */}

//             <button

//                 onClick={handleSubmit}

//                 className="mt-8 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"

//             >

//                 일정 등록하기

//             </button>

//         </div>

//     );

// }

// // 다른 파일에서도 사용할 수 있도록 export
// export default WritePost;