import Header from '../components/Header';
import LocationWeather from '../components/LocationWeather';
import StoryList from '../components/StoryList';
import FeedCard from '../components/FeedCard';

export default function FeedPage() {
    return (
        <div className="min-h-screen bg-sky-50">
            <Header />

            {/* 헤더에 가리지 않도록 상단 여백 유지 */}
            <div className="pt-24 pb-6">

                {/* 날씨와 스토리 컴포넌트를 하나로 묶어주는 메인 하얀색 카드 */}
                <div className="max-w-screen-xl mx-auto px-6 py-5 bg-white border-gray-100 space-y-4">
                    <LocationWeather />
                        <StoryList />
                </div>

                {/* 피드 카드 영역 */}
                <div className="max-w-screen-xl mx-auto px-4 pt-6">
                    <FeedCard />
                </div>
            </div>
        </div>
    );
}