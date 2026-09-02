import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send, Plus, Image as ImageIcon, Smile } from "lucide-react";

export default function CrewChatPage() {
    const navigate = useNavigate();
    const { id } = useParams(); // 크루 ID

    // 임시 메시지 상태 (나중에 소켓이나 백엔드 데이터로 대체)
    const [messages, setMessages] = useState([
        { id: 1, sender: "매니저", text: "안녕하세요! 성수동 투어 크루 오픈채팅방입니다.", time: "오후 3:30", isMe: false },
        { id: 2, sender: "김여행", text: "반가워요 다들 어떤 코스로 가시나요?", time: "오후 3:32", isMe: false },
        { id: 3, sender: "나", text: "안녕하세요! 빈티지샵 위주로 돌면 좋을 것 같아요.", time: "오후 3:33", isMe: true },
    ]);
    const [inputMessage, setInputMessage] = useState("");

    const handleSend = (e) => {
        e.preventDefault();
        if (!inputMessage.trim()) return;

        const newMessage = {
            id: Date.now(),
            sender: "나",
            text: inputMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: true,
        };

        setMessages([...messages, newMessage]);
        setInputMessage("");
    };

    return (
        <div className="flex h-screen flex-col bg-[#b2c7d9]">
            {/* 1. 카카오톡 스타일 상단 헤더 */}
            <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-gray-700 hover:text-black">
                        <ArrowLeft size={22} />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-gray-800">7월 서울 성수동 빈티지 투어 크루</h1>
                        <span className="text-xs text-gray-400">참여자 4명</span>
                    </div>
                </div>
            </header>

            {/* 2. 채팅 메시지 리스트 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* 날짜 구분선 */}
                <div className="flex justify-center">
          <span className="rounded-full bg-black/10 px-3 py-1 text-xs text-white">
            2026년 9월 1일 화요일
          </span>
                </div>

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}
                    >
                        {/* 상대방 프로필 아바타 */}
                        {!msg.isMe && (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-gray-700 shadow-sm">
                                {msg.sender[0]}
                            </div>
                        )}

                        <div className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}>
                            {/* 보낸 사람 이름 (상대방일 때만 표시) */}
                            {!msg.isMe && <span className="mb-1 text-xs text-gray-600">{msg.sender}</span>}

                            <div className={`flex items-end gap-1.5 ${msg.isMe ? "flex-row-reverse" : "flex-row"}`}>
                                {/* 말풍선 본문 */}
                                <div
                                    className={`max-w-xs rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed ${
                                        msg.isMe
                                            ? "bg-[#fee500] text-gray-900 rounded-tr-none" // 카카오톡 노란색
                                            : "bg-white text-gray-900 rounded-tl-none"     // 상대방 흰색
                                    }`}
                                >
                                    {msg.text}
                                </div>
                                {/* 전송 시간 */}
                                <span className="text-[10px] text-gray-500 whitespace-nowrap">{msg.time}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3. 하단 입력창 영역 */}
            <form onSubmit={handleSend} className="flex items-center gap-2 bg-[#f7f7f7] px-4 py-3 border-t border-gray-200">
                <button type="button" className="text-gray-500 hover:text-gray-700">
                    <Plus size={24} />
                </button>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="메시지를 입력하세요..."
                    className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm outline-none border border-gray-200 focus:border-[#fee500]"
                />
                <button
                    type="submit"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fee500] text-gray-900 shadow-sm hover:bg-[#fdd800] transition-colors"
                >
                    <Send size={18} />
                </button>
            </form>
        </div>
    );
}