// React Router에서 페이지 이동을 위해 Link를 import
// Link를 사용하면 새로고침 없이 다른 페이지로 이동할 수 있다.
import { Link } from "react-router-dom";

function Complete() {

    return (

        // ===========================
        // 전체 화면
        // ===========================
        <div className="h-screen flex justify-center items-center bg-gray-100">

            {/* 완료 메시지 박스 */}
            <div className="bg-white shadow-xl rounded-xl p-10 text-center w-[500px]">

                {/* 성공 아이콘 */}
                <div className="text-6xl mb-5">
                    🎉
                </div>

                {/* 제목 */}
                <h1 className="text-3xl font-bold mb-4">
                    일정이 성공적으로 등록되었습니다.
                </h1>

                {/* 안내 문구 */}
                <p className="text-gray-500 mb-8">
                    작성한 여행 일정은 다른 사용자들과 공유됩니다.
                </p>

                {/* 마이페이지 이동 버튼 */}
                <Link
                    to="/mypage"
                    className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                    내 일정 보러가기
                </Link>

            </div>

        </div>

    );
}

// 다른 파일에서도 사용할 수 있도록 export
export default Complete;