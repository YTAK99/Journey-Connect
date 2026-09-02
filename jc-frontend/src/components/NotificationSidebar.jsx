import { useState } from "react";

export default function NotificationSidebar({ isOpen, onClose }) {
    // 임시 알림 데이터
    const [notifications, setNotifications] = useState([
        { id: 1, title: '크루 가입 요청이 들어왔습니다.', time: '5분전', read: false },
        { id: 2, title: '내 게시글에 좋아요가 눌렸습니다.', time: '10분전', read: true }
    ]);

    if (!isOpen) return null;

    return (
        <>
            {/* 백드롭 (바깥 영역 클릭 시 닫기) */}
            <div onClick={onClose} className="fixed inset-0 z-40" />

            {/*
        종 모양 버튼 바로 아래에 위치하는 드롭다운 박스
        w-96 (너비 넓힘), h-[450px] (높이 길게 늘림)
      */}
            <div className="absolute right-4 top-14 z-50 w-96 h-[450px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

                {/* 헤더 영역 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
                    <h2 className="text-base font-bold text-gray-800 dark:text-slate-100">알림</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer"
                    >
                        &times;
                    </button>
                </div>

                {/* 바디 영역: 높이가 넉넉해져서 스크롤 없이 여러 개가 한눈에 들어옴 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                            새로운 알림이 없습니다.
                        </div>
                    ) : (
                        notifications.map((item) => (
                            <div
                                key={item.id}
                                className={`p-3.5 rounded-xl border transition-colors ${
                                    item.read
                                        ? 'bg-white border-gray-100 dark:bg-slate-800 dark:border-slate-700'
                                        : 'bg-blue-50/50 border-blue-100 dark:bg-slate-800/80 dark:border-slate-700'
                                }`}
                            >
                                <p className="text-sm text-gray-800 dark:text-slate-200 font-medium">{item.title}</p>
                                <span className="text-xs text-gray-400 dark:text-slate-400 mt-1 block">{item.time}</span>
                            </div>
                        ))
                    )}
                </div>

                {/* 푸터 영역 */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50 flex justify-between items-center">
                    <button
                        onClick={() => setNotifications(notifications.map(n => ({ ...n, read: true })))}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                    >
                        모두 읽음으로 표시
                    </button>
                    <span className="text-xs text-gray-400 dark:text-slate-500">{notifications.length}개의 알림</span>
                </div>
            </div>
        </>
    );
}