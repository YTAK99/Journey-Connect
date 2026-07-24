export default function StoryList() {
    // 스토리 데이터 예시 (필요에 따라 수정 가능)
    const stories = [
        { id: 1, name: '서울', image: 'https://images.unsplash.com/photo-1538485399068-15442875b141' },
        { id: 2, name: '제주', image: 'https://images.unsplash.com/photo-1578637387939-43c5255f0857' },
        { id: 3, name: '도코', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26' },
        { id: 4, name: '부산', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb' },
        { id: 5, name: '파리', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34' },
        { id: 6, name: '발리', image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4' },
        { id: 7, name: '오사카', image: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b' },
    ];

    return (
        <div className="w-full py-2">
            <div className="flex items-center space-x-6 overflow-x-auto scrollbar-hide py-2">

                {/* 1. 스토리 올리기 버튼 */}
                <div className="flex flex-col items-center cursor-pointer flex-shrink-0 group">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-teal-400 flex items-center justify-center bg-teal-50 group-hover:bg-teal-100 transition">
                        <span className="text-teal-500 text-2xl font-light">+</span>
                    </div>
                    <span className="text-xs text-gray-600 mt-2">올리기</span>
                </div>

                {/* 2. 각 지역별 스토리 목록 */}
                {stories.map((story) => (
                    <div key={story.id} className="flex flex-col items-center cursor-pointer flex-shrink-0 group">
                        <div className="w-16 h-16 rounded-full p-0.5 border-2 border-teal-500 overflow-hidden">
                            <img
                                src={story.image}
                                alt={story.name}
                                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition duration-300"
                            />
                        </div>
                        <span className="text-xs text-gray-700 mt-2">{story.name}</span>
                    </div>
                ))}

            </div>
        </div>
    );
}