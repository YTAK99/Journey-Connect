import { useState } from 'react';

export default function CommentSection() {
    // 1. 임시 댓글 목록 상태
    const [comments, setComments] = useState([
        { id: 1, author: "여행러버", text: "성수동 코스 너무 좋아보이네요! 저도 가봐야겠어요.", time: "10분 전" },
        { id: 2, author: "지원", text: "사진 감성 대박... ☕️", time: "방금 전" }
    ]);

    // 2. 사용자가 입력하고 있는 새 댓글 상태
    const [inputText, setInputText] = useState("");

    // 3. 댓글 등록 버튼을 눌렀을 때 실행되는 함수
    const handleAddComment = (e) => {
        e.preventDefault();
        if (!inputText.trim()) return; // 빈 칸이면 등록 안 됨

        const newCommentObj = {
            id: Date.now(), // 고유 ID (임시)
            author: "나 (연수)", // 현재 로그인한 사용자 이름 가정
            text: inputText,
            time: "방금 전"
        };

        // 기존 댓글 배열에 새로운 댓글 추가
        setComments([...comments, newCommentObj]);
        // 입력창 초기화
        setInputText("");
    };

    return (
        <div className="mt-4 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-800 mb-3">
                댓글 <span className="text-teal-600">{comments.length}</span>개
            </h4>

            {/* 댓글 목록 출력 영역 */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start justify-between text-xs bg-slate-50 p-2.5 rounded-xl">
                        <div>
                            <span className="font-bold text-slate-900 mr-2">{comment.author}</span>
                            <span className="text-slate-700">{comment.text}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-2">{comment.time}</span>
                    </div>
                ))}
            </div>

            {/* 댓글 입력 폼 영역 */}
            <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="댓글을 남겨보세요..."
                    className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 bg-white"
                />
                <button
                    type="submit"
                    className="bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-teal-800 transition"
                >
                    등록
                </button>
            </form>
        </div>
    );
}