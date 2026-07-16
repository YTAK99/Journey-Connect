// // 부모 컴포넌트에서 사용할 PostCard 컴포넌트를 import
// // PostCard는 게시글 하나를 화면에 출력하는 역할을 한다.
// import PostCard from "../components/PostCard";

// // React에서 상태를 관리하기 위한 Hook
// import { useState } from "react";

// function MyPage() {

//     // ===========================
//     // 게시글 목록(State)
//     // ===========================
//     // 현재는 테스트 데이터를 사용한다.
//     // 추후에는 백엔드 API를 통해 실제 데이터를 받아와 저장할 예정이다.

//     const [posts] = useState([

//         {
//             id: 1,
//             title: "일본 오사카 3박 4일",
//             location: "일본 오사카",
//             startDate: "2026-07-20",
//             endDate: "2026-07-23",
//             content: "도톤보리 → 유니버설 → 교토 당일치기"
//         },

//         {
//             id: 2,
//             title: "부산 여행",
//             location: "대한민국 부산",
//             startDate: "2026-08-10",
//             endDate: "2026-08-12",
//             content: "광안리 → 해운대 → 감천문화마을"
//         },

//         {
//             id: 3,
//             title: "제주도 힐링 여행",
//             location: "대한민국 제주도",
//             startDate: "2026-09-01",
//             endDate: "2026-09-04",
//             content: "성산일출봉 → 우도 → 협재해수욕장"
//         }

//     ]);

//     return (

//         // ===========================
//         // 전체 페이지
//         // ===========================

//         <div className="max-w-6xl mx-auto mt-10 mb-10">

//             {/* ===========================
//                 마이페이지 제목
//             =========================== */}

//             <h1 className="text-4xl font-bold mb-2">

//                 마이페이지

//             </h1>

//             {/* 사용자 안내 문구 */}

//             <p className="text-gray-500 mb-8">

//                 내가 작성한 여행 일정을 확인하고 수정 또는 삭제할 수 있습니다.

//             </p>

//             {/* ===========================
//                 사용자 정보 카드
//             =========================== */}

//             <div className="bg-white rounded-xl shadow-md p-6 mb-8">

//                 {/* 사용자 이름 */}
//                 <h2 className="text-2xl font-bold">

//                     👤 홍길동

//                 </h2>

//                 {/* 이메일 */}
//                 <p className="text-gray-500 mt-2">

//                     hong@example.com

//                 </p>

//                 {/* 작성한 게시글 개수 */}
//                 <p className="mt-4">

//                     작성한 여행 일정

//                     <span className="font-bold text-blue-600">

//                         {" "} {posts.length}개

//                     </span>

//                 </p>

//             </div>

//             {/* ===========================
//                 게시글 목록
//             =========================== */}

//             <div className="space-y-5">

//                 {/*

//                 map()

//                 배열 안에 있는 데이터를 하나씩 꺼내서
//                 화면에 출력할 때 사용하는 함수이다.

//                 posts 배열에 게시글이 3개 있으면
//                 PostCard도 3개가 생성된다.

//                 */}

//                 {

//                     posts.map((post) => (

//                         <PostCard

//                             // React가 각 컴포넌트를 구분하기 위한 값
//                             key={post.id}

//                             // PostCard에게 게시글 정보를 전달
//                             post={post}

//                         />

//                     ))

//                 }

//             </div>

//         </div>

//     );

// }

// // 다른 파일에서 사용할 수 있도록 export
// export default MyPage;