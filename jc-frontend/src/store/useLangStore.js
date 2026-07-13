import { create } from 'zustand';

/**
 * 글로벌 다국어 설정(Language Switch)을 제어하는 Zustand 전역 스토어
 * 새로고침 시에도 유저가 선택한 언어가 유지되도록 로컬스토리지를 연동합니다.
 */
const useLangStore = create((set) => ({
    // 초기값 설정: 이전에 선택한 언어가 없다면 기본값은 한국어('ko')
    currentLang: localStorage.getItem('lang') || 'ko',

    // 글로벌 언어 변경 액션 함수
    setLang: (lang) => {
        localStorage.setItem('lang', lang); // 사용자가 고른 언어 스토리지에 세이브
        set({ currentLang: lang }); // 상태 변경 트리거 실행
    }
}));

export default useLangStore;