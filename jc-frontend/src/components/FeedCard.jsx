export default function FeedCard() {
    return (
        <div className="w-full max-w-full md:max-w-lg mx-auto bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            {/* Profile Header */}
            <div className="pt-5 pb-3 px-5">
                <div className="flex items-center gap-3">
                    <img
                        src="/user_1.jpg"
                        alt="사용자 프로필"
                        className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                        <h3 className="text-base font-semibold text-gray-900 leading-5">
                            나멋짐
                        </h3>
                        <p className="text-sm text-gray-500 leading-5">궁남지</p>
                    </div>
                </div>
            </div>

            {/* 메인 이미지 */}
            <div className="w-full h-64 overflow-hidden px-5">
                <img
                    src="/ex_1.jpg"
                    alt="예시이미지1"
                    className="w-full h-full object-cover rounded-lg"
                />
            </div>

            {/* 좋아요, 댓글, 북마크 */}
            <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-4">
                    {/* 하트 */}
                    <button className="text-gray-700 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>
                    </button>
                    {/* 말풍선 */}
                    <button className="text-gray-700 hover:text-blue-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.481.22 1.015.337 1.555.337z" /></svg>
                    </button>
                </div>
                {/* 북마크*/}
                <button className="text-gray-700 hover:text-yellow-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" /></svg>
                </button>
            </div>

            {/* 좋아요 수 및 해시태그 영역 */}
            <div className="px-5 pt-2">
                <p className="text-sm font-semibold text-gray-900">좋아요 914개</p>

                {/* 해시태그 목록 */}
                <div className="flex gap-2 mt-2 text-xs font-medium text-blue-600">
                    <span>#서동공원</span>
                    <span>#맛집</span>
                    <span>#포토존</span>
                </div>
            </div>

            {/* 글 */}
            <div className="p-7">
                <h4 className="text-lg font-bold text-gray-900 leading-6">
                    끝내주는 하늘
                </h4>
                <p className="mt-3 text-sm text-gray-600 leading-6">
                    내용이 들어가요
                    어쩌구 저쩌구
                </p>

            </div>
        </div>
    );
}