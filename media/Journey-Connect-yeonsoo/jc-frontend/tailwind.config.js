/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#14B8A6',
                primaryHover: '#0F766E',
                background: '#F3FAF8',
                card: '#FFFFFF',
                title: '#064E4F',
                text: '#1F2937',
                muted: '#6B7280',
            },
            fontFamily: {
                // 글로벌 폰트 가독성 설정
                sans: ['Pretendard', 'Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}