//App.jsx원본코드

import { useEffect, useState } from 'react'
import { Compass, Globe, Server, CheckCircle2, AlertCircle } from 'lucide-react'

// 유저가 지정한 정확한 폴더 구조 경로 반영 (중요 ⚡)
import apiClient from '../services/apiClient'
import useLangStore from '../store/useLangStore'

export default function BackendTestPage() {
    // Zustand 전역 언어 상태 가져오기
    const { currentLang, setLang } = useLangStore()

    // 백엔드 응답 데이터를 저장할 로컬 상태
    const [apiData, setApiData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false)

    // 백엔드로부터 데이터를 받아오는 핵심 함수
    const fetchBackendData = async (lang) => {
        setLoading(true)
        setError(false)
        try {
            // apiClient 사용 -> /api/v1/test/welcome?lang=ko 형태로 요청 전송
            const response = await apiClient.get(`/test/welcome`, {
                params: { lang: lang }
            })
            setApiData(response.data) // 백엔드가 준 Map 데이터를 상태에 저장
        } catch (err) {
            console.error('백엔드 연동 실패 ㅠㅠ :', err)
            setError(true)
        } finally {
            setLoading(false)
        }
    }

    // 컴포넌트가 켜질 때, 혹은 유저가 언어를 바꿀 때마다 백엔드 호출
    useEffect(() => {
        let active = true

        const loadBackendData = async () => {
            await Promise.resolve()

            if (!active) return

            setLoading(true)
            setError(false)

            try {
                const response = await apiClient.get(`/test/welcome`, {
                    params: { lang: currentLang }
                })

                if (active) {
                    setApiData(response.data)
                }
            } catch (err) {
                console.error('백엔드 연동 실패 ㅠㅠ :', err)
                if (active) {
                    setError(true)
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        }

        loadBackendData()

        return () => {
            active = false
        }
    }, [currentLang])

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F0F8FF]">
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl">

                {/* 헤더 영역 */}
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <Compass className="text-[#00D2D3] w-6 h-6 animate-spin-slow" />
                        <span className="font-bold text-lg text-[#004753]">Journey Connect</span>
                    </div>

                    {/* 다국어 전역 상태 토글 버튼 (Zustand 테스트) */}
                    <button
                        onClick={() => setLang(currentLang === 'ko' ? 'en' : 'ko')}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#004753] bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{currentLang === 'ko' ? 'English로 변경' : '한국어로 변경'}</span>
                    </button>
                </div>

                {/* 메인 연동 카드 영역 */}
                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2 text-[#004753] font-bold text-xl">
                        <Server className="w-5 h-5" />
                        <h2>백엔드 연동 상태 체크</h2>
                    </div>

                    {/* 1. 로딩 중일 때 */}
                    {loading && (
                        <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-500 animate-pulse">
                            백엔드 서버에 신호 보내는 중... 📡
                        </div>
                    )}

                    {/* 2. 에러 발생 시 (백엔드가 꺼져있거나 통신 실패) */}
                    {!loading && error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2.5 text-red-700">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                            <div className="text-sm">
                                <p className="font-bold">연동 실패 (Connection Refused)</p>
                                <p className="text-xs text-red-500 mt-1">스프링 부트 서버가 켜져 있는지, 혹은 WebConfig의 CORS 허용 포트가 정확한지 확인해 주세요.</p>
                            </div>
                        </div>
                    )}

                    {/* 3. 연동 성공 시 (백엔드 데이터 출력) */}
                    {!loading && !error && apiData && (
                        <div className="space-y-3">
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-800">
                                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                                <div className="text-sm">
                                    <p className="font-bold text-emerald-900">API 통신 정상 안정화 완료</p>
                                    <p className="mt-1 text-slate-700 font-medium">{apiData.message}</p>
                                </div>
                            </div>

                            {/* 백엔드가 보내준 시스템 정보 상세 매핑 */}
                            <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-1.5 text-slate-600 font-mono">
                                <div><span className="font-bold text-slate-400">⚡ Status:</span> {apiData.status}</div>
                                <div><span className="font-bold text-slate-400">📅 ServerTime:</span> {apiData.serverTime}</div>
                                <div><span className="font-bold text-slate-400">🌐 Current Store Lang:</span> {currentLang}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 하단 제어 버튼 피드백 */}
                <button
                    onClick={() => fetchBackendData(currentLang)}
                    className="w-full py-3 px-4 font-bold text-white bg-[#00D2D3] hover:bg-[#00b8b9] rounded-xl transition-all duration-200 shadow-md shadow-cyan-100 text-sm"
                >
                    데이터 수동 새로고침 (API 재요청)
                </button>
            </div>
        </div>
    );
}




// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
// import './App.css'
//
// function App() {
//   const [count, setCount] = useState(0)
//
//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>
//
//       <div className="ticks"></div>
//
//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>
//
//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }
//
// export default App
