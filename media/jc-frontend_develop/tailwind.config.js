/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // 유저 기획서 [스타일 3] 컬러 명세 데이터 바인딩
                primary: '#00D2D3',     // 활기의 아쿠아 (기본 버튼 및 포인트)
                deepTeal: '#004753',    // 신뢰의 딥 틸 (헤더, 네비게이션, 중요 텍스트)
                skyGray: '#F0F8FF',     // 깨끗한 스카이 그레이 (전체 배경화면 색상)
                coral: '#FF7F50',       // 여행의 코랄 (좋아요, 알림, 트렌딩 태그 마커)
                darkText: '#23303B'     // 가독성을 위한 기본 본문 글자 색상
            },
            fontFamily: {
                // 글로벌 폰트 가독성 설정
                sans: ['Pretendard', 'Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}