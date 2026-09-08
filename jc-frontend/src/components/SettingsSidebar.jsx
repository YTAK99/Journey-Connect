import {Bell, Globe, Moon, X} from "lucide-react";

export default function SettingsSidebar( { open, onClose, darkMode, setDarkMode, alarm, setAlarm, language, setLanguage }) {
{/* 설정 사이드바 */}
    if (!open) return null;

    return (
    <>
        {/* 배경 어둡게 */}
        <div className="fixed insert-0 bg-black/40 z-40" onClick={onClose} />

        {/* 설정 사이드바 본문 */}
        <div className={`fixed top-0 right-0 h-screen w-96 shadow-2xl transition-transform duration-300 z-50 ${darkMode ? "bg-slate-900 text-white" : "bg-card text-text"}`}>
            <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold">설정</h2>
                <button onClick={onClose}>
                    <X />
                </button>
            </div>

            <div className="p-6 space-y-8">
        {/* 언어 설정 */}
        <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
                <Globe />
                언어
            </div>

            <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded-lg px-3 py-2 text-black"
            >
                <option>한국어</option>
                <option>English</option>
                <option>日本語</option>
                <option>中文</option>
            </select>
        </div>
        {/* 다크모드 */}
        <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
                <Moon />
                다크모드
            </div>
            <input
                type="checkbox"
                checked={darkMode}
                onChange={() => setDarkMode(!darkMode)}
            />
        </div>
        {/* 알림설정 */}
        <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
                <Bell />
                알림
            </div>
            <input
                type="checkbox"
                checked={alarm}
                onChange={() => setAlarm(!alarm)}
            />
        </div>
    </div>
</div>
    </>
);
}
