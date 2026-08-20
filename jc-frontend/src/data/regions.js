import { Coffee, Landmark, Mountain, Navigation, ShoppingBag, Star, Utensils, Waves } from "lucide-react";

// 화면 기본 선택지입니다. 백엔드 regionCode와 맞추기 위해 id를 안정적인 지역 코드로 사용합니다.
export const REGIONS = [
  {
    id: "seoul",
    code: "KR-SEOUL",
    label: { ko: "서울", en: "Seoul" },
    country: "KR",
    icon: Navigation,
    timezone: "Asia/Seoul",
    weather: { temp: 28, conditionKo: "구름 조금", conditionEn: "Partly cloudy" },
    flightTime: { ko: "서울 기준", en: "From Seoul" },
  },
  {
    id: "busan",
    code: "KR-BUSAN",
    label: { ko: "부산", en: "Busan" },
    country: "KR",
    icon: Waves,
    timezone: "Asia/Seoul",
    weather: { temp: 31, conditionKo: "맑음", conditionEn: "Sunny" },
    flightTime: { ko: "약 1시간", en: "About 1h" },
  },
  {
    id: "jeju",
    code: "KR-JEJU",
    label: { ko: "제주", en: "Jeju" },
    country: "KR",
    icon: Mountain,
    timezone: "Asia/Seoul",
    weather: { temp: 27, conditionKo: "구름", conditionEn: "Cloudy" },
    flightTime: { ko: "약 1시간 10분", en: "About 1h 10m" },
  },
  {
    id: "gangneung",
    code: "KR-GANGNEUNG",
    label: { ko: "강릉", en: "Gangneung" },
    country: "KR",
    icon: Coffee,
    timezone: "Asia/Seoul",
    weather: { temp: 25, conditionKo: "맑음", conditionEn: "Clear" },
    flightTime: { ko: "육로 추천", en: "Ground route" },
  },
  {
    id: "tokyo",
    code: "JP-TOKYO",
    label: { ko: "도쿄", en: "Tokyo" },
    country: "JP",
    icon: Landmark,
    timezone: "Asia/Tokyo",
    weather: { temp: 33, conditionKo: "맑고 더움", conditionEn: "Hot & sunny" },
    flightTime: { ko: "약 2시간 20분", en: "About 2h 20m" },
  },
  {
    id: "osaka",
    code: "JP-OSAKA",
    label: { ko: "오사카", en: "Osaka" },
    country: "JP",
    icon: Utensils,
    timezone: "Asia/Tokyo",
    weather: { temp: 34, conditionKo: "무더움", conditionEn: "Very hot" },
    flightTime: { ko: "약 1시간 50분", en: "About 1h 50m" },
  },
  {
    id: "paris",
    code: "FR-PARIS",
    label: { ko: "파리", en: "Paris" },
    country: "FR",
    icon: Star,
    timezone: "Europe/Paris",
    weather: { temp: 22, conditionKo: "흐림", conditionEn: "Overcast" },
    flightTime: { ko: "약 14시간", en: "About 14h" },
  },
  {
    id: "newyork",
    code: "US-NEW-YORK",
    label: { ko: "뉴욕", en: "New York" },
    country: "US",
    icon: ShoppingBag,
    timezone: "America/New_York",
    weather: { temp: 26, conditionKo: "맑음", conditionEn: "Clear" },
    flightTime: { ko: "약 14시간", en: "About 14h" },
  },
  {
    id: "bali",
    code: "ID-BALI",
    label: { ko: "발리", en: "Bali" },
    country: "ID",
    icon: Waves,
    timezone: "Asia/Makassar",
    weather: { temp: 30, conditionKo: "열대 날씨", conditionEn: "Tropical" },
    flightTime: { ko: "약 7시간", en: "About 7h" },
  },
];

export const getLocalTime = (timezone) => {
  // 브라우저 위치와 무관하게 선택 지역의 IANA 타임존 기준 시각을 계산합니다.
  try {
    return new Date().toLocaleTimeString("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--";
  }
};
