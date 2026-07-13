import HomeSearchBar from '../components/HomeSearchBar';
import { Link } from "react-router-dom";

function Home() {
    return (
        <div className="w-screen h-screen bg-[url('/home_img_1.png')] bg-cover bg-center bg-no-repeat relative">
            {/* 어두운 오버레이 (선택사항: 배경이 밝아서 텍스트가 안 보일 때 쓰면 글씨가 확 살아납니다) */}
            <div className="absolute inset-0 bg-black/30"></div>

            {/* 컨텐츠 영역: 왼쪽 정렬을 위해 items-start와 패딩 적용 */}
            <div className="relative z-10 flex flex-col items-start justify-center min-h-screen px-12 md:px-24">

                {/* 1. 대표 문구 */}
                <div className="mb-8">
                    {/*<p className="text-sm md:text-base text-gray-200 font-medium mb-2 tracking-wide">*/}
                    {/*    */}
                    {/*</p>*/}
                    <h1 className="text-4xl md:text-4xl font-extrabold text-white leading-tight drop-shadow-lg">
                        여행 정보 공유 사이트<br />
                        JC
                    </h1>
                </div>

                {/* 2. 검색창 (문구와 버튼 사이) */}
                <div className="w-full max-w-md mb-8">
                    <HomeSearchBar />
                </div>

                {/* 3. 시작하러 가기 버튼 */}
                <Link
                    to="/login"
                    className="px-8 py-4 text-base md:text-lg font-bold text-white bg-blue-600 rounded-xl shadow-xl hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300">
                    click me
                </Link>
            </div>
        </div>
    );
}

export default Home;