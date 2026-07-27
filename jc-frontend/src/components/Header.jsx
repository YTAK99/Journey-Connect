import { useState } from 'react';
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react';
import SettingsSidebar from './settingsSidebar';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); //사이드바(설정) 열림/닫힘

    return (
        <nav className="bg-white fixed w-full z-20 top-0 start-0 border-b border-gray-200">
            <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">

                {/* 로고 영역 */}
                <span className="self-center text-xl font-semibold whitespace-nowrap">JC</span>

                {/* 오른쪽 버튼 영역 (사용자 메뉴 + 햄버거 버튼) - 맨 오른쪽 유지 (md:order-3) */}
                <div className="flex items-center md:order-3 space-x-3">
                    <Link to="/mypage"
                          className="flex text-sm bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 overflow-hidden">
                        <img className="w-8 h-8 rounded-full" src="user_1.jpg" alt="사용자 프로필" />
                    </Link>
                    {/*사이드바 (설정)버튼*/}
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-gray-600 rounded-lg hover:bg-gray-100 transition flex items-center justify-center"
                        title="설정">
                        <Settings size={22}/>
                    </button>

                    {/* 모바일용 햄버거 버튼 */}
                    <button
                        type="button"
                        className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14"/>
                        </svg>
                    </button>
                </div>

                {/* 네비게이션 링크 (피드/탐색/크루) */}
                <div className={`${isMenuOpen ? 'block' : 'hidden'} w-full md:flex md:w-auto md:order-1`}>
                    {/* 모바일 검색바 */}
                    <div className="md:hidden mt-3 mb-4">
                        <input type="text" className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50" placeholder="Search..." />
                    </div>

                    <ul className="flex flex-col p-4 md:p-0 mt-4 font-medium border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 md:mt-0 md:border-0 md:bg-white">
                        <li><Link to="/feedpage" className="block py-2 px-3 text-gray9-00 rounded hover:bg-gray-100 md:hover:bg-transparent md:p-0" onClick={() => setIsMenuOpen(false)}>피드</Link></li>
                        <li><Link to="/searchpage" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:p-0" onClick={() => setIsMenuOpen(false)}>탐색</Link></li>
                        <li><Link to="/crewpage" className="block py-2 px-3 text-gray-900 rounded hover:bg-gray-100 md:hover:bg-transparent md:p-0" onClick={() => setIsMenuOpen(false)}>크루</Link></li>
                    </ul>
                </div>

                {/* 데스크탑용 검색바 - 네비게이션 다음, 사용자 이미지 이전으로 이동 */}
                <div className="hidden md:block md:w-1/3 md:order-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeWidth="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"/>
                            </svg>
                        </div>
                        <input type="text" className="block w-full ps-10 p-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500" placeholder="Search..." />
                    </div>
                </div>

            </div>
            <SettingsSidebar
                open={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onclose={() => setIsSidebarOpen(false)}
            />
        </nav>
    );
}