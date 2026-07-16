// // 부모 컴포넌트(MyPage)에서 전달받은 post 데이터를 출력하는 컴포넌트
// // props를 통해 게시글 정보를 받아 화면에 표시한다.

// function PostCard({ post }) {

//     // ===========================
//     // 수정 버튼 클릭
//     // ===========================

//     const handleEdit = () => {

//         // 현재는 테스트용 출력
//         // 추후 글 수정 페이지로 이동하도록 변경 예정
//         console.log("수정할 게시글 번호 :", post.id);

//     };

//     // ===========================
//     // 삭제 버튼 클릭
//     // ===========================

//     const handleDelete = () => {

//         // 삭제 여부를 사용자에게 한 번 더 확인
//         const result = window.confirm("정말 삭제하시겠습니까?");

//         // 취소를 누르면 함수 종료
//         if (!result) return;

//         // 추후 백엔드 API 연결 예정
//         console.log("삭제할 게시글 번호 :", post.id);

//     };

//     return (

//         // ===========================
//         // 카드 전체 영역
//         // ===========================

//         <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition">

//             {/* ===========================
//                 여행 제목
//             =========================== */}

//             <h2 className="text-2xl font-bold">

//                 {post.title}

//             </h2>

//             {/* ===========================
//                 여행 지역
//             =========================== */}

//             <p className="text-blue-600 mt-2">

//                 📍 {post.location}

//             </p>

//             {/* ===========================
//                 여행 날짜
//             =========================== */}

//             <p className="text-gray-500 mt-2">

//                 📅 {post.startDate} ~ {post.endDate}

//             </p>

//             {/* ===========================
//                 여행 일정 내용
//             =========================== */}

//             <p className="mt-5 text-gray-700">

//                 {post.content}

//             </p>

//             {/* ===========================
//                 버튼 영역
//             =========================== */}

//             <div className="flex gap-3 mt-6">

//                 {/* 수정 버튼 */}

//                 <button

//                     onClick={handleEdit}

//                     className="bg-yellow-400 hover:bg-yellow-500 text-white px-5 py-2 rounded-lg"

//                 >

//                     수정

//                 </button>

//                 {/* 삭제 버튼 */}

//                 <button

//                     onClick={handleDelete}

//                     className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg"

//                 >

//                     삭제

//                 </button>

//             </div>

//         </div>

//     );

// }

// // 다른 파일에서도 사용할 수 있도록 export
// export default PostCard;