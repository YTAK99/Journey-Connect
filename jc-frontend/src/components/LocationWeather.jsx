import { useState } from 'react';

export default function LocationWeather() {
    // 1. 화면에 보여줄 임시 데이터 상태(State) 정의
    const [locationInfo, setLocationInfo] = useState({
        country: "KR",
        city: "서울",
        time: "11:37",
        temperature: "28°C",
        condition: "구름 조금"
    });

    // 2. 지역 변경 버튼을 눌렀을 때 테스트해 볼 수 있는 임시 함수
    const handleLocationChange = () => {
        //(나중에 모달창이나 검색 기능과 연결할 수 있어요!)
        setLocationInfo({
            country: "KR",
            city: "제주",
            time: "11:37",
            temperature: "26°C",
            condition: "맑음"
        });
    };

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between border-b border-gray-100">
            {/* 왼쪽 영역: 국가/도시, 실시간 시각, 날씨 정보 */}
            <div className="flex items-center space-x-4">
                {/* 지역 이름 */}
                <h2 className="text-lg font-bold text-gray-900">
                    {locationInfo.country} <span className="font-normal text-gray-700">{locationInfo.city}</span>
                </h2>

                {/* 실시간 시각 */}
                <div className="flex items-center text-sm text-gray-500 space-x-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{locationInfo.time}</span>
                </div>

                {/* 날씨 및 온도 */}
                <div className="flex items-center text-sm text-gray-600 space-x-1">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <span className="font-medium text-gray-800">{locationInfo.temperature}</span>
                    <span className="text-gray-500">{locationInfo.condition}</span>
                </div>
            </div>

            {/* 오른쪽 영역: 지역 변경 버튼 */}
            <button
                type="button"
                onClick={handleLocationChange}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-colors"
            >
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>다른지역으로 이동할까요?</span>
            </button>
        </div>
    );
}